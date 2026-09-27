import type { PaymentMethod } from "./types";
import { useSession } from "../store/session";
const keyFor = (bookingId: number) =>
  "frame-payment-" +
  (useSession.getState().demo ? "demo-" : "live-") +
  useSession.getState().auth?.userId +
  "-" +
  bookingId;
export function readAttempt(
  bookingId: number,
): { key: string; method: PaymentMethod } | null {
  try {
    return JSON.parse(sessionStorage.getItem(keyFor(bookingId)) || "null");
  } catch {
    return null;
  }
}
export function paymentAttempt(bookingId: number, method: PaymentMethod) {
  const saved = readAttempt(bookingId);
  if (saved) return saved;
  const next = { key: crypto.randomUUID(), method };
  sessionStorage.setItem(keyFor(bookingId), JSON.stringify(next));
  return next;
}
export function clearAttempt(bookingId: number) {
  sessionStorage.removeItem(keyFor(bookingId));
}
