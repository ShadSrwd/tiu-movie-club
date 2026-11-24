import "server-only";
import { createClient } from "./supabase/server";
import type { Movie, ResultRow, Round } from "./types";

export async function getRounds(): Promise<Round[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .order("opens_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Round[];
}

export async function getRoundMovies(roundId: number): Promise<Movie[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("round_movies")
    .select("movie:movies(*)")
    .eq("round_id", roundId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { movie: Movie | null }[])
    .map((r) => r.movie)
    .filter((m): m is Movie => Boolean(m))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getMovie(id: number): Promise<Movie | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("movies").select("*").eq("id", id).maybeSingle();
  return (data as Movie | null) ?? null;
}

export async function getMyVote(roundId: number, userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("votes")
    .select("movie_id")
    .eq("round_id", roundId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.movie_id ?? null;
}

export async function getResults(roundId: number): Promise<ResultRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("round_results", { p_round_id: roundId });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ResultRow[]).map((r) => ({
    movie_id: Number(r.movie_id),
    vote_count: Number(r.vote_count),
  }));
}

export async function getVoterCount(roundId: number): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("round_voter_count", { p_round_id: roundId });
  return Number(data ?? 0);
}
