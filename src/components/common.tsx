import { Component, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clapperboard,
  LoaderCircle,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ApiError } from "../lib/client";
import { artwork } from "../lib/artwork";
import { duration } from "../lib/utils";
import type { Movie } from "../lib/types";
import { Button } from "./ui/button";
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="FRAME home">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      FRAME<span className="brand-dot">®</span>
    </Link>
  );
}
export function Spinner() {
  return (
    <LoaderCircle className="animate-spin" size={18} aria-label="Loading" />
  );
}
export function Loading({ label = "Setting the scene…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>
          {error instanceof ApiError && error.code === "HOLD_EXPIRED"
            ? "Your reservation has expired"
            : "Something needs your attention"}
        </strong>
        <p>{error instanceof Error ? error.message : "Please try again."}</p>
        {error instanceof ApiError &&
          Object.entries(error.fields).map(([field, message]) => (
            <p key={field}>{message}</p>
          ))}
        {retry && (
          <Button variant="ghost" size="sm" onClick={retry}>
            <RefreshCw size={14} />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Ticket size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  const success = [
    "CONFIRMED",
    "SUCCESS",
    "SENT",
    "ACTIVE",
    "SCHEDULED",
    "AVAILABLE",
  ].includes(value);
  return (
    <span
      className={
        "status " +
        (success
          ? "status-success"
          : ["FAILED", "CANCELLED", "EXPIRED"].includes(value)
            ? "status-muted"
            : "status-pending")
      }
    >
      <span />
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function MovieCard({
  movie,
  index = 0,
  preview = false,
}: {
  movie: Movie;
  index?: number;
  preview?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className="movie-card"
    >
      <Link
        to={preview ? "/signin?next=/movies" : "/movies/" + movie.id}
        className="poster-link"
        aria-label={"View " + movie.title}
      >
        <img
          src={artwork(movie)}
          alt={"Illustrated artwork for " + movie.title}
          loading="lazy"
        />
        <span className="poster-format">{movie.language}</span>
        <span className="poster-cta">
          Find showtimes <ArrowRight size={17} />
        </span>
      </Link>
      <div className="movie-card-details">
        <p>
          {movie.genre}
          <span>·</span>
          {duration(movie.durationMinutes)}
        </p>
        <h3>
          <Link to={preview ? "/signin?next=/movies" : "/movies/" + movie.id}>
            {movie.title}
          </Link>
        </h3>
      </div>
    </motion.article>
  );
}
export function Steps({ current }: { current: number }) {
  return (
    <div className="steps">
      {["Choose seats", "Review booking", "Payment"].map((label, i) => (
        <div key={label} className={i <= current ? "active" : ""}>
          <span>
            {i < current ? <Check size={13} /> : String(i + 1).padStart(2, "0")}
          </span>
          {label}
          {i < 2 && <i />}
        </div>
      ))}
    </div>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="page container">
        <Clapperboard size={40} />
        <h1>Let’s try that scene again.</h1>
        <p className="muted">
          The page hit an unexpected problem. Reload to continue.
        </p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
