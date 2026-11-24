import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getResults, getRoundMovies, getRounds } from "@/lib/data";
import { formatDateTime, roundStatus } from "@/lib/format";
import { ResultsBars } from "@/components/results-bars";
import { declareWinner, endVotingNow } from "./actions";
import { ConfirmButton, SubmitButton } from "@/components/admin/confirm-button";

export default async function AdminOverview() {
  const supabase = await createClient();
  const [approved, pending, suggestions, rounds] = await Promise.all([
    supabase.from("movies").select("id", { count: "exact", head: true }).eq("approved", true),
    supabase.from("movies").select("id", { count: "exact", head: true }).eq("approved", false),
    supabase.from("suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    getRounds(),
  ]);

  const open = rounds.find((r) => roundStatus(r) === "open");
  const needsWinner = rounds.find((r) => roundStatus(r) === "closed" && !r.winner_movie_id);
  const upcoming = rounds.find((r) => roundStatus(r) === "upcoming");
  const focus = open ?? needsWinner;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Approved films" value={approved.count ?? 0} href="/admin/movies?tab=approved" />
        <Stat label="Waiting for vetting" value={pending.count ?? 0} href="/admin/movies" highlight={(pending.count ?? 0) > 0} />
        <Stat label="New suggestions" value={suggestions.count ?? 0} href="/admin/suggestions" highlight={(suggestions.count ?? 0) > 0} />
        <Stat label="Rounds so far" value={rounds.length} href="/admin/rounds" />
      </div>

      {focus ? (
        <FocusRound roundId={focus.id} title={focus.title} closesAt={focus.closes_at} isOpen={focus === open} />
      ) : (
        <div className="rounded-2xl border border-dashed border-line p-6">
          <p className="font-semibold">No round is open right now.</p>
          <p className="mt-1 text-sm text-muted">
            {upcoming
              ? `${upcoming.title} opens ${formatDateTime(upcoming.opens_at)}.`
              : "Create the next round to start a new two-week vote."}
          </p>
          <Link href="/admin/rounds" className="btn btn-gold mt-4">Create a round</Link>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
        <h2 className="font-display text-2xl tracking-wide">Every two weeks</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted">
          <li><span className="text-paper">Vet new films</span>: open Movies, check the Parents Guide link, write notes, approve.</li>
          <li><span className="text-paper">Create the round</span>: pick 4–6 approved films, set the voting dates and screening time.</li>
          <li><span className="text-paper">Share the link</span> with students on Teams and the club&apos;s social media.</li>
          <li><span className="text-paper">When voting closes</span>: declare the winner here. Results appear on the public site.</li>
        </ol>
      </div>
    </div>
  );
}

async function FocusRound({ roundId, title, closesAt, isOpen }: { roundId: number; title: string; closesAt: string; isOpen: boolean }) {
  const [movies, results] = await Promise.all([getRoundMovies(roundId), getResults(roundId)]);
  const total = results.reduce((s, r) => s + r.vote_count, 0);
  const top = results[0];
  const tie = results.length > 1 && top && results[1].vote_count === top.vote_count && top.vote_count > 0;

  return (
    <section className="rounded-2xl border border-gold/40 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            {isOpen ? "Live results (only admins see these)" : "Voting closed: pick the winner"}
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide">{title}</h2>
          <p className="text-sm text-muted">
            {total} vote{total === 1 ? "" : "s"} · {isOpen ? "closes" : "closed"} {formatDateTime(closesAt)}
          </p>
        </div>
        {isOpen && (
          <form action={endVotingNow}>
            <input type="hidden" name="round_id" value={roundId} />
            <ConfirmButton className="btn btn-ghost" message="End voting now? Students won't be able to vote anymore.">
              End voting now
            </ConfirmButton>
          </form>
        )}
      </div>
      {tie && !isOpen && (
        <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">
          It&apos;s a tie at the top. Choose the winner yourself (or hold a quick tiebreak vote).
        </p>
      )}
      <div className="mt-5">
        <ResultsBars movies={movies} results={results} winnerId={null}>
          {(m) => (
            <form action={declareWinner}>
              <input type="hidden" name="round_id" value={roundId} />
              <input type="hidden" name="movie_id" value={m.id} />
              <SubmitButton className="btn btn-ghost px-2.5 py-1 text-xs">Declare winner</SubmitButton>
            </form>
          )}
        </ResultsBars>
      </div>
      {isOpen && (
        <p className="mt-4 text-xs text-muted">Declaring a winner also ends voting for this round.</p>
      )}
    </section>
  );
}

function Stat({ label, value, href, highlight }: { label: string; value: number; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`rounded-xl border bg-surface p-4 transition-colors hover:border-muted ${highlight ? "border-gold/50" : "border-line"}`}>
      <div className={`font-display text-4xl leading-none ${highlight ? "text-gold" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </Link>
  );
}
