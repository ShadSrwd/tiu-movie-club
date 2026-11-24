"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function castVote(roundId: number, movieId: number): Promise<ActionState> {
  const profile = await getProfile();
  if (!profile) return { ok: false, message: "Sign in with your TIU account to vote." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("votes")
    .upsert(
      { round_id: roundId, movie_id: movieId, user_id: profile.id },
      { onConflict: "round_id,user_id" },
    );

  if (error) {
    // Row Level Security refuses votes outside the voting window.
    return { ok: false, message: "Voting for this round is closed." };
  }
  revalidatePath("/");
  return { ok: true, message: "Vote saved. You can change it until voting closes." };
}

export async function removeVote(roundId: number): Promise<ActionState> {
  const profile = await getProfile();
  if (!profile) return { ok: false, message: "Not signed in." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("round_id", roundId)
    .eq("user_id", profile.id);
  if (error) return { ok: false, message: "Couldn't remove your vote." };
  revalidatePath("/");
  return { ok: true, message: "Vote removed." };
}

export async function suggestFilm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getProfile();
  if (!profile) return { ok: false, message: "Sign in with your TIU account first." };

  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!title) return { ok: false, message: "Enter a film title." };
  if (title.length > 200 || note.length > 500) return { ok: false, message: "That's too long." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("suggestions")
    .insert({ title, note: note || null, user_id: profile.id });

  if (error) {
    return {
      ok: false,
      message: "You already have 3 suggestions waiting for review. Try again after the club reviews them.",
    };
  }
  revalidatePath("/suggest");
  return { ok: true, message: `Thanks! The club will check "${title}" against the content rules.` };
}
