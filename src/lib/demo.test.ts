import { beforeEach, describe, it, expect } from "vitest";
import { demoRequest, resetDemo } from "./demo";
import { json } from "./client";
import type { Booking, Hold, Payment, ShowSeat } from "./types";
beforeEach(resetDemo);
describe("showcase booking lifecycle", () => {
  it("reserves seats, rejects conflicts, applies a discount, and replays one payment", async () => {
    const seats = await demoRequest<ShowSeat[]>("/api/catalog/shows/1/seats");
    const ids = seats
      .filter((s) => s.status === "AVAILABLE")
      .slice(0, 2)
      .map((s) => s.showSeatId);
    const hold = await demoRequest<Hold>(
      "/api/seat-holds",
      json("POST", { showId: 1, showSeatIds: ids }),
    );
    expect(hold.totalAmount).toBe(440);
    await expect(
      demoRequest(
        "/api/seat-holds",
        json("POST", { showId: 1, showSeatIds: ids }),
      ),
    ).rejects.toMatchObject({ code: "SEAT_NOT_AVAILABLE" });
    const b = await demoRequest<Booking>(
      "/api/bookings",
      json("POST", { holdId: hold.holdId, discountCode: "FIRSTFRAME" }),
    );
    expect(b.totalAmount).toBe(374);
    const options = {
      ...json("POST", { paymentMethod: "UPI" }),
      headers: { "Idempotency-Key": "test-key" },
    };
    const p = await demoRequest<Payment>(
      "/api/payments/bookings/" + b.id,
      options,
    );
    expect(p.status).toBe("SUCCESS");
    expect(
      await demoRequest("/api/payments/bookings/" + b.id, options),
    ).toEqual(p);
    expect((await demoRequest<Booking>("/api/bookings/" + b.id)).status).toBe(
      "CONFIRMED",
    );
  });
  it("releases held seats", async () => {
    const h = await demoRequest<Hold>(
      "/api/seat-holds",
      json("POST", { showId: 1, showSeatIds: [1001] }),
    );
    await demoRequest("/api/seat-holds/" + h.holdId, { method: "DELETE" });
    expect(
      (await demoRequest<ShowSeat[]>("/api/catalog/shows/1/seats"))[0].status,
    ).toBe("AVAILABLE");
  });
});
