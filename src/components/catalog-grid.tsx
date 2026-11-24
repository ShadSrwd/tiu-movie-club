"use client";

import { useMemo, useState } from "react";
import type { Movie } from "@/lib/types";
import { Poster } from "./poster";
import { MovieMeta } from "./movie-meta";

export function CatalogGrid({ movies }: { movies: Movie[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  const genres = useMemo(
    () => [...new Set(movies.flatMap((m) => m.genres))].sort(),
    [movies],
  );

  const shown = movies.filter((m) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || m.title.toLowerCase().includes(q);
    const matchesGenre = !genre || m.genres.includes(genre);
    return matchesQuery && matchesGenre;
  });

  return (
    <div>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title…"
          className="input max-w-sm"
          aria-label="Search films"
        />
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Chip active={!genre} onClick={() => setGenre(null)}>All</Chip>
            {genres.map((g) => (
              <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
                {g}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">{shown.length} of {movies.length} films</p>

      <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map((m) => (
          <li key={m.id} className="flex flex-col">
            <Poster path={m.poster_path} title={m.title} sizes="(max-width: 640px) 50vw, 200px" />
            <h3 className="mt-2 font-semibold leading-snug">{m.title}</h3>
            <div className="mt-1">
              <MovieMeta movie={m} />
            </div>
            {m.genres.length > 0 && <p className="mt-1 text-xs text-muted">{m.genres.slice(0, 3).join(", ")}</p>}
            {m.overview && (
              <details className="mt-1.5 text-sm text-muted">
                <summary className="cursor-pointer select-none text-xs hover:text-paper">Synopsis</summary>
                <p className="mt-1.5">{m.overview}</p>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? "border-gold bg-gold text-ink" : "border-line text-muted hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}
