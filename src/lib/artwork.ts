import type { Movie } from "./types";
// Original local illustrations; configure title-specific art here when official assets are available.
export const artwork = (movie: Pick<Movie, "title" | "genre">) => {
  const title = movie.title.toLowerCase();
  if (title.includes("dune")) return "/art/dune.svg";
  if (title === "the batman") return "/art/noir.svg";
  if (title === "la la land") return "/art/dream.svg";
  if (title.includes("inception")) return "/art/city.svg";
  if (title === "the grand budapest hotel") return "/art/hotel.svg";
  if (title === "interstellar") return "/art/orbit.svg";
  return "/art/cinema.svg";
};
export const demoMovies: Movie[] = [
  {
    id: 1,
    title: "Interstellar",
    description:
      "A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars. A journey about time, love, and the things that connect us.",
    durationMinutes: 169,
    language: "English",
    genre: "Sci-Fi",
  },
  {
    id: 2,
    title: "Dune: Part Two",
    description:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    durationMinutes: 166,
    language: "English",
    genre: "Adventure",
  },
  {
    id: 3,
    title: "The Batman",
    description:
      "In a city shrouded in secrets, a solitary detective follows a trail that leads to the heart of Gotham.",
    durationMinutes: 176,
    language: "English",
    genre: "Thriller",
  },
  {
    id: 4,
    title: "La La Land",
    description:
      "An aspiring actress and a jazz musician chase their dreams in a city where every night holds a little magic.",
    durationMinutes: 128,
    language: "English",
    genre: "Romance",
  },
  {
    id: 5,
    title: "Inception",
    description:
      "A skilled thief enters the dreams of others for one final mission: to plant an idea that could change everything.",
    durationMinutes: 148,
    language: "English",
    genre: "Sci-Fi",
  },
  {
    id: 6,
    title: "The Grand Budapest Hotel",
    description:
      "A legendary concierge and his young protégé become entangled in a wonderfully unexpected adventure.",
    durationMinutes: 99,
    language: "English",
    genre: "Comedy",
  },
];
