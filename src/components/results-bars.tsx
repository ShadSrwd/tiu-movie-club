import type { Movie, ResultRow } from "@/lib/types";

export function ResultsBars({
  movies,
  results,
  winnerId,
  children,
}: {
  movies: Movie[];
  results: ResultRow[];
  winnerId: number | null;
  /** Optional per-row extra (e.g. an admin "Declare winner" button) */
  children?: (movie: Movie) => React.ReactNode;
}) {
  const counts = new Map(results.map((r) => [r.movie_id, r.vote_count]));
  const total = results.reduce((s, r) => s + r.vote_count, 0);
  const max = Math.max(1, ...results.map((r) => r.vote_count));
  const rows = [...movies].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

  return (
    <ul className="space-y-2.5">
      {rows.map((m) => {
        const n = counts.get(m.id) ?? 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        const winner = winnerId === m.id;
        return (
          <li key={m.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className={`truncate ${winner ? "font-semibold text-gold" : ""}`}>
                  {winner && "★ "}
                  {m.title}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {n} vote{n === 1 ? "" : "s"} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-raised">
                <div
                  className={`h-full rounded-full ${winner ? "bg-gold" : "bg-muted/50"}`}
                  style={{ width: `${(n / max) * 100}%` }}
                />
              </div>
            </div>
            {children?.(m)}
          </li>
        );
      })}
    </ul>
  );
}
