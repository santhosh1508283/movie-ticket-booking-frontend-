import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { safeNext } from "../lib/utils";
import { useSession, useCheckout } from "../store/session";
import { Button } from "../components/ui/button";
import { ErrorNotice, Spinner } from "../components/common";
export function AuthPage({ signup = false }: { signup?: boolean }) {
  const [params] = useSearchParams(),
    nav = useNavigate(),
    cache = useQueryClient(),
    [visible, setVisible] = useState(false);
  const mutation = useMutation({
    mutationFn: (f: FormData) =>
      signup
        ? api.register(
            String(f.get("name")).trim(),
            String(f.get("email")).trim(),
            String(f.get("password")),
          )
        : api.login(String(f.get("email")).trim(), String(f.get("password"))),
    onSuccess: (auth) => {
      useCheckout.getState().clear();
      cache.clear();
      useSession.getState().signIn(auth);
      nav(safeNext(params.get("next")), { replace: true });
    },
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    mutation.mutate(new FormData(e.currentTarget));
  }
  return (
    <div className="auth-layout container">
      <div className="auth-art">
        <img
          src="/art/hero.svg"
          alt="An illustrated planet above a cinematic desert"
        />
        <div>
          <p className="eyebrow">A LITTLE ESCAPE. A BIG SCREEN.</p>
          <h1>
            Your next
            <br />
            great <em>story.</em>
          </h1>
          <p>Find a film. Pick your seat. Feel everything.</p>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">WELCOME TO FRAME</p>
        <h1>{signup ? "Your story starts here." : "Good to see you again."}</h1>
        <p className="muted">
          {signup
            ? "Create an account for your next cinema night."
            : "Sign in to find your next movie moment."}
        </p>
        <form onSubmit={submit} key={signup ? "signup" : "signin"}>
          {signup && (
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                placeholder="Alex Morgan"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={signup ? 8 : 1}
                maxLength={72}
                placeholder={signup ? "At least 8 characters" : "Your password"}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {mutation.isError && <ErrorNotice error={mutation.error} />}
          <Button className="full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Spinner />
            ) : (
              <>
                {signup ? "Create account" : "Sign in"}
                <ArrowRight size={17} />
              </>
            )}
          </Button>
        </form>
        <p className="auth-switch">
          {signup ? "Already part of the story?" : "New around here?"}{" "}
          <Link
            to={
              (signup ? "/signin" : "/signup") +
              "?next=" +
              encodeURIComponent(safeNext(params.get("next")))
            }
          >
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
