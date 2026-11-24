import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** The signed-in user's profile, or null. Cached for the duration of one request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Only Movie Club admins can do this.");
  }
  return profile;
}
