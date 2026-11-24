import { runtimeLabel } from "@/lib/format";
import type { Movie } from "@/lib/types";

export function MovieMeta({ movie }: { movie: Movie }) {
  const bits = [movie.release_year, runtimeLabel(movie.runtime)].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      {bits.length > 0 && <span>{bits.join(" · ")}</span>}
      {movie.certification && (
        <span className="rounded border border-line px-1.5 py-px font-semibold text-paper/80">
          {movie.certification}
        </span>
      )}
      {movie.approved && (
        <span className="rounded bg-ok/15 px-1.5 py-px font-semibold text-ok">Club approved</span>
      )}
    </div>
  );
}
