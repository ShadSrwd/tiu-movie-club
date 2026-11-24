import "server-only";

// The Movie Database (TMDB) API, used only by admins to look up titles.
// Get a free "API Read Access Token" at https://www.themoviedb.org/settings/api
const BASE = "https://api.themoviedb.org/3";

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("TMDB_READ_TOKEN is not set. Add it to your environment variables.");
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`TMDB request failed (${res.status}). Check your TMDB token.`);
  return res.json() as Promise<T>;
}

export type TmdbSearchResult = {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
};

export async function searchMovies(query: string) {
  const data = await tmdb<{ results: (TmdbSearchResult & { adult?: boolean })[] }>("/search/movie", {
    query,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  return data.results.filter((m) => !m.adult).slice(0, 12);
}

type TmdbDetails = {
  id: number;
  imdb_id: string | null;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
  adult?: boolean;
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
};

export async function getMovieDetails(tmdbId: number) {
  const d = await tmdb<TmdbDetails>(`/movie/${tmdbId}`, {
    append_to_response: "release_dates",
    language: "en-US",
  });
  if (d.adult) throw new Error("This title is marked adult on TMDB and can't be added.");

  // US rating (G, PG, PG-13, R...) as a first hint. Admins still vet every film themselves.
  const us = d.release_dates?.results.find((r) => r.iso_3166_1 === "US");
  const certification = us?.release_dates.map((r) => r.certification).find((c) => c) ?? null;

  return {
    tmdb_id: d.id,
    imdb_id: d.imdb_id || null,
    title: d.title,
    overview: d.overview || null,
    poster_path: d.poster_path,
    backdrop_path: d.backdrop_path,
    release_year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
    runtime: d.runtime || null,
    certification,
    genres: d.genres.map((g) => g.name),
  };
}
