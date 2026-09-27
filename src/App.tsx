import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, MapPin, Ticket, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { Brand, Loading } from "./components/common";
import { Button } from "./components/ui/button";
import { useSession, useCheckout } from "./store/session";
import { api } from "./lib/api";
import { Home, Movies, MovieDetail, Cinemas } from "./pages/catalog";
import { AuthPage } from "./pages/auth";
import { Seats, Checkout, Bookings, BookingDetail } from "./pages/booking";
const Admin = lazy(() =>
  import("./pages/admin").then((m) => ({ default: m.Admin })),
);
import { demoAuth } from "./lib/demo-auth";
function Guard({ admin = false }: { admin?: boolean }) {
  const a = useSession((s) => s.auth),
    loc = useLocation();
  return !a ? (
    <Navigate
      to={"/signin?next=" + encodeURIComponent(loc.pathname + loc.search)}
      replace
    />
  ) : admin && a.role !== "ADMIN" ? (
    <Navigate to="/movies" replace />
  ) : (
    <Outlet />
  );
}
function Layout() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const { auth, demo, clear, signIn } = useSession(),
    cache = useQueryClient(),
    nav = useNavigate(),
    [menu, setMenu] = useState(false);
  async function logout() {
    const token = auth?.refreshToken;
    clear();
    useCheckout.getState().clear();
    cache.clear();
    nav("/");
    if (token && !demo)
      try {
        await api.logout(token);
      } catch {
        /* Local session is already removed. */
      }
  }
  return (
    <>
      <div className="topline">
        THE BIG SCREEN. THE BETTER PLAN.
        <span>
          YOUR NEXT GREAT NIGHT STARTS HERE <ArrowUpRight size={12} />
        </span>
      </div>
      <header className="header container">
        <Brand />
        <nav
          className={menu ? "navigation open" : "navigation"}
          onClick={() => setMenu(false)}
        >
          <Link to="/movies">Discover movies</Link>
          <Link to="/cinemas">Cinemas</Link>
          {auth && <Link to="/bookings">My tickets</Link>}
          {auth?.role === "ADMIN" && <Link to="/admin">Studio admin</Link>}
        </nav>
        <div className="header-actions">
          <span className="location">
            <MapPin size={15} />
            India
          </span>
          {auth ? (
            <Button variant="ghost" onClick={logout} title="Sign out">
              <LogOut size={16} />
              <span>{auth.name.split(" ")[0]}</span>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/signin">
                Sign in <ArrowUpRight size={15} />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle navigation"
          >
            {menu ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      {demo && (
        <div className="demo-banner">
          SHOWCASE MODE · Sample data, simulated payments{" "}
          <button
            onClick={() => {
              signIn(
                demoAuth(auth?.role === "ADMIN" ? "CUSTOMER" : "ADMIN"),
                true,
              );
              cache.clear();
              nav(auth?.role === "ADMIN" ? "/movies" : "/admin");
            }}
          >
            Explore {auth?.role === "ADMIN" ? "customer" : "admin"} view{" "}
            <ArrowUpRight size={13} />
          </button>
        </div>
      )}
      <main>
        <Outlet />
      </main>
      <footer className="container footer">
        <div>
          <Brand />
          <p>Less scrolling. More cinema.</p>
        </div>
        <div>
          <Link to="/movies">
            Find your next film <ArrowUpRight size={15} />
          </Link>
          <span>Made for the moments that stay with you.</span>
        </div>
        <small>© {new Date().getFullYear()} FRAME · Cinema, together.</small>
      </footer>
    </>
  );
}
export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="movies" element={<Movies />} />
          <Route path="signin" element={<AuthPage />} />
          <Route path="signup" element={<AuthPage signup />} />
          <Route element={<Guard />}>
            <Route path="movies/:id" element={<MovieDetail />} />
            <Route path="cinemas" element={<Cinemas />} />
            <Route path="shows/:id/seats" element={<Seats />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
          </Route>
          <Route element={<Guard admin />}>
            <Route path="admin/*" element={<Admin />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="container page">
                <Ticket size={40} />
                <h1>This scene is missing.</h1>
                <Button asChild>
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
