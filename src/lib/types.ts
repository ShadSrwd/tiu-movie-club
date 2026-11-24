export type Movie = {
  id: number;
  tmdb_id: number | null;
  imdb_id: string | null;
  title: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_year: number | null;
  runtime: number | null;
  certification: string | null;
  genres: string[];
  approved: boolean;
  content_notes: string | null;
  approved_at: string | null;
  created_at: string;
};

export type Round = {
  id: number;
  title: string;
  opens_at: string;
  closes_at: string;
  screening_at: string | null;
  location: string | null;
  winner_movie_id: number | null;
  created_at: string;
};

export type RoundStatus = "upcoming" | "open" | "closed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "student" | "admin";
};

export type Suggestion = {
  id: number;
  user_id: string;
  title: string;
  note: string | null;
  status: "pending" | "added" | "rejected";
  created_at: string;
};

export type ResultRow = { movie_id: number; vote_count: number };

export type ActionState = { ok: boolean; message: string } | null;
