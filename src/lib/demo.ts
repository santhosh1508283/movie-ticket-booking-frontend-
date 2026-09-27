import type {
  Auth,
  Booking,
  BookingItem,
  Cancellation,
  City,
  Discount,
  Hold,
  Movie,
  Payment,
  RefundPolicy,
  Screen,
  Seat,
  Show,
  ShowSeat,
  Theater,
  CreateShow,
  CreateSeat,
} from "./types";
import { demoMovies } from "./artwork";
import { ApiError } from "./client";
import { instant, localDate } from "./utils";
interface DemoDB {
  movies: Movie[];
  cities: City[];
  theaters: Theater[];
  screens: Screen[];
  shows: Show[];
  seats: Record<number, ShowSeat[]>;
  layouts: Record<number, Seat[]>;
  holds: Hold[];
  bookings: Booking[];
  payments: Record<string, Payment>;
  discounts: Discount[];
  policies: RefundPolicy[];
}
function seed(): DemoDB {
  const cities = [
    { id: 1, name: "Bengaluru" },
    { id: 2, name: "Mumbai" },
  ];
  const theaters: Theater[] = [
    {
      id: 1,
      name: "PVR · The Forum",
      address: "Hosur Road, Koramangala",
      landmark: "Forum Mall",
      postalCode: "560095",
      cityId: 1,
      cityName: "Bengaluru",
    },
    {
      id: 2,
      name: "INOX · Garuda Mall",
      address: "Magrath Road, Ashok Nagar",
      landmark: null,
      postalCode: "560025",
      cityId: 1,
      cityName: "Bengaluru",
    },
    {
      id: 3,
      name: "PVR · Phoenix",
      address: "Lower Parel",
      landmark: "Phoenix Palladium",
      postalCode: "400013",
      cityId: 2,
      cityName: "Mumbai",
    },
  ];
  const screens = theaters.map((t) => ({
    id: t.id,
    name: "Screen 1",
    theaterId: t.id,
    theaterName: t.name,
  }));
  const shows: Show[] = [];
  for (let day = 0; day < 7; day++)
    for (const movie of demoMovies)
      for (const t of theaters) {
        const d = new Date();
        d.setDate(d.getDate() + day);
        const date = localDate(d);
        const hour = 12 + ((movie.id + t.id) % 4) * 2;
        shows.push({
          id: shows.length + 1,
          movieId: movie.id,
          movieTitle: movie.title,
          screenId: t.id,
          screenName: "Screen 1",
          theaterId: t.id,
          theaterName: t.name,
          startTime: date + "T" + hour + ":00:00",
          endTime: date + "T" + (hour + 3) + ":00:00",
          status: "SCHEDULED",
        });
      }
  return {
    movies: structuredClone(demoMovies),
    cities,
    theaters,
    screens,
    shows,
    seats: {},
    layouts: {},
    holds: [],
    bookings: [],
    payments: {},
    discounts: [
      {
        id: 1,
        code: "FIRSTFRAME",
        discountType: "PERCENTAGE",
        discountValue: 15,
        minimumOrderAmount: 0,
        maximumDiscountAmount: 150,
        validFrom: "2020-01-01T00:00:00",
        validUntil: "2099-01-01T00:00:00",
        active: true,
      },
    ],
    policies: [
      { id: 1, hoursBeforeShow: 24, refundPercentage: 100, active: true },
      { id: 2, hoursBeforeShow: 2, refundPercentage: 50, active: true },
    ],
  };
}
let db: DemoDB;
try {
  db =
    JSON.parse(sessionStorage.getItem("frame-demo-data") || "null") || seed();
} catch {
  db = seed();
}
const save = () =>
  sessionStorage.setItem("frame-demo-data", JSON.stringify(db));
