import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthPage } from "./auth";
import { useSession, useCheckout } from "../store/session";
function view(signup = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[signup ? "/signup" : "/signin?next=/bookings"]}
      >
        <Routes>
          <Route path="/signin" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage signup />} />
          <Route path="/bookings" element={<h1>Your tickets</h1>} />
          <Route path="/movies" element={<h1>Discover movies</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  useSession.getState().clear();
  useCheckout.getState().clear();
});
afterEach(() => vi.unstubAllGlobals());
it("shows server validation feedback and retains the form for correction", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Invalid credentials",
          validationErrors: { email: "Email or password is incorrect" },
        }),
        { status: 400 },
      ),
    ),
  );
  view();
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "alex@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "wrong-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email or password is incorrect",
  );
  expect(useSession.getState().auth).toBeNull();
  expect(screen.getByLabelText("Email address")).toHaveValue(
    "alex@example.com",
  );
});
it("signs in with the response contract and respects the local return route", async () => {
  const auth = {
    userId: 8,
    name: "Alex",
    email: "alex@example.com",
    role: "CUSTOMER",
    accessToken: "token",
    refreshToken: "refresh",
  };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(auth)));
  vi.stubGlobal("fetch", fetch);
  view();
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: auth.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "valid-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(
    await screen.findByRole("heading", { name: "Your tickets" }),
  ).toBeInTheDocument();
  expect(useSession.getState().auth?.userId).toBe(8);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    email: auth.email,
    password: "valid-password",
  });
});
it("registers name, email and password and opens the catalog", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        userId: 9,
        name: "Jamie",
        email: "jamie@example.com",
        role: "CUSTOMER",
        accessToken: "token",
        refreshToken: "refresh",
      }),
      { status: 201 },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  view(true);
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Jamie" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "jamie@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "new-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Discover movies" }),
    ).toBeInTheDocument(),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body).name).toBe("Jamie");
});
