"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMovieDetails, searchMovies, type TmdbSearchResult } from "@/lib/tmdb";
import { localInputToIso } from "@/lib/format";
import type { ActionState } from "@/lib/types";

function refreshAll() {
  revalidatePath("/", "layout");
}

const num = (v: FormDataEntryValue | null) => Number(v);
const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();

// ---------------- Movies ----------------

export async function searchTmdb(
  query: string,
): Promise<{ results: (TmdbSearchResult & { added: boolean })[]; error?: string }> {
  await requireAdmin();
  if (!query.trim()) return { results: [] };
  try {
    const results = await searchMovies(query.trim());
    const supabase = await createClient();
    const { data } = await supabase
      .from("movies")
      .select("tmdb_id")
      .in("tmdb_id", results.map((r) => r.id));
    const added = new Set((data ?? []).map((d) => d.tmdb_id));
    return { results: results.map((r) => ({ ...r, added: added.has(r.id) })) };
  } catch (e) {
    return { results: [], error: (e as Error).message };
  }
}

export async function addFromTmdb(tmdbId: number): Promise<ActionState> {
  await requireAdmin();
  try {
    const details = await getMovieDetails(tmdbId);
    const supabase = await createClient();
    const { error } = await supabase.from("movies").insert({ ...details, approved: false });
    if (error) {
      return {
        ok: false,
        message: error.code === "23505" ? "Already in the list." : error.message,
      };
    }
    refreshAll();
    return { ok: true, message: `Added "${details.title}" to Pending review.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function addManual(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = str(formData.get("title"));
  if (!title) return { ok: false, message: "Title is required." };
  const year = num(formData.get("release_year")) || null;
  const runtime = num(formData.get("runtime")) || null;
  const supabase = await createClient();
  const { error } = await supabase.from("movies").insert({
    title,
    release_year: year,
    runtime,
    overview: str(formData.get("overview")) || null,
    certification: str(formData.get("certification")) || null,
    approved: false,
  });
  if (error) return { ok: false, message: error.message };
  refreshAll();
  return { ok: true, message: `Added "${title}" to Pending review.` };
}

export async function setApproved(formData: FormData) {
  const admin = await requireAdmin();
  const approved = formData.get("approved") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("movies")
    .update({
      approved,
      approved_by: approved ? admin.id : null,
      approved_at: approved ? new Date().toISOString() : null,
    })
    .eq("id", num(formData.get("movie_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function saveNotes(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("movies")
    .update({ content_notes: str(formData.get("content_notes")) || null })
    .eq("id", num(formData.get("movie_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function deleteMovie(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("movies").delete().eq("id", num(formData.get("movie_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

// ---------------- Rounds ----------------

export async function createRound(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = str(formData.get("title"));
  const opens_at = localInputToIso(str(formData.get("opens_at")));
  const closes_at = localInputToIso(str(formData.get("closes_at")));
  const screening_at = localInputToIso(str(formData.get("screening_at")));
  const location = str(formData.get("location")) || null;
  const movieIds = formData.getAll("movie_ids").map(Number).filter(Boolean);

  if (!title) return { ok: false, message: "Give the round a title." };
  if (!opens_at || !closes_at) return { ok: false, message: "Set when voting opens and closes." };
  if (new Date(closes_at) <= new Date(opens_at))
    return { ok: false, message: "Voting must close after it opens." };
  if (movieIds.length < 2) return { ok: false, message: "Pick at least 2 films for the shortlist." };

  const supabase = await createClient();
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({ title, opens_at, closes_at, screening_at, location })
    .select("id")
    .single();
  if (error || !round) return { ok: false, message: error?.message ?? "Couldn't create round." };

  const { error: rmError } = await supabase
    .from("round_movies")
    .insert(movieIds.map((movie_id) => ({ round_id: round.id, movie_id })));
  if (rmError) {
    await supabase.from("rounds").delete().eq("id", round.id);
    return { ok: false, message: `Couldn't save the shortlist: ${rmError.message}` };
  }

  refreshAll();
  return { ok: true, message: `"${title}" created with ${movieIds.length} films.` };
}

export async function endVotingNow(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("rounds")
    .update({ closes_at: new Date().toISOString() })
    .eq("id", num(formData.get("round_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function declareWinner(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("rounds")
    .update({ winner_movie_id: num(formData.get("movie_id")) })
    .eq("id", num(formData.get("round_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function clearWinner(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("rounds")
    .update({ winner_movie_id: null })
    .eq("id", num(formData.get("round_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function updateScreening(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("rounds")
    .update({
      screening_at: localInputToIso(str(formData.get("screening_at"))),
      location: str(formData.get("location")) || null,
    })
    .eq("id", num(formData.get("round_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function deleteRound(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("rounds").delete().eq("id", num(formData.get("round_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

// ---------------- Suggestions ----------------

export async function setSuggestionStatus(formData: FormData) {
  await requireAdmin();
  const status = str(formData.get("status"));
  if (!["pending", "added", "rejected"].includes(status)) throw new Error("Invalid status");
  const supabase = await createClient();
  const { error } = await supabase
    .from("suggestions")
    .update({ status })
    .eq("id", num(formData.get("suggestion_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

export async function deleteSuggestion(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("suggestions").delete().eq("id", num(formData.get("suggestion_id")));
  if (error) throw new Error(error.message);
  refreshAll();
}

// ---------------- Team ----------------

export async function addAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = str(formData.get("email")).toLowerCase();
  if (!email) return { ok: false, message: "Enter an email." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .ilike("email", email.replace(/[\\%_]/g, (c) => "\\" + c))
    .select("email");
  if (error) return { ok: false, message: error.message };
  if (!data?.length)
    return { ok: false, message: "No one with that email has signed in yet. Ask them to sign in once first." };
  refreshAll();
  return { ok: true, message: `${data[0].email} is now an admin.` };
}

export async function removeAdmin(formData: FormData) {
  const me = await requireAdmin();
  const id = str(formData.get("user_id"));
  if (id === me.id) throw new Error("You can't remove yourself. Ask another admin.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: "student" }).eq("id", id);
  if (error) throw new Error(error.message);
  refreshAll();
}
