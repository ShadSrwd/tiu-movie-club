import type { Metadata } from "next";
import { getResults, getRoundMovies, getRounds } from "@/lib/data";
import { formatDate, formatDateTime, roundStatus } from "@/lib/format";
import type { Round } from "@/lib/types";
import { Poster } from "@/components/poster";
import { ResultsBars } from "@/components/results-bars";

export const metadata: Metadata = { title: "Past screenings" };

export default async function ResultsPage() {
  const rounds = (await getRounds()).filter((r) => roundStatus(r) === "closed").slice(0, 12);

  return (
    <div>
      <h1 className="font-display text-5xl tracking-wide">Past screenings</h1>
      <p className="mt-2 text-muted">Winners and final vote counts from previous rounds.</p>
      <div className="mt-8 space-y-6">
        {rounds.length ? (
          rounds.map((r) => <RoundResult key={r.id} round={r} />)
        ) : (
          <p className="text-muted">No finished rounds yet.</p>
        )}
      </div>
    </div>
  );
}

async function RoundResult({ round }: { round: Round }) {
  const [movies, results] = await Promise.all([getRoundMovies(round.id), getResults(round.id)]);
  const winner = movies.find((m) => m.id === round.winner_movie_id);
  const total = results.reduce((s, r) => s + r.vote_count, 0);

  return (
    <article className="grid gap-5 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[120px_1fr]">
      {winner ? (
        <Poster path={winner.poster_path} title={winner.title} className="w-24 sm:w-full" sizes="120px" />
      ) : (
        <div className="hidden sm:block" />
      )}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl tracking-wide">{round.title}</h2>
          <span className="text-xs text-muted">
            Voting closed {formatDate(round.closes_at)} · {total} vote{total === 1 ? "" : "s"}
          </span>
        </div>
        {winner ? (
          <p className="mt-1 text-sm">
            Winner: <span className="font-semibold text-gold">{winner.title}</span>
            {round.screening_at && (
              <span className="text-muted">
                {" "}· screened {formatDateTime(round.screening_at)}
                {round.location ? ` at ${round.location}` : ""}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">The club will announce the winner soon.</p>
        )}
        <div className="mt-4">
          <ResultsBars movies={movies} results={results} winnerId={round.winner_movie_id} />
        </div>
      </div>
    </article>
  );
}
