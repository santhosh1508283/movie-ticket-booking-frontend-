import { request, json } from "./client";
import type {
  Auth,
  City,
  Movie,
  Theater,
  Screen,
  Seat,
  Show,
  ShowSeat,
  Hold,
  Booking,
  Payment,
  PaymentMethod,
  Cancellation,
  Discount,
  RefundPolicy,
  UserRole,
  CreateMovie,
  CreateTheater,
  CreateShow,
  CreateSeat,
} from "./types";
const q = (v: string) => encodeURIComponent(v);
export const api = {
  login: (email: string, password: string) =>
    request<Auth>("/api/auth/login", json("POST", { email, password }), true),
  register: (name: string, email: string, password: string) =>
    request<Auth>(
      "/api/auth/register",
      json("POST", { name, email, password }),
      true,
    ),
  logout: (refreshToken: string) =>
    request<void>("/api/auth/logout", json("POST", { refreshToken }), true),
  movies: () => request<Movie[]>("/api/catalog/movies"),
  movie: (id: number) => request<Movie>("/api/catalog/movies/" + id),
  searchMovies: (title: string) =>
    request<Movie[]>("/api/catalog/movies/search?title=" + q(title)),
  theatersByCity: (id: number) =>
    request<Theater[]>("/api/catalog/cities/" + id + "/theaters"),
  showsByMovie: (id: number) =>
    request<Show[]>("/api/catalog/movies/" + id + "/shows"),
  showsInRange: (id: number, start: string, end: string) =>
    request<Show[]>(
      "/api/catalog/movies/" +
        id +
        "/shows/range?start=" +
        q(start) +
        "&end=" +
        q(end),
    ),
  show: (id: number) => request<Show>("/api/catalog/shows/" + id),
  showSeats: (id: number) =>
    request<ShowSeat[]>("/api/catalog/shows/" + id + "/seats"),
  hold: (showId: number, showSeatIds: number[]) =>
    request<Hold>("/api/seat-holds", json("POST", { showId, showSeatIds })),
  getHold: (id: number) => request<Hold>("/api/seat-holds/" + id),
  releaseHold: (id: number) =>
    request<void>("/api/seat-holds/" + id, { method: "DELETE" }),
  createBooking: (holdId: number, discountCode: string | null) =>
    request<Booking>("/api/bookings", json("POST", { holdId, discountCode })),
  bookings: () => request<Booking[]>("/api/bookings"),
  booking: (id: number) => request<Booking>("/api/bookings/" + id),
  pay: (id: number, key: string, paymentMethod: PaymentMethod) =>
    request<Payment>("/api/payments/bookings/" + id, {
      ...json("POST", { paymentMethod }),
      headers: { "Idempotency-Key": key },
    }),
  cancel: (id: number) =>
    request<Cancellation>("/api/bookings/" + id + "/cancel", {
      method: "POST",
    }),
};
export const admin = {
  cities: () => request<City[]>("/api/admin/cities"),
  city: (id: number) => request<City>("/api/admin/cities/" + id),
  createCity: (name: string) =>
    request<City>("/api/admin/cities", json("POST", { name })),
  movies: () => request<Movie[]>("/api/admin/movies"),
  movie: (id: number) => request<Movie>("/api/admin/movies/" + id),
  createMovie: (body: CreateMovie) =>
    request<Movie>("/api/admin/movies", json("POST", body)),
  searchMovies: (title: string) =>
    request<Movie[]>("/api/admin/movies/search?title=" + q(title)),
  moviesByLanguage: (language: string) =>
    request<Movie[]>("/api/admin/movies/language?language=" + q(language)),
  moviesByGenre: (genre: string) =>
    request<Movie[]>("/api/admin/movies/genre?genre=" + q(genre)),
  theaters: () => request<Theater[]>("/api/admin/theaters"),
  theater: (id: number) => request<Theater>("/api/admin/theaters/" + id),
  createTheater: (body: CreateTheater) =>
    request<Theater>("/api/admin/theaters", json("POST", body)),
  theatersByCity: (id: number) =>
    request<Theater[]>("/api/admin/theaters/city/" + id),
  searchTheaters: (name: string) =>
    request<Theater[]>("/api/admin/theaters/search?name=" + q(name)),
  screens: () => request<Screen[]>("/api/admin/screens"),
  screen: (id: number) => request<Screen>("/api/admin/screens/" + id),
  createScreen: (name: string, theaterId: number) =>
    request<Screen>("/api/admin/screens", json("POST", { name, theaterId })),
  screensByTheater: (id: number) =>
    request<Screen[]>("/api/admin/screens/theater/" + id),
  seat: (id: number) => request<Seat>("/api/admin/seats/" + id),
  seatsByScreen: (id: number) =>
    request<Seat[]>("/api/admin/seats/screen/" + id),
  createLayout: (screenId: number, seats: CreateSeat[]) =>
    request<Seat[]>(
      "/api/admin/seats/layout",
      json("POST", { screenId, seats }),
    ),
  createShow: (body: CreateShow) =>
    request<Show>("/api/admin/shows", json("POST", body)),
  show: (id: number) => request<Show>("/api/admin/shows/" + id),
  showsByMovie: (id: number) => request<Show[]>("/api/admin/shows/movie/" + id),
  showsByScreen: (id: number) =>
    request<Show[]>("/api/admin/shows/screen/" + id),
  showsInRange: (id: number, start: string, end: string) =>
    request<Show[]>(
      "/api/admin/shows/movie/" +
        id +
        "/range?start=" +
        q(start) +
        "&end=" +
        q(end),
    ),
  discounts: () => request<Discount[]>("/api/admin/discount-codes"),
  createDiscount: (body: Omit<Discount, "id" | "active">) =>
    request<Discount>("/api/admin/discount-codes", json("POST", body)),
  setDiscountActive: (id: number, active: boolean) =>
    request<Discount>(
      "/api/admin/discount-codes/" + id + "/active?active=" + active,
      { method: "PATCH" },
    ),
  policies: () => request<RefundPolicy[]>("/api/admin/refund-policies"),
  createPolicy: (hoursBeforeShow: number, refundPercentage: number) =>
    request<RefundPolicy>(
      "/api/admin/refund-policies",
      json("POST", { hoursBeforeShow, refundPercentage }),
    ),
  setPolicyActive: (id: number, active: boolean) =>
    request<RefundPolicy>(
      "/api/admin/refund-policies/" + id + "/active?active=" + active,
      { method: "PATCH" },
    ),
  makeAdmin: (email: string) =>
    request<UserRole>("/api/admin/users/make-admin", json("PATCH", { email })),
};
