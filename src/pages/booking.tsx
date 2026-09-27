import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  Download,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { ApiError } from "../lib/client";
import {
  paymentAttempt,
  readAttempt,
  clearAttempt,
} from "../lib/payment-attempt";
import type { Booking, PaymentMethod } from "../lib/types";
import {
  currency,
  dateLabel,
  instant,
  seatOrder,
  timeLabel,
} from "../lib/utils";
import { useCheckout, useSession } from "../store/session";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import {
  Empty,
  ErrorNotice,
  Loading,
  Spinner,
  Status,
  Steps,
} from "../components/common";
export function Seats() {
  const id = Number(useParams().id),
    nav = useNavigate(),
    [selected, setSelected] = useState<number[]>([]);
  const show = useQuery({
      queryKey: ["show", id],
      queryFn: () => api.show(id),
    }),
    seats = useQuery({
      queryKey: ["seats", id],
      queryFn: () => api.showSeats(id),
      refetchInterval: 10000,
    });
  const hold = useMutation({
    mutationFn: () => api.hold(id, selected),
    onSuccess: (h) => {
      useCheckout.getState().setHold(h, useSession.getState().auth!.userId);
      nav("/checkout");
    },
    onError: () => seats.refetch(),
  });
  useEffect(() => {
    if (seats.data)
      setSelected((s) =>
        s.filter((id) =>
          seats.data.some(
            (x) => x.showSeatId === id && x.status === "AVAILABLE",
          ),
        ),
      );
  }, [seats.data]);
  if (show.isPending || seats.isPending) return <Loading />;
  if (show.isError || seats.isError)
    return (
      <ErrorNotice
        error={show.error || seats.error}
        retry={() => {
          show.refetch();
          seats.refetch();
        }}
      />
    );
  const list = [...seats.data].sort((a, b) =>
      seatOrder(a.seatLabel, b.seatLabel),
    ),
    rows = [...new Set(list.map((s) => s.seatLabel.replace(/\d+$/, "")))],
    chosen = list.filter((s) => selected.includes(s.showSeatId));
  return (
    <div className="container page">
      <Link className="back-link" to={"/movies/" + show.data.movieId}>
        ← Showtimes
      </Link>
      <Steps current={0} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE BEST VIEW IS YOURS</p>
          <h1>
            Find your <em>spot.</em>
          </h1>
          <p className="muted">
            {show.data.movieTitle} · {show.data.theaterName} ·{" "}
            {show.data.screenName}
          </p>
        </div>
        <div className="show-date">
          <strong>{dateLabel(show.data.startTime)}</strong>
          <span>{timeLabel(show.data.startTime)}</span>
        </div>
      </div>
      <div className="seat-layout panel">
        <div className="screen-curve" />
        <p className="screen-label">ALL EYES THIS WAY</p>
        <div className="seat-scroll">
          <div className="seat-map">
            {rows.map((row) => (
              <div className="seat-row" key={row}>
                <span className="row-label">{row}</span>
                {list
                  .filter((s) => s.seatLabel.replace(/\d+$/, "") === row)
                  .map((s, i) => (
                    <button
                      key={s.showSeatId}
                      title={
                        s.seatLabel +
                        " · " +
                        s.seatType +
                        " · " +
                        currency(s.price)
                      }
                      aria-label={
                        "Seat " +
                        s.seatLabel +
                        ", " +
                        s.status +
                        ", " +
                        currency(s.price)
                      }
                      aria-pressed={selected.includes(s.showSeatId)}
                      disabled={s.status !== "AVAILABLE" || hold.isPending}
                      className={
                        "seat " +
                        (s.seatType === "PREMIUM" ? "premium " : "") +
                        (selected.includes(s.showSeatId) ? "chosen " : "") +
                        (s.status !== "AVAILABLE" ? "unavailable " : "") +
                        (i === 5 ? "aisle" : "")
                      }
                      onClick={() =>
                        setSelected((v) =>
                          v.includes(s.showSeatId)
                            ? v.filter((x) => x !== s.showSeatId)
                            : [...v, s.showSeatId],
                        )
                      }
                    >
                      {s.seatLabel.match(/\d+$/)?.[0] || s.seatLabel}
                    </button>
                  ))}
                <span className="row-label">{row}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="seat-legend">
          <span>
            <i />
            Available
          </span>
          <span>
            <i className="chosen" />
            Selected
          </span>
          <span>
            <i className="unavailable" />
            Unavailable
          </span>
          <span>
            <i className="premium" />
            Premium
          </span>
        </div>
      </div>
      {hold.isError && <ErrorNotice error={hold.error} />}
      <div className="booking-bar">
        <div>
          <span className="eyebrow">
            {chosen.length
              ? chosen.map((s) => s.seatLabel).join(", ")
              : "YOUR SEATS AWAIT"}
          </span>
          <h3>
            {chosen.length
              ? currency(chosen.reduce((a, s) => a + s.price, 0))
              : "Choose your favourite seats"}
          </h3>
          <small>Seats are reserved for 5 minutes after you continue.</small>
        </div>
        <Button
          disabled={!selected.length || hold.isPending}
          onClick={() => hold.mutate()}
        >
          {hold.isPending ? (
            <Spinner />
          ) : (
            <>
              Reserve {selected.length || ""} seat
              {selected.length !== 1 ? "s" : ""} <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
function Summary({
  booking,
  hold,
}: {
  booking?: Booking | null;
  hold?: ReturnType<typeof useCheckout.getState>["checkout"];
}) {
  const items = booking?.items || hold?.hold.seats || [];
  return (
    <div className="panel order-summary">
      <p className="eyebrow">YOUR MOVIE NIGHT</p>
      <h2>{booking?.movieTitle || "The big screen is calling"}</h2>
      {booking && (
        <p className="muted">
          {booking.theaterName} · {booking.screenName}
          <br />
          {dateLabel(booking.showStartTime)} ·{" "}
          {timeLabel(booking.showStartTime)}
        </p>
      )}
      <div className="summary-seats">
        {items.map((s) => (
          <span key={s.showSeatId}>{s.seatLabel}</span>
        ))}
      </div>
      {items.map((s) => (
        <div className="price-line" key={s.showSeatId}>
          <span>
            {s.seatLabel} <small>{s.seatType.toLowerCase()}</small>
          </span>
          <span>{currency(s.price)}</span>
        </div>
      ))}
      {!!booking?.discountAmount && (
        <div className="price-line accent">
          <span>Discount · {booking.appliedDiscountCode}</span>
          <span>−{currency(booking.discountAmount)}</span>
        </div>
      )}
      <div className="price-line total">
        <span>Total</span>
        <strong>
          {currency(booking?.totalAmount ?? hold?.hold.totalAmount ?? 0)}
        </strong>
      </div>
      <p className="secure-note">
        <ShieldCheck size={16} /> Your total comes directly from the booking
        service.
      </p>
    </div>
  );
}
export function Checkout() {
  const c = useCheckout((s) => s.checkout),
    auth = useSession((s) => s.auth),
    nav = useNavigate(),
    [code, setCode] = useState(""),
    [method, setMethod] = useState<PaymentMethod>(c?.method || "UPI"),
    [now, setNow] = useState(Date.now());
  const hold = useQuery({
    queryKey: ["hold", c?.hold.holdId],
    queryFn: () => api.getHold(c!.hold.holdId),
    enabled: !!c && c.userId === auth?.userId,
    refetchInterval: 10000,
    retry: false,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const create = useMutation({
    mutationFn: async () => {
      if (!c) throw new Error("No reservation");
      try {
        return await api.createBooking(c.hold.holdId, code.trim() || null);
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 0 || error.status === 409 || error.status >= 500)
        ) {
          const existing = (await api.bookings()).find(
            (b) =>
              b.showId === c.hold.showId &&
              b.status === "PENDING_PAYMENT" &&
              b.items.length === c.hold.seats.length &&
              b.items.every((i) =>
                c.hold.seats.some((s) => s.showSeatId === i.showSeatId),
              ),
          );
          if (existing) return existing;
        }
        throw error;
      }
    },
    onSuccess: (b) => useCheckout.getState().setBooking(b),
  });
  const payment = useMutation({
    mutationFn: async () => {
      const state = useCheckout.getState();
      if (!state.checkout?.booking)
        throw new Error("Create your booking first");
      const attempt = paymentAttempt(state.checkout.booking.id, method);
      state.attempt(attempt.method);
      return api.pay(state.checkout.booking.id, attempt.key, attempt.method);
    },
    onSuccess: (p) => {
      if (p.status === "SUCCESS") {
        clearAttempt(p.bookingId);
        toast.success("You’re going to the movies!");
        useCheckout.getState().clear();
        nav("/bookings/" + p.bookingId, { replace: true });
      } else if (p.status === "FAILED") {
        clearAttempt(p.bookingId);
        useCheckout.getState().failed();
        toast.error("Payment declined. You can start a new attempt.");
      } else {
        useCheckout.getState().uncertain();
        toast.info("Payment is pending. Check again using the same attempt.");
      }
    },
    onError: () => useCheckout.getState().uncertain(),
  });
  const release = useMutation({
    mutationFn: () => api.releaseHold(c!.hold.holdId),
    onSuccess: () => {
      useCheckout.getState().clear();
      nav("/movies");
    },
  });
  if (!c || c.userId !== auth?.userId)
    return (
      <div className="container page">
        <Empty
          title="Your next night out awaits"
          description="Choose a show and reserve your seats to start checkout."
          action={
            <Button asChild>
              <Link to="/movies">Explore movies</Link>
            </Button>
          }
        />
      </div>
    );
  const seconds = Math.max(
      0,
      Math.ceil(
        (instant(hold.data?.expiresAt || c.hold.expiresAt) - now) / 1000,
      ),
    ),
    expired =
      (seconds === 0 ||
        hold.data?.status === "EXPIRED" ||
        hold.data?.status === "CANCELLED") &&
      !c.uncertain;
  const busy = payment.isPending || create.isPending;
  return (
    <div className="container page">
      <Steps current={c.booking ? 2 : 1} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">ALMOST SHOWTIME</p>
          <h1>
            Make it <em>official.</em>
          </h1>
        </div>
        <div className={"countdown " + (seconds < 60 ? "urgent" : "")}>
          <Clock size={18} />
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}{" "}
          <span>seat reservation</span>
        </div>
      </div>
      {hold.isError && (
        <ErrorNotice error={hold.error} retry={() => hold.refetch()} />
      )}
      <div className="checkout-grid">
        <section className="panel">
          <div className="step-title">
            <span>{c.booking ? "02" : "01"}</span>
            <h2>
              {c.booking
                ? "Choose how to pay"
                : "A little extra for your night"}
            </h2>
          </div>
          {expired ? (
            <Empty
              title="Your seat reservation has expired"
              description="Choose seats again to continue. Availability may have changed."
              action={
                <Button asChild>
                  <Link to={"/shows/" + c.hold.showId + "/seats"}>
                    Choose seats again
                  </Link>
                </Button>
              }
            />
          ) : !c.booking ? (
            <>
              <p className="muted">
                Have a discount code? We’ll check it when we create your
                booking.
              </p>
              <label>
                Discount code <span className="muted">(optional)</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={50}
                  placeholder="Enter your code"
                />
              </label>
              {create.isError && <ErrorNotice error={create.error} />}
              <Button
                className="full"
                disabled={busy || hold.isPending || hold.isError}
                onClick={() => create.mutate()}
              >
                {create.isPending ? (
                  <Spinner />
                ) : (
                  <>
                    Continue to payment <ArrowRight size={17} />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="info-banner">
                <ShieldCheck size={20} />
                <span>
                  Demo payment processor. No real money is charged. No card or
                  bank details are collected.
                </span>
              </div>
              <div className="payment-options">
                {(["UPI", "CARD", "NET_BANKING"] as PaymentMethod[]).map(
                  (m) => (
                    <button
                      key={m}
                      disabled={!!c.key || busy}
                      className={method === m ? "selected" : ""}
                      onClick={() => setMethod(m)}
                    >
                      <CreditCard size={21} />
                      <span>{m.replace("_", " ")}</span>
                      <i>{method === m && <Check size={12} />}</i>
                    </button>
                  ),
                )}
              </div>
              {c.uncertain && (
                <p className="info-banner">
                  Your previous attempt is being verified. Retrying uses the
                  same payment key to prevent duplicate charges.
                </p>
              )}
              {payment.isError && <ErrorNotice error={payment.error} />}
              <Button
                className="full"
                disabled={busy || hold.isPending || hold.isError}
                onClick={() => payment.mutate()}
              >
                {payment.isPending ? (
                  <Spinner />
                ) : (
                  <>
                    {c.key
                      ? "Check payment"
                      : "Pay " + currency(c.booking.totalAmount)}
                    <ArrowRight size={17} />
                  </>
                )}
              </Button>
            </>
          )}
          {!busy && (
            <Button
              variant="ghost"
              className="full"
              disabled={release.isPending || c.uncertain}
              onClick={() => release.mutate()}
            >
              Release seats & leave checkout
            </Button>
          )}
          {release.isError && <ErrorNotice error={release.error} />}
        </section>
        <Summary booking={c.booking} hold={c} />
      </div>
    </div>
  );
}
export function Bookings() {
  const [filter, setFilter] = useState("ALL"),
    q = useQuery({ queryKey: ["bookings"], queryFn: api.bookings });
  return (
    <div className="container page">
      <p className="eyebrow">THE NIGHTS YOU’LL REMEMBER</p>
      <div className="page-heading">
        <h1>
          Your <em>tickets.</em>
        </h1>
        <Button asChild variant="outline">
          <Link to="/movies">
            Find another film <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
      <div className="tabs">
        {["ALL", "CONFIRMED", "PENDING_PAYMENT", "CANCELLED", "EXPIRED"].map(
          (s) => (
            <button
              className={filter === s ? "active" : ""}
              onClick={() => setFilter(s)}
              key={s}
            >
              {s.replace("_", " ").toLowerCase()}
            </button>
          ),
        )}
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorNotice error={q.error} retry={() => q.refetch()} />
      ) : !q.data.filter((b) => filter === "ALL" || b.status === filter)
          .length ? (
        <Empty
          title="A story waiting to happen"
          description="Your bookings will appear here. Find something worth going out for."
          action={
            <Button asChild>
              <Link to="/movies">Explore movies</Link>
            </Button>
          }
        />
      ) : (
        <div className="booking-list">
          {q.data
            .filter((b) => filter === "ALL" || b.status === filter)
            .sort((a, b) => b.id - a.id)
            .map((b) => (
              <Link
                className="booking-card"
                key={b.id}
                to={"/bookings/" + b.id}
              >
                <div className="ticket-icon">
                  <Ticket />
                </div>
                <div>
                  <Status value={b.status} />
                  <h2>{b.movieTitle}</h2>
                  <p>
                    {b.theaterName} · {b.screenName}
                  </p>
                  <span>
                    {dateLabel(b.showStartTime)} · {timeLabel(b.showStartTime)}{" "}
                    · {b.items.map((s) => s.seatLabel).join(", ")}
                  </span>
                </div>
                <div className="booking-card-end">
                  <strong>{currency(b.totalAmount)}</strong>
                  <small>{b.bookingReference}</small>
                  <ArrowRight size={20} />
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
export function BookingDetail() {
  const id = Number(useParams().id),
    cache = useQueryClient(),
    [confirm, setConfirm] = useState(false),
    [method, setMethod] = useState<PaymentMethod>("UPI"),
    [refund, setRefund] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.booking(id),
  });
  const savedAttempt = readAttempt(id);
  const pay = useMutation({
    mutationFn: () => {
      const attempt = paymentAttempt(id, method);
      return api.pay(id, attempt.key, attempt.method);
    },
    onSuccess: (p) => {
      if (p.status === "SUCCESS" || p.status === "FAILED") clearAttempt(id);
      toast[p.status === "SUCCESS" ? "success" : "info"](
        p.status === "SUCCESS"
          ? "Your ticket is confirmed"
          : p.status === "FAILED"
            ? "Payment declined. You may try again."
            : "Payment pending. Retry to check the same attempt.",
      );
      q.refetch();
      cache.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
  const cancel = useMutation({
    mutationFn: () => api.cancel(id),
    onSuccess: (r) => {
      setConfirm(false);
      setRefund(
        r.refund
          ? "Refund " +
              currency(r.refund.amount) +
              " · " +
              r.refund.status.toLowerCase()
          : "Booking cancelled",
      );
      q.refetch();
      cache.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Cancellation processed");
    },
  });
  if (q.isPending) return <Loading />;
  if (q.isError)
    return <ErrorNotice error={q.error} retry={() => q.refetch()} />;
  const b = q.data;
  function download() {
    const text = [
      "FRAME — MOVIE TICKET",
      b.bookingReference,
      b.movieTitle,
      b.theaterName + " / " + b.screenName,
      dateLabel(b.showStartTime) + " " + timeLabel(b.showStartTime),
      "Seats: " + b.items.map((s) => s.seatLabel).join(", "),
      "Status: " + b.status,
      "Total: " + currency(b.totalAmount),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "FRAME-" + b.bookingReference + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="container page ticket-page">
      <Link className="back-link" to="/bookings">
        ← My tickets
      </Link>
      <div className="ticket-heading">
        <div className="confirmation-icon">
          {b.status === "CONFIRMED" ? <Check /> : <Ticket />}
        </div>
        <p className="eyebrow">YOUR FRAME MOMENT</p>
        <h1>
          {b.status === "CONFIRMED"
            ? "See you at the movies."
            : "Your booking details."}
        </h1>
        <p className="muted">Every great night starts with a ticket.</p>
      </div>
      <div className="ticket panel">
        <div className="ticket-main">
          <Status value={b.status} />
          <h2>{b.movieTitle}</h2>
          <p>
            {b.theaterName} · {b.screenName}
          </p>
          <div className="ticket-fields">
            <div>
              <small>DATE</small>
              <strong>
                {dateLabel(b.showStartTime, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </div>
            <div>
              <small>SHOWTIME</small>
              <strong>{timeLabel(b.showStartTime)}</strong>
            </div>
            <div>
              <small>YOUR SEATS</small>
              <strong>{b.items.map((s) => s.seatLabel).join(", ")}</strong>
            </div>
            <div>
              <small>TOTAL PAID / DUE</small>
              <strong>{currency(b.totalAmount)}</strong>
            </div>
          </div>
        </div>
        <div className="ticket-stub">
          <Ticket size={38} />
          <small>BOOKING REFERENCE</small>
          <strong>{b.bookingReference}</strong>
          <span>Keep this reference for your visit.</span>
          <Button variant="outline" onClick={download}>
            <Download size={16} />
            Save ticket
          </Button>
        </div>
      </div>
      {refund && <div className="info-banner">{refund}</div>}
      {b.status === "PENDING_PAYMENT" && (
        <div className="panel">
          <h2>Finish your booking</h2>
          <p className="muted">
            Payments use the backend’s simulated processor. A retry keeps the
            same key and payment method.
          </p>
          <select
            aria-label="Payment method"
            value={savedAttempt?.method || method}
            disabled={!!savedAttempt}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="NET_BANKING">Net banking</option>
          </select>
          <Button disabled={pay.isPending} onClick={() => pay.mutate()}>
            {pay.isPending ? <Spinner /> : "Pay / check payment"}
          </Button>
          {pay.isError && <ErrorNotice error={pay.error} />}
        </div>
      )}
      {b.status === "CONFIRMED" && instant(b.showStartTime) > Date.now() && (
        <div className="cancel-line">
          <p>
            Plans changed? Refunds depend on the cinema’s cancellation policy.
          </p>
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            Cancel booking
          </Button>
        </div>
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Cancel your movie night?"
        description="This releases your seats. The server will calculate any refund using the applicable policy and time remaining before the show."
      >
        <p>
          This action cannot be undone. Any refund amount will be shown after
          cancellation.
        </p>
        {cancel.isError && <ErrorNotice error={cancel.error} />}
        <div className="dialog-actions">
          <Button
            variant="outline"
            disabled={cancel.isPending}
            onClick={() => setConfirm(false)}
          >
            Keep tickets
          </Button>
          <Button
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {cancel.isPending ? <Spinner /> : "Cancel booking"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
