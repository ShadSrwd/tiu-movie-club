import { createClient } from "@/lib/supabase/server";
import { getResults, getRoundMovies, getRounds } from "@/lib/data";
import { formatDateTime, isoToLocalInput, roundStatus } from "@/lib/format";
import type { Movie, Round, RoundStatus } from "@/lib/types";
import { ResultsBars } from "@/components/results-bars";
import { CreateRoundForm } from "@/components/admin/create-round-form";
import { ConfirmButton, SubmitButton } from "@/components/admin/confirm-button";
import { clearWinner, declareWinner, deleteRound, endVotingNow, updateScreening } from "../actions";

const STATUS: Record<RoundStatus, { label: string; cls: string }> = {
  open: { label: "Voting open", cls: "bg-ok/15 text-ok" },
  upcoming: { label: "Upcoming", cls: "bg-gold/15 text-gold" },
  closed: { label: "Closed", cls: "bg-raised text-muted" },
};

export default async function AdminRoundsPage() {
  const supabase = await createClient();
  const [rounds, { data: approved }] = await Promise.all([
    getRounds(),
    supabase.from("movies").select("*").eq("approved", true).order("title"),
  ]);

  // Suggest dates for the next round: starts when the latest one closes (or now), runs 14 days.
  const latestClose = rounds.length ? new Date(Math.max(...rounds.map((r) => +new Date(r.closes_at)))) : null;
  const start = latestClose && latestClose > new Date() ? latestClose : new Date();
  const end = new Date(start.getTime() + 14 * 24 * 3600 * 1000);

  // Films already shown (winners) are flagged so you don't repeat them by accident.
  const shownIds = rounds.map((r) => r.winner_movie_id).filter((x): x is number => Boolean(x));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-2xl tracking-wide">New round</h2>
        <div className="mt-4">
          <CreateRoundForm
            movies={(approved ?? []) as Movie[]}
            shownIds={shownIds}
            defaults={{
              title: `Round ${rounds.length + 1}`,
              opens_at: isoToLocalInput(start),
              closes_at: isoToLocalInput(end),
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-wide">All rounds</h2>
        {rounds.map((r) => (
          <RoundCard key={r.id} round={r} />
        ))}
        {!rounds.length && <p className="text-sm text-muted">No rounds yet. Create the first one.</p>}
      </section>
    </div>
  );
}

async function RoundCard({ round }: { round: Round }) {
  const status = roundStatus(round);
  const [movies, results] = await Promise.all([getRoundMovies(round.id), getResults(round.id)]);
  const total = results.reduce((s, r) => s + r.vote_count, 0);
  const winner = movies.find((m) => m.id === round.winner_movie_id);

  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl tracking-wide">{round.title}</h3>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
          </div>
          <p className="text-xs text-muted">
            {formatDateTime(round.opens_at)} → {formatDateTime(round.closes_at)} · {total} vote{total === 1 ? "" : "s"}
          </p>
          {winner && (
            <p className="mt-1 text-sm">
              Winner: <span className="font-semibold text-gold">{winner.title}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "open" && (
            <form action={endVotingNow}>
              <input type="hidden" name="round_id" value={round.id} />
              <ConfirmButton className="btn btn-ghost px-2.5 py-1 text-xs" message="End voting now?">
                End voting now
              </ConfirmButton>
            </form>
          )}
          {winner && (
            <form action={clearWinner}>
              <input type="hidden" name="round_id" value={round.id} />
              <ConfirmButton
                className="btn btn-ghost px-2.5 py-1 text-xs"
                message="Clear the winner? If the voting window hasn't ended, voting reopens."
              >
                Clear winner
              </ConfirmButton>
            </form>
          )}
          <form action={deleteRound}>
            <input type="hidden" name="round_id" value={round.id} />
            <ConfirmButton
              className="btn btn-danger px-2.5 py-1 text-xs"
              message={`Delete "${round.title}" and all its votes? This can't be undone.`}
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      <div className="mt-4">
        <ResultsBars movies={movies} results={results} winnerId={round.winner_movie_id}>
          {(m) =>
            status !== "upcoming" && !round.winner_movie_id ? (
              <form action={declareWinner}>
                <input type="hidden" name="round_id" value={round.id} />
                <input type="hidden" name="movie_id" value={m.id} />
                <SubmitButton className="btn btn-ghost px-2 py-0.5 text-xs">Winner</SubmitButton>
              </form>
            ) : null
          }
        </ResultsBars>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs text-muted hover:text-paper">
          Screening: {round.screening_at ? formatDateTime(round.screening_at) : "not set"}
          {round.location ? ` · ${round.location}` : ""} (edit)
        </summary>
        <form action={updateScreening} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="round_id" value={round.id} />
          <div>
            <label className="label" htmlFor={`s-at-${round.id}`}>Screening time</label>
            <input
              id={`s-at-${round.id}`}
              type="datetime-local"
              name="screening_at"
              defaultValue={round.screening_at ? isoToLocalInput(round.screening_at) : ""}
              className="input"
            />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor={`s-loc-${round.id}`}>Location</label>
            <input id={`s-loc-${round.id}`} name="location" defaultValue={round.location ?? ""} className="input" />
          </div>
          <SubmitButton>Save</SubmitButton>
        </form>
      </details>
    </article>
  );
}
