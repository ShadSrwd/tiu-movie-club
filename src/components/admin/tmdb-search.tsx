"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { addFromTmdb, searchTmdb } from "@/app/admin/actions";
import { posterUrl } from "@/lib/format";
import type { ActionState } from "@/lib/types";
import type { TmdbSearchResult } from "@/lib/tmdb";

type Result = TmdbSearchResult & { added: boolean };

export function TmdbSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ActionState>(null);
  const [searching, startSearch] = useTransition();
  const [adding, startAdd] = useTransition();
  const [addingId, setAddingId] = useState<number | null>(null);

  function run(q: string) {
    startSearch(async () => {
      const res = await searchTmdb(q);
      setResults(res.results);
      setError(res.error ?? null);
    });
  }

  useEffect(() => {
    if (initialQuery) run(initialQuery);
  }, [initialQuery]);

  function add(id: number) {
    setAddingId(id);
    startAdd(async () => {
      const res = await addFromTmdb(id);
      setStatus(res);
      if (res?.ok) setResults((rs) => rs.map((r) => (r.id === id ? { ...r, added: true } : r)));
      setAddingId(null);
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Film title…"
          className="input"
          aria-label="Search TMDB"
        />
        <button className="btn btn-gold" disabled={searching || !query.trim()}>
          {searching ? "…" : "Search"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-curtain">{error}</p>}
      <p aria-live="polite" className={`mt-3 min-h-5 text-sm ${status?.ok ? "text-ok" : "text-curtain"}`}>
        {status?.message}
      </p>

      <ul className="mt-2 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
        {results.map((r) => {
          const url = posterUrl(r.poster_path, "w185");
          return (
            <li key={r.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink/50 p-2">
              <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded bg-raised">
                {url && <Image src={url} alt="" fill sizes="40px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted">{r.release_date?.slice(0, 4) || "Unknown year"}</p>
              </div>
              {r.added ? (
                <span className="text-xs text-ok">In list</span>
              ) : (
                <button onClick={() => add(r.id)} disabled={adding} className="btn btn-ghost px-2.5 py-1 text-xs">
                  {addingId === r.id ? "Adding…" : "Add"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
