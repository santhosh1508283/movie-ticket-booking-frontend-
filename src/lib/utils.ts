import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: import.meta.env.VITE_CURRENCY || "INR",
    maximumFractionDigits: 2,
  }).format(value);
export const duration = (minutes: number) =>
  Math.floor(minutes / 60) + "h " + (minutes % 60) + "m";
export const timezone = import.meta.env.VITE_CINEMA_TIMEZONE || "Asia/Kolkata";
// Java LocalDateTime has no offset. Resolve it against the configured cinema timezone.
export function instant(value: string): number {
  if (/Z$|[+-]\d\d:\d\d$/.test(value)) return Date.parse(value);
  const plain = value.slice(0, 19);
  const utc = Date.parse(plain + "Z");
  if (!Number.isFinite(utc)) return NaN;
  let result = utc;
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(result);
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const localAsUtc = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    result += utc - localAsUtc;
  }
  return result;
}
export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  const n = instant(value);
  return Number.isFinite(n)
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: timezone,
        ...(options || { day: "numeric", month: "short" }),
      }).format(n)
    : "Date unavailable";
}
export const timeLabel = (value: string) =>
  dateLabel(value, {
    day: undefined,
    month: undefined,
    hour: "numeric",
    minute: "2-digit",
  });
export const localDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const safeNext = (value: string | null) =>
  value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/movies";
export const seatOrder = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });
