import type { Auth } from "./types";
export const demoAuth = (role: "CUSTOMER" | "ADMIN" = "CUSTOMER"): Auth => ({
  userId: 1,
  name: "Alex Morgan",
  email: "alex@example.test",
  role,
  accessToken: "demo",
  refreshToken: "demo",
});