export const demoAuth = (role: "CUSTOMER" | "ADMIN" = "CUSTOMER"): Auth => ({
  userId: 1,
  name: "Alex Morgan",
  email: "alex@example.test",
  role,
  accessToken: "demo",
  refreshToken: "demo",
});
export const resetDemo = () => {
  db = seed();
  save();
};
const find = <T extends { id: number }>(items: T[], id: number) => {
  const item = items.find((x) => x.id === id);
  if (!item)
    throw new ApiError(
      "This item could not be found.",
      404,
      "RESOURCE_NOT_FOUND",
    );
  return item;
};
function showSeats(id: number) {
  if (!db.seats[id])
    db.seats[id] = Array.from({ length: 72 }, (_, i) => ({
      showSeatId: id * 1000 + i + 1,
      seatId: i + 1,
      seatLabel: String.fromCharCode(65 + Math.floor(i / 12)) + ((i % 12) + 1),
      seatType: i >= 48 ? "PREMIUM" : "REGULAR",
      price: i >= 48 ? 350 : 220,
      status: [7, 8, 20, 21, 34, 35, 36].includes(i) ? "BOOKED" : "AVAILABLE",
    }));
  return db.seats[id];
}
function expire() {
  db.holds
    .filter((h) => h.status === "ACTIVE" && instant(h.expiresAt) <= Date.now())
    .forEach((h) => {
      h.status = "EXPIRED";
      showSeats(h.showId)
        .filter(
          (s) =>
            h.seats.some((x) => x.showSeatId === s.showSeatId) &&
            s.status === "HELD",
        )
        .forEach((s) => (s.status = "AVAILABLE"));
      db.bookings
        .filter(
          (b) =>
            b.status === "PENDING_PAYMENT" &&
            b.showId === h.showId &&
            b.items.some((s) =>
              h.seats.some((x) => x.showSeatId === s.showSeatId),
            ),
        )
        .forEach((b) => (b.status = "EXPIRED"));
    });
}
export async function demoRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  await new Promise((r) => setTimeout(r, 180));
  expire();
  const u = new URL(path, "http://demo"),
    p = u.pathname,
    m = options.method || "GET",
    body = options.body ? JSON.parse(String(options.body)) : {};
  const n = Number(p.split("/").filter(Boolean).at(-1));
  let result: unknown;
  const admin = p.startsWith("/api/admin/");
  if (p === "/api/catalog/movies" || p === "/api/admin/movies")
    result = m === "POST" ? create("movies", body) : db.movies;
  else if (p.includes("/movies/search"))
    result = db.movies.filter((x) =>
      x.title
        .toLowerCase()
        .includes((u.searchParams.get("title") || "").toLowerCase()),
    );
  else if (p.includes("/movies/language"))
    result = db.movies.filter(
      (x) =>
        x.language.toLowerCase() ===
        (u.searchParams.get("language") || "").toLowerCase(),
    );
  else if (p.includes("/movies/genre"))
    result = db.movies.filter(
      (x) =>
        x.genre.toLowerCase() ===
        (u.searchParams.get("genre") || "").toLowerCase(),
    );
  else if (/\/movies\/\d+$/.test(p)) result = find(db.movies, n);
  else if (/\/movies\/\d+\/shows/.test(p) || /\/shows\/movie\//.test(p)) {
    const id = Number(p.match(/\/movies?\/(\d+)/)?.[1]);
    result = db.shows.filter(
      (s) =>
        s.movieId === id &&
        (!p.endsWith("/range") ||
          (s.startTime >= (u.searchParams.get("start") || "") &&
            s.startTime <= (u.searchParams.get("end") || "z"))),
    );
  } else if (/\/shows\/screen\//.test(p))
    result = db.shows.filter((s) => s.screenId === n);
  else if (/\/shows\/\d+\/seats$/.test(p))
    result = showSeats(Number(p.split("/").at(-2)));
  else if (/\/shows\/\d+$/.test(p)) result = find(db.shows, n);
  else if (p === "/api/admin/shows" && m === "POST") {
    const b = body as CreateShow,
      movie = find(db.movies, b.movieId),
      screen = find(db.screens, b.screenId);
    const end = new Date(
      instant(b.startTime) + movie.durationMinutes * 60000,
    ).toISOString();
    result = create("shows", {
      movieId: b.movieId,
      movieTitle: movie.title,
      screenId: b.screenId,
      screenName: screen.name,
      theaterId: screen.theaterId,
      theaterName: screen.theaterName,
      startTime: b.startTime,
      endTime: end,
      status: "SCHEDULED",
    });
  } else if (p === "/api/admin/cities")
    result = m === "POST" ? create("cities", body) : db.cities;
  else if (/\/cities\/\d+$/.test(p)) result = find(db.cities, n);
  else if (p === "/api/admin/theaters")
    result =
      m === "POST"
        ? create("theaters", {
            ...body,
            cityName: find(db.cities, body.cityId).name,
          })
        : db.theaters;
  else if (p.includes("/theaters/search"))
    result = db.theaters.filter((t) =>
      t.name
        .toLowerCase()
        .includes((u.searchParams.get("name") || "").toLowerCase()),
    );
  else if (/\/cities\/\d+\/theaters/.test(p))
    result = db.theaters.filter(
      (t) => t.cityId === Number(p.split("/").at(-2)),
    );
  else if (p.includes("/theaters/city/"))
    result = db.theaters.filter((t) => t.cityId === n);
  else if (/\/theaters\/\d+$/.test(p)) result = find(db.theaters, n);
  else if (p === "/api/admin/screens")
    result =
      m === "POST"
        ? create("screens", {
            ...body,
            theaterName: find(db.theaters, body.theaterId).name,
          })
        : db.screens;
  else if (p.includes("/screens/theater/"))
    result = db.screens.filter((s) => s.theaterId === n);
  else if (/\/screens\/\d+$/.test(p)) result = find(db.screens, n);
  else if (p === "/api/admin/seats/layout") {
    const screen = find(db.screens, body.screenId),
      layout = db.layouts[screen.id] || [];
    const incoming = (body.seats as CreateSeat[]).map((s, i) => ({
      ...s,
      id: Date.now() + i,
      screenId: screen.id,
      screenName: screen.name,
    }));
    if (
      incoming.some((s) =>
        layout.some(
          (x) =>
            x.rowLabel.toUpperCase() === s.rowLabel.toUpperCase() &&
            x.seatNumber === s.seatNumber,
        ),
      )
    )
      throw new ApiError(
        "One or more seats already exist.",
        409,
        "DUPLICATE_RESOURCE",
      );
    db.layouts[screen.id] = [...layout, ...incoming];
    result = incoming;
  } else if (p.includes("/seats/screen/")) result = db.layouts[n] || [];
  else if (admin && /\/seats\/\d+$/.test(p))
    result = find(Object.values(db.layouts).flat(), n);
  else if (p === "/api/seat-holds" && m === "POST") {
    const seats = showSeats(body.showId).filter((s) =>
      body.showSeatIds.includes(s.showSeatId),
    );
    if (!seats.length || seats.some((s) => s.status !== "AVAILABLE"))
      throw new ApiError(
        "Some of these seats are no longer available. Please select again.",
        409,
        "SEAT_NOT_AVAILABLE",
      );
    seats.forEach((s) => (s.status = "HELD"));
    const hold: Hold = {
      holdId: Date.now(),
      showId: body.showId,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      totalAmount: seats.reduce((s, x) => s + x.price, 0),
      seats: seats.map(({ showSeatId, seatLabel, seatType, price }) => ({
        showSeatId,
        seatLabel,
        seatType,
        price,
      })),
    };
    db.holds.push(hold);
    result = hold;
  } else if (/\/seat-holds\/\d+$/.test(p)) {
    const h = db.holds.find((x) => x.holdId === n);
    if (!h) throw new ApiError("Seat reservation not found.", 404);
    if (m === "DELETE") {
      h.status = "CANCELLED";
      showSeats(h.showId)
        .filter((s) => h.seats.some((x) => x.showSeatId === s.showSeatId))
        .forEach((s) => (s.status = "AVAILABLE"));
      result = undefined;
    } else result = h;
  } else if (p === "/api/bookings") {
    if (m === "GET") result = db.bookings;
    else {
      const h = db.holds.find((x) => x.holdId === body.holdId);
      if (!h || h.status !== "ACTIVE")
        throw new ApiError(
          "Your seat reservation has expired.",
          410,
          "HOLD_EXPIRED",
        );
      const existing = db.bookings.find(
        (b) =>
          b.items.some((i) =>
            h.seats.some((s) => s.showSeatId === i.showSeatId),
          ) && b.status === "PENDING_PAYMENT",
      );
      if (existing)
        throw new ApiError(
          "A booking already exists. Open My tickets to continue.",
          409,
          "INVALID_STATE",
        );
      const show = find(db.shows, h.showId);
      let discount = 0;
      if (body.discountCode) {
        const d = db.discounts.find(
          (x) =>
            x.code === String(body.discountCode).trim().toUpperCase() &&
            x.active,
        );
        if (
          !d ||
          instant(d.validFrom) > Date.now() ||
          instant(d.validUntil) < Date.now()
        )
          throw new ApiError(
            "This discount code is not valid.",
            400,
            "INVALID_REQUEST",
          );
        if (h.totalAmount < (d.minimumOrderAmount || 0))
          throw new ApiError(
            "The minimum order value has not been reached.",
            400,
            "INVALID_REQUEST",
          );
        discount = Math.min(
          h.totalAmount,
          d.discountType === "FLAT"
            ? d.discountValue
            : Math.min(
                (h.totalAmount * d.discountValue) / 100,
                d.maximumDiscountAmount ?? Infinity,
              ),
        );
      }
      result = create("bookings", {
        bookingReference:
          "FRM-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        showId: show.id,
        movieTitle: show.movieTitle,
        theaterName: show.theaterName,
        screenName: show.screenName,
        showStartTime: show.startTime,
        subtotal: h.totalAmount,
        discountAmount: discount,
        appliedDiscountCode: body.discountCode || null,
        totalAmount: h.totalAmount - discount,
        status: "PENDING_PAYMENT",
        items: h.seats,
        createdAt: new Date().toISOString(),
        confirmedAt: null,
        cancelledAt: null,
      });
    }
  } else if (/\/bookings\/\d+\/cancel$/.test(p)) {
    const b = find(db.bookings, Number(p.split("/").at(-2)));
    if (b.status !== "CONFIRMED" || instant(b.showStartTime) <= Date.now())
      throw new ApiError(
        "This booking cannot be cancelled.",
        400,
        "CANCELLATION_NOT_ALLOWED",
      );
    const hours = (instant(b.showStartTime) - Date.now()) / 3600000;
    const policy = [...db.policies]
      .filter((p) => p.active)
      .sort((a, b) => b.hoursBeforeShow - a.hoursBeforeShow)
      .find((p) => hours >= p.hoursBeforeShow);
    const percent = policy?.refundPercentage || 0;
    b.status = "CANCELLED";
    b.cancelledAt = new Date().toISOString();
    showSeats(b.showId)
      .filter((s) => b.items.some((i) => i.showSeatId === s.showSeatId))
      .forEach((s) => (s.status = "AVAILABLE"));
    result = {
      bookingId: b.id,
      bookingReference: b.bookingReference,
      bookingStatus: b.status,
      refund: {
        refundId: Date.now(),
        bookingId: b.id,
        amount: +((b.totalAmount * percent) / 100).toFixed(2),
        refundPercentage: percent,
        status: "SUCCESS",
        providerReference: "DEMO-REFUND",
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      },
    } satisfies Cancellation;
  } else if (p.startsWith("/api/payments/bookings/")) {
    const key = new Headers(options.headers).get("Idempotency-Key") || "";
    if (db.payments[key]) result = db.payments[key];
    else {
      const b = find(db.bookings, n);
      if (b.status !== "PENDING_PAYMENT")
        throw new ApiError(
          "This booking is not awaiting payment.",
          409,
          "INVALID_STATE",
        );
      b.status = "CONFIRMED";
      b.confirmedAt = new Date().toISOString();
      db.holds
        .filter(
          (h) =>
            h.showId === b.showId &&
            h.seats.some((s) =>
              b.items.some((i) => i.showSeatId === s.showSeatId),
            ),
        )
        .forEach((h) => (h.status = "CONFIRMED"));
      showSeats(b.showId)
        .filter((s) => b.items.some((i) => i.showSeatId === s.showSeatId))
        .forEach((s) => (s.status = "BOOKED"));
      result = db.payments[key] = {
        paymentId: Date.now(),
        bookingId: b.id,
        amount: b.totalAmount,
        paymentMethod: body.paymentMethod,
        status: "SUCCESS",
        providerReference: "DEMO-" + key.slice(0, 8),
        bookingStatus: b.status,
        createdAt: new Date().toISOString(),
      };
    }
  } else if (/^\/api\/bookings\/\d+$/.test(p)) result = find(db.bookings, n);
  else if (p === "/api/admin/discount-codes")
    result =
      m === "POST"
        ? create("discounts", { ...body, active: true })
        : db.discounts;
  else if (p === "/api/admin/refund-policies")
    result =
      m === "POST"
        ? create("policies", { ...body, active: true })
        : db.policies;
  else if (p.endsWith("/active")) {
    const list = p.includes("discount-codes") ? db.discounts : db.policies;
    const item = find(
      list as { id: number; active: boolean }[],
      Number(p.split("/").at(-2)),
    );
    item.active = u.searchParams.get("active") === "true";
    result = item;
  } else if (p === "/api/admin/users/make-admin")
    result = {
      userId: 2,
      name: body.email.split("@")[0],
      email: body.email,
      role: "ADMIN",
    };
  else
    throw new ApiError("This preview action is unavailable.", 404, "NOT_FOUND");
  save();
  return structuredClone(result) as T;
}
function create<
  K extends
    | "movies"
    | "cities"
    | "theaters"
    | "screens"
    | "shows"
    | "bookings"
    | "discounts"
    | "policies",
>(key: K, body: object) {
  const items = db[key] as { id: number }[];
  const item = { ...body, id: Math.max(0, ...items.map((x) => x.id)) + 1 };
  items.push(item);
  return item;
}
export type { BookingItem };
