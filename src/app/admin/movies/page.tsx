import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Movie } from "@/lib/types";
import { Poster } from "@/components/poster";
import { MovieMeta } from "@/components/movie-meta";
import { TmdbSearch } from "@/components/admin/tmdb-search";
import { ManualAddForm } from "@/components/admin/manual-add-form";
import { ConfirmButton, SubmitButton } from "@/components/admin/confirm-button";
import { deleteMovie, saveNotes, setApproved } from "../actions";

export default async function AdminMoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab = "pending", q = "" } = await searchParams;
  const approvedTab = tab === "approved";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("approved", approvedTab)
    .order(approvedTab ? "title" : "created_at", { ascending: approvedTab });
  if (error) throw new Error(error.message);
  const movies = (data ?? []) as Movie[];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="space-y-6">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-2xl tracking-wide">Add a film</h2>
          <p className="mt-1 text-sm text-muted">
            Search TMDB. New films go to <em>Pending review</em> until someone vets and approves them.
          </p>
          <div className="mt-4">
            <TmdbSearch initialQuery={q} />
          </div>
        </div>
        <details className="rounded-2xl border border-line bg-surface p-5">
          <summary className="cursor-pointer text-sm font-semibold">Add manually (no TMDB)</summary>
          <div className="mt-4">
            <ManualAddForm />
          </div>
        </details>
      </section>

      <section>
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1 text-sm">
          <TabLink href="/admin/movies" active={!approvedTab}>Pending review</TabLink>
          <TabLink href="/admin/movies?tab=approved" active={approvedTab}>Approved</TabLink>
        </div>

        {!approvedTab && (
          <p className="mt-4 rounded-lg border border-line bg-raised/60 px-3 py-2 text-xs text-muted">
            Before approving: read the film&apos;s <strong className="text-paper">IMDb Parents Guide</strong>{" "}
            (sex &amp; nudity, violence, profanity, frightening scenes), and note any scene that must be skipped.
            The age rating is only a hint.
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {movies.map((m) => (
            <li key={m.id} className="flex gap-4 rounded-xl border border-line bg-surface p-3">
              <Poster path={m.poster_path} title={m.title} size="w185" className="w-20 shrink-0" sizes="80px" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{m.title}</h3>
                    <div className="mt-1">
                      <MovieMeta movie={m} />
                    </div>
                    {m.genres.length > 0 && <p className="mt-1 text-xs text-muted">{m.genres.join(", ")}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {m.imdb_id && (
                      <a
                        href={`https://www.imdb.com/title/${m.imdb_id}/parentalguide`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost px-2.5 py-1 text-xs"
                      >
                        Parents Guide ↗
                      </a>
                    )}
                    {m.tmdb_id && (
                      <a
                        href={`https://www.themoviedb.org/movie/${m.tmdb_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost px-2.5 py-1 text-xs"
                      >
                        TMDB ↗
                      </a>
                    )}
                  </div>
                </div>

                <form action={saveNotes} className="mt-3 flex gap-2">
                  <input type="hidden" name="movie_id" value={m.id} />
                  <input
                    name="content_notes"
                    defaultValue={m.content_notes ?? ""}
                    placeholder="Vetting notes, e.g. 'Clean' or 'Skip 1:12:30–1:13:10'"
                    className="input py-1.5 text-xs"
                    aria-label={`Vetting notes for ${m.title}`}
                  />
                  <SubmitButton className="btn btn-ghost px-2.5 py-1 text-xs">Save</SubmitButton>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={setApproved}>
                    <input type="hidden" name="movie_id" value={m.id} />
                    <input type="hidden" name="approved" value={m.approved ? "false" : "true"} />
                    {m.approved ? (
                      <ConfirmButton
                        className="btn btn-ghost px-2.5 py-1 text-xs"
                        message={`Remove "${m.title}" from the public catalog?`}
                      >
                        Unapprove
                      </ConfirmButton>
                    ) : (
                      <SubmitButton className="btn btn-gold px-2.5 py-1 text-xs">✓ Approve</SubmitButton>
                    )}
                  </form>
                  <form action={deleteMovie}>
                    <input type="hidden" name="movie_id" value={m.id} />
                    <ConfirmButton
                      className="btn btn-danger px-2.5 py-1 text-xs"
                      message={`Delete "${m.title}"? It will also be removed from any rounds and their votes.`}
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                  {m.approved_at && (
                    <span className="text-xs text-muted">Approved {formatDate(m.approved_at)}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
          {!movies.length && (
            <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              {approvedTab ? "No approved films yet." : "Nothing waiting for review."}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-md px-3 py-1.5 text-center transition-colors ${
        active ? "bg-raised font-semibold text-paper" : "text-muted hover:text-paper"
      }`}
    >
      {children}
    </Link>
  );
}
