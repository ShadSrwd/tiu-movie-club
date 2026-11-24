"use client";

import { useActionState, useState } from "react";
import { createRound } from "@/app/admin/actions";
import type { ActionState, Movie } from "@/lib/types";

export function CreateRoundForm({
  movies,
  shownIds,
  defaults,
}: {
  movies: Movie[];
  shownIds: number[];
  defaults: { title: string; opens_at: string; closes_at: string };
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await createRound(prev, formData);
    if (result?.ok) setSelected(new Set());
    return result;
  }, null);

  const shown = new Set(shownIds);
  const visible = movies.filter((m) => m.title.toLowerCase().includes(filter.trim().toLowerCase()));

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!movies.length) {
    return <p className="text-sm text-muted">Approve some films on the Movies page first.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="r-title">Title</label>
        <input id="r-title" name="title" defaultValue={defaults.title} required className="input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="r-open">Voting opens</label>
          <input id="r-open" type="datetime-local" name="opens_at" defaultValue={defaults.opens_at} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="r-close">Voting closes</label>
          <input id="r-close" type="datetime-local" name="closes_at" defaultValue={defaults.closes_at} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="r-screen">Screening (optional)</label>
          <input id="r-screen" type="datetime-local" name="screening_at" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="r-loc">Location (optional)</label>
          <input id="r-loc" name="location" placeholder="e.g. Hall B-201" className="input" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">Times are Baghdad time (UTC+3).</p>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="label">Shortlist</span>
          <span className={`text-xs ${selected.size >= 2 ? "text-ok" : "text-muted"}`}>
            {selected.size} selected · 4–6 works best
          </span>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter approved films…"
          className="input mb-2"
          aria-label="Filter approved films"
        />
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-line p-1">
          {visible.map((m) => (
            <li key={m.id}>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  selected.has(m.id) ? "bg-gold/10" : "hover:bg-raised"
                }`}
              >
                <input
                  type="checkbox"
                  name="movie_ids"
                  value={m.id}
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  className="accent-[var(--color-gold)]"
                />
                <span className="flex-1 truncate">{m.title}</span>
                {m.release_year && <span className="text-xs text-muted">{m.release_year}</span>}
                {shown.has(m.id) && <span className="rounded bg-raised px-1.5 text-[10px] text-muted">shown before</span>}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button disabled={pending || selected.size < 2} className="btn btn-gold w-full">
        {pending ? "Creating…" : "Create round"}
      </button>
      <p aria-live="polite" className={`text-sm ${state?.ok ? "text-ok" : "text-curtain"}`}>{state?.message}</p>
    </form>
  );
}
