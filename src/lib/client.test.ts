import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { request, refreshSession } from "./client";
import { useSession } from "../store/session";
const auth = {
  userId: 1,
  name: "Test",
  email: "a@b.test",
  role: "CUSTOMER" as const,
  accessToken: "old-token",
  refreshToken: "refresh",
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  useSession.getState().clear();
  vi.restoreAllMocks();
});
afterEach(() => vi.unstubAllGlobals());
describe("API client", () => {
  it("maps server validation fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            message: "Invalid request",
            code: "VALIDATION_ERROR",
            validationErrors: { email: "Invalid email" },
          },
          400,
        ),
      ),
    );
    await expect(request("/api/auth/register", {}, true)).rejects.toMatchObject(
      { status: 400, fields: { email: "Invalid email" } },
    );
  });
  it("does not automatically retry uncertain payment requests", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetch);
    await expect(
      request("/api/payments/bookings/1", { method: "POST" }),
    ).rejects.toMatchObject({ status: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("refreshes a rejected access token and preserves idempotency headers", async () => {
    useSession.getState().signIn(auth);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ ...auth, accessToken: "new-token" }))
      .mockResolvedValueOnce(response({ paymentId: 5 }));
    vi.stubGlobal("fetch", fetch);
    expect(
      await request("/api/payments/bookings/1", {
        method: "POST",
        headers: { "Idempotency-Key": "stable" },
      }),
    ).toEqual({ paymentId: 5 });
    expect(fetch.mock.calls[2][1].headers).toMatchObject({
      Authorization: "Bearer new-token",
      "Idempotency-Key": "stable",
    });
  });
  it("shares one refresh between concurrent requests", async () => {
    useSession.getState().signIn(auth);
    const fetch = vi
      .fn()
      .mockResolvedValue(response({ ...auth, accessToken: "new-token" }));
    vi.stubGlobal("fetch", fetch);
    await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not resurrect a logged-out session when refresh completes", async () => {
    useSession.getState().signIn(auth);
    let resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      ),
    );
    const promise = refreshSession();
    useSession.getState().clear();
    resolve(response({ ...auth, accessToken: "new-token" }));
    await expect(promise).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(useSession.getState().auth).toBeNull();
  });
  it("clears a rejected refresh token", async () => {
    useSession.getState().signIn(auth);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 403)));
    await expect(refreshSession()).rejects.toMatchObject({ status: 403 });
    expect(useSession.getState().auth).toBeNull();
  });
  it("rejects a successful HTML proxy response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>not an API</html>")),
    );
    await expect(request("/api/catalog/movies")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
  it("accepts 204 logout responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    expect(await request("/api/auth/logout", {}, true)).toBeUndefined();
  });
});
