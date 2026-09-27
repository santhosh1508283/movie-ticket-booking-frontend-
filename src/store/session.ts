import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Auth, Booking, Hold, PaymentMethod } from "../lib/types";
export const useSession = create<{
  auth: Auth | null;
  demo: boolean;
  generation: number;
  signIn: (auth: Auth, demo?: boolean) => void;
  clear: () => void;
}>()(
  persist(
    (set) => ({
      auth: null,
      demo: false,
      generation: 0,
      signIn: (auth, demo = false) => set({ auth, demo }),
      clear: () =>
        set((s) => ({ auth: null, demo: false, generation: s.generation + 1 })),
    }),
    {
      name: "frame-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ auth: s.auth, demo: s.demo }),
    },
  ),
);
interface Checkout {
  userId: number;
  hold: Hold;
  booking: Booking | null;
  key: string | null;
  method: PaymentMethod | null;
  uncertain: boolean;
}
export const useCheckout = create<{
  checkout: Checkout | null;
  setHold: (hold: Hold, userId: number) => void;
  setBooking: (booking: Booking) => void;
  attempt: (method: PaymentMethod) => string;
  failed: () => void;
  uncertain: () => void;
  clear: () => void;
}>()(
  persist(
    (set, get) => ({
      checkout: null,
      setHold: (hold, userId) =>
        set({
          checkout: {
            userId,
            hold,
            booking: null,
            key: null,
            method: null,
            uncertain: false,
          },
        }),
      setBooking: (booking) =>
        set((s) => ({
          checkout: s.checkout ? { ...s.checkout, booking } : null,
        })),
      attempt: (method) => {
        const c = get().checkout;
        if (!c) throw new Error("No active checkout");
        const key = c.key || crypto.randomUUID();
        set({ checkout: { ...c, key, method: c.method || method } });
        return key;
      },
      failed: () =>
        set((s) => ({
          checkout: s.checkout
            ? { ...s.checkout, key: null, method: null, uncertain: false }
            : null,
        })),
      uncertain: () =>
        set((s) => ({
          checkout: s.checkout ? { ...s.checkout, uncertain: true } : null,
        })),
      clear: () => set({ checkout: null }),
    }),
    {
      name: "frame-checkout",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
