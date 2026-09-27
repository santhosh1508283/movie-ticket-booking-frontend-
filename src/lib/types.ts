export type Role = "CUSTOMER" | "ADMIN";
export interface Auth {
  userId: number;
  name: string;
  email: string;
  role: Role;
  accessToken: string;
  refreshToken: string;
}
export interface City {
  id: number;
  name: string;
}
export interface Movie {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  language: string;
  genre: string;
}
export interface Theater {
  id: number;
  name: string;
  address: string;
  landmark: string | null;
  postalCode: string | null;
  cityId: number;
  cityName: string;
}
export interface Screen {
  id: number;
  name: string;
  theaterId: number;
  theaterName: string;
}
export type SeatType = "REGULAR" | "PREMIUM";
export interface Seat {
  id: number;
  rowLabel: string;
  seatNumber: number;
  seatType: SeatType;
  screenId: number;
  screenName: string;
}
export interface Show {
  id: number;
  movieId: number;
  movieTitle: string;
  screenId: number;
  screenName: string;
  theaterId: number;
  theaterName: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
}
export interface ShowSeat {
  showSeatId: number;
  seatId: number;
  seatLabel: string;
  seatType: SeatType;
  price: number;
  status: "AVAILABLE" | "HELD" | "BOOKED";
}
export interface BookingItem {
  showSeatId: number;
  seatLabel: string;
  seatType: SeatType;
  price: number;
}
export interface Hold {
  holdId: number;
  showId: number;
  status: "ACTIVE" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  totalAmount: number;
  seats: BookingItem[];
}
export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";
export interface Booking {
  id: number;
  bookingReference: string;
  showId: number;
  movieTitle: string;
  theaterName: string;
  screenName: string;
  showStartTime: string;
  subtotal: number;
  discountAmount: number;
  appliedDiscountCode: string | null;
  totalAmount: number;
  status: BookingStatus;
  items: BookingItem[];
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
}
export type PaymentMethod = "CARD" | "UPI" | "NET_BANKING";
export interface Payment {
  paymentId: number;
  bookingId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  providerReference: string | null;
  bookingStatus: BookingStatus;
  createdAt: string;
}
export interface Refund {
  refundId: number;
  bookingId: number;
  amount: number;
  refundPercentage: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  providerReference: string | null;
  createdAt: string;
  processedAt: string | null;
}
export interface Cancellation {
  bookingId: number;
  bookingReference: string;
  bookingStatus: BookingStatus;
  refund: Refund;
}
export interface Discount {
  id: number;
  code: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  validFrom: string;
  validUntil: string;
  active: boolean;
}
export interface RefundPolicy {
  id: number;
  hoursBeforeShow: number;
  refundPercentage: number;
  active: boolean;
}
export interface UserRole {
  userId: number;
  name: string;
  email: string;
  role: Role;
}
export interface ErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  code?: string;
  message?: string;
  path?: string;
  validationErrors?: Record<string, string>;
}
export type CreateMovie = Omit<Movie, "id">;
export type CreateTheater = Omit<Theater, "id" | "cityName">;
export interface CreateSeat {
  rowLabel: string;
  seatNumber: number;
  seatType: SeatType;
}
export interface CreateShow {
  movieId: number;
  screenId: number;
  startTime: string;
  regularBasePrice: number;
  premiumBasePrice: number;
}
