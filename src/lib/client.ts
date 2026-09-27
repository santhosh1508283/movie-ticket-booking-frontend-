import { useSession } from "../store/session";
import type { Auth, ErrorResponse } from "./types";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;
  constructor(
    message: string,
    status = 0,
    code = "NETWORK_ERROR",
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
async function transport<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(base + path, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    if (!response.ok) {
      const e = (data || {}) as ErrorResponse;
      throw new ApiError(
        e.message ||
          (response.status === 403
            ? "You do not have access to this action."
            : response.status >= 500
              ? "The service is unavailable. Please try again."
              : "The request could not be completed."),
        response.status,
        e.code || "REQUEST_FAILED",
        e.validationErrors || {},
      );
    }
    if (!data && text)
      throw new ApiError(
        "Unexpected response from the server. Check the API connection.",
        502,
        "INVALID_RESPONSE",
      );
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error && error.name === "AbortError"
        ? "The request timed out. Your action may still have completed. Check its status before trying again."
        : "Could not reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
let refreshing: Promise<Auth> | null = null;
export function expired(token: string) {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return Number(payload.exp) * 1000 < Date.now() + 30000;
  } catch {
    return false;
  }
}
export async function refreshSession() {
  if (refreshing) return refreshing;
  const state = useSession.getState(),
    auth = state.auth,
    generation = state.generation;
  if (!auth)
    throw new ApiError("Please sign in to continue.", 401, "UNAUTHORIZED");
  refreshing = transport<Auth>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: auth.refreshToken }),
  })
    .then((next) => {
      if (
        useSession.getState().generation !== generation ||
        useSession.getState().auth?.refreshToken !== auth.refreshToken
      )
        throw new ApiError("Your session has ended.", 401, "UNAUTHORIZED");
      useSession.getState().signIn(next);
      return next;
    })
    .catch((e) => {
      if (
        e instanceof ApiError &&
        [400, 401, 403].includes(e.status) &&
        useSession.getState().generation === generation
      )
        useSession.getState().clear();
      throw e;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  publicRoute = false,
): Promise<T> {
  const state = useSession.getState();
  if (state.demo && !publicRoute) {
    const { demoRequest } = await import("./demo");
    return demoRequest<T>(path, options);
  }
  let auth = state.auth;
  if (!publicRoute && auth && expired(auth.accessToken))
    auth = await refreshSession();
  try {
    return await transport<T>(path, {
      ...options,
      headers: {
        ...(!publicRoute && auth
          ? { Authorization: "Bearer " + auth.accessToken }
          : {}),
        ...options.headers,
      },
    });
  } catch (e) {
    if (
      !publicRoute &&
      auth &&
      e instanceof ApiError &&
      [401, 403].includes(e.status)
    ) {
      const next = await refreshSession();
      return transport<T>(path, {
        ...options,
        headers: {
          Authorization: "Bearer " + next.accessToken,
          ...options.headers,
        },
      });
    }
    throw e;
  }
}
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});
