import { useState, type FormEvent } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Clapperboard,
  Film,
  Grid3X3,
  MapPin,
  Plus,
  Settings2,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { admin } from "../lib/api";
import { currency, dateLabel, timeLabel } from "../lib/utils";
import type {
  CreateMovie,
  CreateTheater,
  CreateShow,
  CreateSeat,
  Discount,
} from "../lib/types";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import {
  Empty,
  ErrorNotice,
  Loading,
  Spinner,
  Status,
} from "../components/common";
type Row = Record<string, unknown>;
const sections = [
  ["overview", "Overview", Grid3X3],
  ["movies", "Movies", Film],
  ["cities", "Cities", MapPin],
  ["theaters", "Theaters", Building2],
  ["screens", "Screens", Clapperboard],
  ["seats", "Seat layouts", Grid3X3],
  ["shows", "Shows", Clapperboard],
  ["discounts", "Discount codes", Tag],
  ["policies", "Refund policies", ShieldCheck],
  ["team", "Team access", Users],
] as const;
type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { id: string | number; name: string }[];
  optional?: boolean;
  min?: number;
  max?: number;
  step?: string;
};
function FieldInput({ field }: { field: Field }) {
  return (
    <label>
      {field.label}
      {field.optional && <small className="muted"> · optional</small>}
      {field.options ? (
        <select name={field.name} required={!field.optional}>
          <option value="">Choose {field.label.toLowerCase()}</option>
          {field.options.map((o) => (
            <option value={o.id} key={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          name={field.name}
          required={!field.optional}
          rows={3}
          maxLength={2000}
        />
      ) : (
        <input
          name={field.name}
          type={field.type || "text"}
          required={!field.optional}
          min={field.min}
          max={field.max}
          step={field.step}
          maxLength={
            field.type === "email" ? 254 : field.name === "code" ? 50 : 255
          }
        />
      )}
    </label>
  );
}
export function Admin() {
  const part = useLocation().pathname.split("/")[2] || "overview";
  return (
    <div className="admin-layout container">
      <aside className="admin-sidebar">
        <p className="eyebrow">FRAME STUDIO</p>
        <h3>Behind the screen.</h3>
        <nav>
          {sections.map(([key, label, Icon]) => (
            <NavLink
              end
              key={key}
              to={key === "overview" ? "/admin" : "/admin/" + key}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-note">
          <ShieldCheck size={18} />
          <p>
            Administrator workspace
            <br />
            <span>Every detail sets the scene.</span>
          </p>
        </div>
      </aside>
      <section className="admin-content">
        <AdminSection key={part} part={part} />
      </section>
    </div>
  );
}
function AdminSection({ part }: { part: string }) {
  const cache = useQueryClient(),
    [open, setOpen] = useState(false),
    [parent, setParent] = useState(""),
    [filter, setFilter] = useState(""),
    [mode, setMode] = useState("title"),
    [detail, setDetail] = useState<Row | null>(null),
    [layoutRows, setLayoutRows] = useState(6),
    [layoutCols, setLayoutCols] = useState(12),
    [premiumRows, setPremiumRows] = useState(2),
    [detailError, setDetailError] = useState<unknown>(null),
    [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const cities = useQuery({
      queryKey: ["admin", "cities"],
      queryFn: admin.cities,
    }),
    movies = useQuery({ queryKey: ["admin", "movies"], queryFn: admin.movies }),
    theaters = useQuery({
      queryKey: ["admin", "theaters"],
      queryFn: admin.theaters,
    }),
    screens = useQuery({
      queryKey: ["admin", "screens"],
      queryFn: admin.screens,
    });
  const data = useQuery({
    queryKey: ["admin", part, "list", parent, filter, mode, start, end],
    enabled:
      part !== "overview" &&
      part !== "team" &&
      (!(part === "seats" || part === "shows") || !!parent),
    queryFn: async (): Promise<Row[]> => {
      let result: unknown = [];
      switch (part) {
        case "movies":
          result = filter
            ? mode === "language"
              ? await admin.moviesByLanguage(filter)
              : mode === "genre"
                ? await admin.moviesByGenre(filter)
                : await admin.searchMovies(filter)
            : await admin.movies();
          break;
        case "cities":
          result = await admin.cities();
          break;
        case "theaters":
          result = parent
            ? await admin.theatersByCity(Number(parent))
            : filter
              ? await admin.searchTheaters(filter)
              : await admin.theaters();
          break;
        case "screens":
          result = parent
            ? await admin.screensByTheater(Number(parent))
            : await admin.screens();
          break;
        case "seats":
          result = await admin.seatsByScreen(Number(parent));
          break;
        case "shows":
          result =
            mode === "screen"
              ? await admin.showsByScreen(Number(parent))
              : start && end
                ? await admin.showsInRange(Number(parent), start, end)
                : await admin.showsByMovie(Number(parent));
          break;
        case "discounts":
          result = await admin.discounts();
          break;
        case "policies":
          result = await admin.policies();
          break;
      }
      return result as Row[];
    },
  });
  const create = useMutation({
    mutationFn: async (f: FormData) => {
      const b = Object.fromEntries(f.entries()) as Record<string, unknown>;
      for (const key of [
        "cityId",
        "theaterId",
        "screenId",
        "movieId",
        "durationMinutes",
        "regularBasePrice",
        "premiumBasePrice",
        "discountValue",
        "minimumOrderAmount",
        "maximumDiscountAmount",
        "hoursBeforeShow",
        "refundPercentage",
      ])
        if (key in b) b[key] = b[key] === "" ? null : Number(b[key]);
      for (const key of [
        "landmark",
        "postalCode",
        "minimumOrderAmount",
        "maximumDiscountAmount",
      ])
        if (b[key] === "") b[key] = null;
      switch (part) {
        case "cities":
          return admin.createCity(String(b.name));
        case "movies":
          return admin.createMovie(b as unknown as CreateMovie);
        case "theaters":
          return admin.createTheater(b as unknown as CreateTheater);
        case "screens":
          return admin.createScreen(String(b.name), Number(b.theaterId));
        case "shows":
          return admin.createShow(b as unknown as CreateShow);
        case "discounts":
          return admin.createDiscount(
            b as unknown as Omit<Discount, "id" | "active">,
          );
        case "policies":
          return admin.createPolicy(
            Number(b.hoursBeforeShow),
            Number(b.refundPercentage),
          );
        case "team":
          return admin.makeAdmin(String(b.email));
        case "seats": {
          const seats: CreateSeat[] = Array.from(
            { length: layoutRows },
            (_, r) =>
              Array.from({ length: layoutCols }, (_, i) => ({
                rowLabel: String.fromCharCode(65 + r),
                seatNumber: i + 1,
                seatType:
                  r >= layoutRows - premiumRows
                    ? ("PREMIUM" as const)
                    : ("REGULAR" as const),
              })),
          ).flat();
          return admin.createLayout(Number(b.screenId), seats);
        }
      }
    },
    onSuccess: () => {
      toast.success(
        part === "team" ? "Administrator access granted" : "Saved successfully",
      );
      setOpen(false);
      cache.invalidateQueries({ queryKey: ["admin"] });
      cache.invalidateQueries({ queryKey: ["movies"] });
    },
  });
  const toggle = useMutation({
    mutationFn: async (r: Row): Promise<unknown> =>
      part === "discounts"
        ? admin.setDiscountActive(Number(r.id), !r.active)
        : admin.setPolicyActive(Number(r.id), !r.active),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["admin", part] }),
  });
  async function inspect(r: Row) {
    setDetailError(null);
    try {
      const id = Number(r.id);
      const result =
        part === "movies"
          ? await admin.movie(id)
          : part === "cities"
            ? await admin.city(id)
            : part === "theaters"
              ? await admin.theater(id)
              : part === "screens"
                ? await admin.screen(id)
                : part === "seats"
                  ? await admin.seat(id)
                  : part === "shows"
                    ? await admin.show(id)
                    : r;
      setDetail(result as unknown as Row);
    } catch (e) {
      setDetailError(e);
    }
  }
  const opts = (
    items: { id: number; name?: string; title?: string }[] | undefined,
  ) =>
    items?.map((i) => ({
      id: i.id,
      name: i.name || i.title || String(i.id),
    })) || [];
  const fields: Record<string, Field[]> = {
    cities: [{ name: "name", label: "City name" }],
    movies: [
      { name: "title", label: "Movie title" },
      {
        name: "description",
        label: "Synopsis",
        type: "textarea",
        optional: true,
      },
      {
        name: "durationMinutes",
        label: "Duration in minutes",
        type: "number",
        min: 1,
        max: 1440,
      },
      { name: "language", label: "Language" },
      { name: "genre", label: "Genre" },
    ],
    theaters: [
      { name: "name", label: "Theater name" },
      { name: "address", label: "Street address" },
      { name: "landmark", label: "Landmark", optional: true },
      { name: "postalCode", label: "Postal code", optional: true },
      { name: "cityId", label: "City", options: opts(cities.data) },
    ],
    screens: [
      { name: "name", label: "Screen name" },
      { name: "theaterId", label: "Theater", options: opts(theaters.data) },
    ],
    seats: [{ name: "screenId", label: "Screen", options: opts(screens.data) }],
    shows: [
      { name: "movieId", label: "Movie", options: opts(movies.data) },
      { name: "screenId", label: "Screen", options: opts(screens.data) },
      {
        name: "startTime",
        label: "Show starts (cinema local time)",
        type: "datetime-local",
      },
      {
        name: "regularBasePrice",
        label: "Regular price",
        type: "number",
        min: 0.01,
        step: "0.01",
      },
      {
        name: "premiumBasePrice",
        label: "Premium price",
        type: "number",
        min: 0.01,
        step: "0.01",
      },
    ],
    discounts: [
      { name: "code", label: "Discount code" },
      {
        name: "discountType",
        label: "Discount type",
        options: [
          { id: "FLAT", name: "Flat amount" },
          { id: "PERCENTAGE", name: "Percentage" },
        ],
      },
      {
        name: "discountValue",
        label: "Discount value",
        type: "number",
        min: 0.01,
        step: "0.01",
      },
      {
        name: "minimumOrderAmount",
        label: "Minimum order amount",
        type: "number",
        min: 0,
        step: "0.01",
        optional: true,
      },
      {
        name: "maximumDiscountAmount",
        label: "Maximum discount amount",
        type: "number",
        min: 0,
        step: "0.01",
        optional: true,
      },
      {
        name: "validFrom",
        label: "Valid from (cinema local time)",
        type: "datetime-local",
      },
      {
        name: "validUntil",
        label: "Valid until (cinema local time)",
        type: "datetime-local",
      },
    ],
    policies: [
      {
        name: "hoursBeforeShow",
        label: "Minimum hours before show",
        type: "number",
        min: 0,
      },
      {
        name: "refundPercentage",
        label: "Refund percentage",
        type: "number",
        min: 0,
        max: 100,
        step: "0.01",
      },
    ],
    team: [{ name: "email", label: "Existing user email", type: "email" }],
  };
  const label = sections.find((s) => s[0] === part)?.[1] || "Overview";
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    create.mutate(new FormData(e.currentTarget));
  }
  if (part === "overview")
    return (
      <>
        <p className="eyebrow">THE DIRECTOR’S CHAIR</p>
        <h1>
          Set the <em>scene.</em>
        </h1>
        <p className="muted">
          Your cinema, thoughtfully organised. Start with your catalog, then
          bring the show to life.
        </p>
        {[cities, movies, theaters, screens].some((q) => q.isError) && (
          <ErrorNotice
            error={
              [cities, movies, theaters, screens].find((q) => q.isError)?.error
            }
          />
        )}
        <div className="stats-grid">
          {[
            ["Movies", movies.data?.length],
            ["Cities", cities.data?.length],
            ["Theaters", theaters.data?.length],
            ["Screens", screens.data?.length],
          ].map(([name, count]) => (
            <div className="panel stat" key={name}>
              <span>{name}</span>
              <strong>{count ?? "—"}</strong>
              <small>In your catalog</small>
            </div>
          ))}
        </div>
        <div className="panel workflow">
          <Settings2 className="accent" />
          <h2>Build a brilliant movie night.</h2>
          <p>
            Set up cities and theaters, add screens and seat layouts, then
            schedule your movies. Configure discounts and refund policies before
            your first booking.
          </p>
          <div className="workflow-steps">
            {[
              "City & theater",
              "Screen & seats",
              "Movie & show",
              "Ready for booking",
            ].map((s, i) => (
              <span key={s}>
                <b>0{i + 1}</b>
                {s}
              </span>
            ))}
          </div>
        </div>
      </>
    );
  return (
    <>
      <p className="eyebrow">FRAME STUDIO / {label.toUpperCase()}</p>
      <div className="page-heading">
        <h1>{label}</h1>
        <Button
          onClick={() => {
            create.reset();
            setOpen(true);
          }}
        >
          <Plus size={17} />
          {part === "team"
            ? "Grant admin access"
            : part === "seats"
              ? "Create layout"
              : "Add " +
                (part === "policies"
                  ? "policy"
                  : part === "discounts"
                    ? "discount"
                    : part === "cities"
                      ? "city"
                      : part.slice(0, -1))}
        </Button>
      </div>
      <p className="muted admin-description">
        {part === "team"
          ? "Promote an existing registered account. This grants full administrative access."
          : part === "seats"
            ? "Build a numbered seating plan for a screen. Existing seats remain managed by the backend."
            : part === "shows"
              ? "Schedule screenings with regular and premium prices. Times use the cinema’s configured timezone."
              : "Manage the details that make the experience."}
      </p>
      {part === "team" ? (
        <Empty
          title="The right people, behind the scenes"
          description="Enter an existing account’s email to grant administrator access. The API does not expose a user directory."
        />
      ) : (
        <>
          <div className="filterbar">
            {(part === "movies" || part === "theaters") && (
              <input
                aria-label="Filter records"
                placeholder={"Search " + part + "…"}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            )}
            {part === "movies" && (
              <select
                aria-label="Movie filter"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="title">By title</option>
                <option value="language">By language</option>
                <option value="genre">By genre</option>
              </select>
            )}
            {part === "shows" && (
              <select
                aria-label="Show filter"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  setParent("");
                }}
              >
                <option value="title">By movie</option>
                <option value="screen">By screen</option>
              </select>
            )}
            {["theaters", "screens", "seats", "shows"].includes(part) && (
              <select
                aria-label="Select parent"
                value={parent}
                onChange={(e) => setParent(e.target.value)}
              >
                <option value="">
                  {part === "shows"
                    ? "Choose a movie or screen"
                    : part === "seats"
                      ? "Choose a screen"
                      : "All locations"}
                </option>
                {opts(
                  part === "theaters"
                    ? cities.data
                    : part === "screens"
                      ? theaters.data
                      : part === "seats" || mode === "screen"
                        ? screens.data
                        : movies.data,
                ).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}
            {part === "shows" && mode !== "screen" && (
              <>
                <input
                  aria-label="Show range start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
                <input
                  aria-label="Show range end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </>
            )}
          </div>
          {detailError && <ErrorNotice error={detailError} />}
          {toggle.isError && <ErrorNotice error={toggle.error} />}
          {(part === "seats" || part === "shows") && !parent ? (
            <Empty
              title="Choose your starting point"
              description="Select a movie or screen above to load its records."
            />
          ) : data.isPending ? (
            <Loading />
          ) : data.isError ? (
            <ErrorNotice error={data.error} retry={() => data.refetch()} />
          ) : !data.data?.length ? (
            <Empty
              title="A fresh canvas"
              description="No records found. Add the first one to bring this space to life."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>
                      {part === "shows"
                        ? "Movie"
                        : part === "seats"
                          ? "Seat"
                          : part === "policies"
                            ? "Cutoff"
                            : "Name"}
                    </th>
                    <th>Details</th>
                    <th>Status / actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((r) => (
                    <tr key={String(r.id)}>
                      <td>#{String(r.id)}</td>
                      <td>
                        <button
                          className="table-title"
                          onClick={() => inspect(r)}
                        >
                          {String(
                            r.title ||
                              r.name ||
                              r.movieTitle ||
                              r.code ||
                              (part === "seats"
                                ? String(r.rowLabel) + r.seatNumber
                                : part === "policies"
                                  ? r.hoursBeforeShow + " hours"
                                  : "Record"),
                          )}
                        </button>
                      </td>
                      <td>
                        {part === "movies"
                          ? String(r.language) +
                            " · " +
                            r.durationMinutes +
                            " min"
                          : part === "theaters"
                            ? String(r.cityName)
                            : part === "screens"
                              ? String(r.theaterName)
                              : part === "seats"
                                ? String(r.seatType)
                                : part === "shows"
                                  ? dateLabel(String(r.startTime)) +
                                    " · " +
                                    timeLabel(String(r.startTime)) +
                                    " · " +
                                    r.screenName
                                  : part === "discounts"
                                    ? r.discountType === "PERCENTAGE"
                                      ? r.discountValue + "%"
                                      : currency(Number(r.discountValue))
                                    : part === "policies"
                                      ? r.refundPercentage + "% refund"
                                      : "City"}
                      </td>
                      <td>
                        {"active" in r ? (
                          <button
                            className={"toggle " + (r.active ? "on" : "")}
                            aria-label={
                              (r.active ? "Deactivate" : "Activate") +
                              " " +
                              (r.code || "policy " + r.id)
                            }
                            disabled={toggle.isPending}
                            onClick={() => toggle.mutate(r)}
                          >
                            <i />
                            {r.active ? "Active" : "Inactive"}
                          </button>
                        ) : r.status ? (
                          <Status value={String(r.status)} />
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => inspect(r)}
                          >
                            View details →
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!create.isPending) setOpen(v);
        }}
        title={
          part === "team"
            ? "Grant administrator access"
            : "Add " + label.toLowerCase()
        }
        description={
          part === "team"
            ? "This user will be able to manage the entire cinema catalog and configuration."
            : "Complete the details below. Changes are saved to your connected API."
        }
      >
        <form onSubmit={submit} className="admin-form">
          {fields[part]?.map((field) => (
            <FieldInput key={field.name} field={field} />
          ))}
          {part === "seats" && (
            <>
              <div className="form-columns">
                <label>
                  Rows (A–Z)
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={layoutRows}
                    onChange={(e) => setLayoutRows(Number(e.target.value))}
                    required
                  />
                </label>
                <label>
                  Seats per row
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={layoutCols}
                    onChange={(e) => setLayoutCols(Number(e.target.value))}
                    required
                  />
                </label>
                <label>
                  Premium rows at back
                  <input
                    type="number"
                    min={0}
                    max={layoutRows}
                    value={premiumRows}
                    onChange={(e) => setPremiumRows(Number(e.target.value))}
                    required
                  />
                </label>
              </div>
              <p className="info-banner">
                {layoutRows * layoutCols} seats · {premiumRows * layoutCols}{" "}
                premium · Labels A1 through{" "}
                {String.fromCharCode(64 + layoutRows) + layoutCols}
              </p>
            </>
          )}
          {create.isError && <ErrorNotice error={create.error} />}
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              disabled={create.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={create.isPending}>
              {create.isPending ? (
                <Spinner />
              ) : part === "team" ? (
                "Confirm admin access"
              ) : (
                "Save " + (part === "seats" ? "layout" : "record")
              )}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        title="Record details"
        description="Values returned by the service."
      >
        <dl className="detail-list">
          {detail &&
            Object.entries(detail).map(([k, v]) => (
              <div key={k}>
                <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
                <dd>{v === null ? "—" : String(v)}</dd>
              </div>
            ))}
        </dl>
      </Dialog>
    </>
  );
}
