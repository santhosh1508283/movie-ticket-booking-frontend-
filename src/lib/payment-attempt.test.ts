import { beforeEach, describe, it, expect } from "vitest";
import { paymentAttempt, clearAttempt } from "./payment-attempt";
import { useSession } from "../store/session";
const auth = {
  userId: 1,
  name: "Test",
  email: "a@b.test",
  role: "CUSTOMER" as const,
  accessToken: "token",
  refreshToken: "refresh",
};
beforeEach(() => {
  sessionStorage.clear();
  useSession.getState().signIn(auth);
});
describe("durable payment attempts", () => {
  it("retains key and method across retries and routes", () => {
    const a = paymentAttempt(1, "UPI");
    expect(paymentAttempt(1, "CARD")).toEqual(a);
  });
  it("starts a new key only after a resolved attempt is cleared", () => {
    const a = paymentAttempt(1, "UPI");
    clearAttempt(1);
    expect(paymentAttempt(1, "UPI").key).not.toBe(a.key);
  });
  it("isolates bookings and accounts", () => {
    const a = paymentAttempt(1, "UPI");
    expect(paymentAttempt(2, "UPI").key).not.toBe(a.key);
    useSession.getState().signIn({ ...auth, userId: 2 });
    expect(paymentAttempt(1, "UPI").key).not.toBe(a.key);
  });
  it("isolates demo from live accounts", () => {
    const a = paymentAttempt(1, "UPI");
    useSession.getState().signIn(auth, true);
    expect(paymentAttempt(1, "UPI").key).not.toBe(a.key);
  });
});
