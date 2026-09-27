import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import { artwork, demoMovies } from "../lib/artwork";
import { demoAuth } from "../lib/demo-auth";
import {
  dateLabel,
  duration,
  instant,
  localDate,
  timeLabel,
} from "../lib/utils";
import { useSession, useCheckout } from "../store/session";
import { Button } from "../components/ui/button";
import {
  Empty,
  ErrorNotice,
  Loading,
  MovieCard,
  SectionHeading,
} from "../components/common";
export function cityOptions(): { id: number; name: string }[] {
  if (useSession.getState().demo)
    return [
      { id: 1, name: "Bengaluru" },
      { id: 2, name: "Mumbai" },
    ];
  try {
    return JSON.parse(import.meta.env.VITE_CITY_OPTIONS || "[]");
  } catch {
    return [];
  }
}
export function Home() {
  const auth = useSession((s) => s.auth),
    nav = useNavigate(),
    cache = useQueryClient();
  const q = useQuery({
    queryKey: ["movies"],
    queryFn: api.movies,
    enabled: !!auth,
  });
  const movies = auth ? q.data : demoMovies;
  function demo() {
    useCheckout.getState().clear();
    cache.clear();
    useSession.getState().signIn(demoAuth("CUSTOMER"), true);
    nav("/movies");
  }
  return (
    <>
      <section className="hero container">
        <img
          className="hero-art"
          src="/art/hero.svg"
          alt="A luminous planet over an otherworldly landscape"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <div className="hero-kicker">
            <span /> FOR THE LOVE OF CINEMA
          </div>
          <h1>
            Some stories
            <br />
            deserve a<br />
            <em>bigger screen.</em>
          </h1>
          <p>
            Switch off the everyday. Settle into something extraordinary. Your
            next movie night starts here.
          </p>
          <div className="hero-buttons">
            <Button asChild>
              <Link to="/movies">
                Explore movies <ArrowUpRight size={18} />
              </Link>
            </Button>
            {!auth && import.meta.env.VITE_ENABLE_DEMO !== "false" && (
              <Button variant="outline" onClick={demo}>
                Try the experience <ArrowRight size={17} />
              </Button>
            )}
          </div>
        </div>
        <div className="hero-caption">
          <span>THE FRAME EXPERIENCE</span>
          <strong>A seat. A screen. A whole new world.</strong>
        </div>
        <span className="hero-number">ESCAPE THE EVERYDAY</span>
      </section>
      <div className="marquee">
        <span>BIG STORIES</span>
        <Sparkles />
        <span>BETTER TOGETHER</span>
        <Sparkles />
        <span>ALL THE FEELS</span>
        <Sparkles />
        <span>ONLY AT THE MOVIES</span>
      </div>
      <section className="container section">
        <SectionHeading
          eyebrow="YOUR NEXT OBSESSION"
          title={auth ? "Now showing" : "Find your kind of escape"}
        >
          <Link className="text-link" to="/movies">
            Explore all movies <ArrowUpRight size={16} />
          </Link>
        </SectionHeading>
        {!auth && (
          <p className="preview-note">
            A taste of the experience · Illustrative movie selection. Sign in
            for live listings.
          </p>
        )}
        {q.isError ? (
          <ErrorNotice error={q.error} retry={() => q.refetch()} />
        ) : auth && q.isPending ? (
          <Loading />
        ) : (
          <div className="movie-grid">
            {movies?.slice(0, 6).map((m, i) => (
              <MovieCard key={m.id} movie={m} index={i} preview={!auth} />
            ))}
          </div>
        )}
      </section>
      <section className="container feature-band">
        <div>
          <p className="eyebrow">MAKE IT A MOVIE NIGHT</p>
          <h2>
            The best plans
            <br />
            start with <em>“let’s go.”</em>
          </h2>
        </div>
        <div>
          <p>
            A solo escape. A first date. The whole crew.
            <br />
            There’s a perfect seat for every kind of night.
          </p>
          <Button asChild variant="secondary">
            <Link to="/movies">
              Find your film <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <span className="giant-asterisk">✳</span>
      </section>
    </>
  );
}
export function Movies() {
  const auth = useSession((s) => s.auth),
    [search, setSearch] = useState(""),
    [genre, setGenre] = useState("All"),
    [language, setLanguage] = useState("All");
  const q = useQuery({
    queryKey: ["movies", search],
    queryFn: () =>
      search.trim() ? api.searchMovies(search.trim()) : api.movies(),
    enabled: !!auth,
  });
  const source = auth ? q.data || [] : demoMovies;
  const movies = source.filter(
    (m) =>
      (genre === "All" || m.genre === genre) &&
      (language === "All" || m.language === language) &&
      (!auth ? m.title.toLowerCase().includes(search.toLowerCase()) : true),
  );
  return (
    <section className="container page">
      <p className="eyebrow">FIND YOUR NEXT GREAT STORY</p>
      <div className="page-heading">
        <h1>
          Pick your <em>escape.</em>
        </h1>
        <span className="muted">{movies.length} films to discover</span>
      </div>
      <div className="filterbar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search movies"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for a movie…"
          />
        </div>
        <select
          aria-label="Genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          <option value="All">All genres</option>
          {[...new Set(source.map((m) => m.genre))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          aria-label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="All">All languages</option>
          {[...new Set(source.map((m) => m.language))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      {!auth && (
        <div className="info-banner">
          Illustrative preview.{" "}
          <Link to="/signin?next=/movies">
            Sign in to see live movies and book tickets <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {auth && q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorNotice error={q.error} retry={() => q.refetch()} />
      ) : movies.length ? (
        <div className="movie-grid">
          {movies.map((m, i) => (
            <MovieCard movie={m} index={i} key={m.id} preview={!auth} />
          ))}
        </div>
      ) : (
        <Empty
          title="No films in this frame"
          description="Try a different search or check back for new releases."
        />
      )}
    </section>
  );
}
export function MovieDetail() {
  const id = Number(useParams().id),
    [date, setDate] = useState(localDate()),
    [city, setCity] = useState("");
  const movie = useQuery({
      queryKey: ["movie", id],
      queryFn: () => api.movie(id),
    }),
    shows = useQuery({
      queryKey: ["shows", id, date],
      queryFn: () =>
        date
          ? api.showsInRange(id, date + "T00:00:00", date + "T23:59:59")
          : api.showsByMovie(id),
    }),
    theaters = useQuery({
      queryKey: ["theaters", city],
      queryFn: () => api.theatersByCity(Number(city)),
      enabled: !!city,
    });
  if (movie.isPending) return <Loading />;
  if (movie.isError)
    return <ErrorNotice error={movie.error} retry={() => movie.refetch()} />;
  const m = movie.data,
    list = (shows.data || []).filter(
      (s) =>
        s.status === "SCHEDULED" &&
        instant(s.startTime) > Date.now() &&
        (!city || theaters.data?.some((t) => t.id === s.theaterId)),
    );
  return (
    <div className="container page">
      <Link className="back-link" to="/movies">
        ← All movies
      </Link>
      <section className="movie-detail">
        <img src={artwork(m)} alt={"Illustrated artwork for " + m.title} />
        <div>
          <p className="eyebrow">NOW SHOWING · {m.language}</p>
          <h1>{m.title}</h1>
          <div className="movie-meta">
            <span>{m.genre}</span>
            <span>
              <Clock size={15} />
              {duration(m.durationMinutes)}
            </span>
          </div>
          <p className="synopsis">
            {m.description ||
              "Some stories are best discovered on the big screen."}
          </p>
          <a className="button button-primary" href="#showtimes">
            Find your showtime <ArrowRight size={17} />
          </a>
          <small className="art-note">
            FRAME illustrated cover · Promotional artwork
          </small>
        </div>
      </section>
      <section id="showtimes" className="section">
        <SectionHeading
          eyebrow="MAKE A DATE WITH THE BIG SCREEN"
          title="Choose your showtime"
        >
          {cityOptions().length > 0 && (
            <select
              aria-label="Select city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">All cities</option>
              {cityOptions().map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </SectionHeading>
        <div className="date-strip">
          <button
            className={!date ? "selected" : ""}
            onClick={() => setDate("")}
          >
            <span>ALL</span>
            <strong>→</strong>
            <span>Upcoming</span>
          </button>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(Date.now() + i * 86400000),
              value = localDate(d);
            return (
              <button
                key={value}
                className={date === value ? "selected" : ""}
                onClick={() => setDate(value)}
              >
                <span>
                  {i === 0
                    ? "TODAY"
                    : dateLabel(value + "T12:00:00", { weekday: "short" })}
                </span>
                <strong>
                  {dateLabel(value + "T12:00:00", { day: "2-digit" })}
                </strong>
                <span>
                  {dateLabel(value + "T12:00:00", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
        {shows.isPending || (city && theaters.isPending) ? (
          <Loading />
        ) : shows.isError || theaters.isError ? (
          <ErrorNotice
            error={shows.error || theaters.error}
            retry={() => {
              shows.refetch();
              if (city) theaters.refetch();
            }}
          />
        ) : !list.length ? (
          <Empty
            title="The next chapter is coming"
            description="No upcoming shows for this date and city. Try another day."
          />
        ) : (
          [...new Set(list.map((s) => s.theaterId))].map((t) => (
            <div className="theater-row" key={t}>
              <div>
                <MapPin size={19} />
                <div>
                  <h3>{list.find((s) => s.theaterId === t)?.theaterName}</h3>
                  <p>Enjoy the full cinema experience</p>
                </div>
              </div>
              <div className="showtimes">
                {list
                  .filter((s) => s.theaterId === t)
                  .map((s) => (
                    <Link key={s.id} to={"/shows/" + s.id + "/seats"}>
                      <strong>{timeLabel(s.startTime)}</strong>
                      <small>{s.screenName}</small>
                    </Link>
                  ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
export function Cinemas() {
  const [city, setCity] = useState(String(cityOptions()[0]?.id || ""));
  const q = useQuery({
    queryKey: ["theaters", city],
    queryFn: () => api.theatersByCity(Number(city)),
    enabled: !!city,
  });
  return (
    <div className="container page">
      <p className="eyebrow">YOUR NEIGHBOURHOOD ESCAPE</p>
      <SectionHeading title="Meet you at the movies.">
        <select
          aria-label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Choose city</option>
          {cityOptions().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </SectionHeading>
      {!city ? (
        <Empty
          title="Find a cinema through your film"
          description="Choose a movie to see every available cinema and showtime."
          action={
            <Button asChild>
              <Link to="/movies">Discover movies</Link>
            </Button>
          }
        />
      ) : q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorNotice error={q.error} />
      ) : (
        <div className="cinema-grid">
          {q.data.map((t) => (
            <article className="panel" key={t.id}>
              <MapPin className="accent" />
              <h2>{t.name}</h2>
              <p>{t.address}</p>
              <p className="muted">
                {t.landmark} · {t.cityName} {t.postalCode}
              </p>
              <Button asChild variant="outline">
                <Link to="/movies">
                  Explore movies <ArrowUpRight size={16} />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
