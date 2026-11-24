import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Suggestion } from "@/lib/types";
import { SignInButton } from "@/components/sign-in-button";
import { SuggestForm } from "@/components/suggest-form";

export const metadata: Metadata = { title: "Suggest a film" };

const STATUS_STYLE: Record<Suggestion["status"], string> = {
  pending: "bg-gold/15 text-gold",
  added: "bg-ok/15 text-ok",
  rejected: "bg-curtain/15 text-curtain",
};
const STATUS_LABEL: Record<Suggestion["status"], string> = {
  pending: "Waiting for review",
  added: "Added to catalog",
  rejected: "Doesn't fit the guidelines",
};

export default async function SuggestPage() {
  const profile = await getProfile();

  let mine: Suggestion[] = [];
  if (profile) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("suggestions")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    mine = (data ?? []) as Suggestion[];
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <section>
        <h1 className="font-display text-5xl tracking-wide">Suggest a film</h1>
        <p className="mt-2 text-muted">
          Want something in the catalog? Suggest it. The club checks every film against the university&apos;s
          content guidelines (parental guide, no 18+ scenes, no kissing or intimate scenes) before adding it.
        </p>
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          {profile ? (
            <SuggestForm />
          ) : (
            <div className="space-y-3">
              <p className="text-sm">Sign in with your TIU account to suggest a film.</p>
              <SignInButton next="/suggest" />
            </div>
          )}
        </div>
      </section>

      {profile && (
        <section>
          <h2 className="font-display text-3xl tracking-wide">Your suggestions</h2>
          {mine.length ? (
            <ul className="mt-4 space-y-2">
              {mine.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.title}</p>
                    {s.note && <p className="mt-0.5 text-sm text-muted">{s.note}</p>}
                    <p className="mt-1 text-xs text-muted">{formatDate(s.created_at)}</p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted">You haven&apos;t suggested anything yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
