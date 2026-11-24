"use client";

import { useOptimistic, useState, useTransition } from "react";
import { castVote, removeVote } from "@/app/actions";
import type { ActionState, Movie } from "@/lib/types";
import { Poster } from "./poster";
import { MovieMeta } from "./movie-meta";
import { SignInButton } from "./sign-in-button";

export function Ballot({
  roundId,
  movies,
  myVote,
  signedIn,
}: {
  roundId: number;
  movies: Movie[];
  myVote: number | null;
  signedIn: boolean;
}) {
  const [optimisticVote, setOptimisticVote] = useOptimistic(myVote);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ActionState>(null);

  function vote(movieId: number) {
    startTransition(async () => {
      setOptimisticVote(movieId);
      setStatus(await castVote(roundId, movieId));
    });
  }

  function unvote() {
    startTransition(async () => {
      setOptimisticVote(null);
      setStatus(await removeVote(roundId));
    });
  }

  return (
    <div>
      {!signedIn && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">Sign in with your TIU Teams account to cast your vote.</p>
          <SignInButton label="Sign in to vote" />
        </div>
      )}

      <p aria-live="polite" className={`mb-4 min-h-5 text-sm ${status?.ok === false ? "text-curtain" : "text-ok"}`}>
        {status?.message}
      </p>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {movies.map((m) => {
          const chosen = optimisticVote === m.id;
          return (
            <li
              key={m.id}
              className={`group flex flex-col rounded-xl border bg-surface p-2.5 transition-colors ${
                chosen ? "border-gold shadow-[0_0_0_1px_var(--color-gold),0_8px_30px_-8px_rgb(242_184_75/0.45)]" : "border-line"
              }`}
            >
              <div className="relative">
                <Poster path={m.poster_path} title={m.title} />
                {chosen && (
                  <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink">
                    ★ Your vote
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col px-1 pt-3">
                <h3 className="font-semibold leading-snug">{m.title}</h3>
                <div className="mt-1">
                  <MovieMeta movie={{ ...m, approved: false }} />
                </div>
                {m.overview && (
                  <details className="mt-2 text-sm text-muted">
                    <summary className="cursor-pointer select-none text-xs hover:text-paper">Synopsis</summary>
                    <p className="mt-1.5">{m.overview}</p>
                  </details>
                )}
                <div className="mt-auto pt-3">
                  {signedIn &&
                    (chosen ? (
                      <button onClick={unvote} disabled={pending} className="btn btn-ghost w-full">
                        Remove vote
                      </button>
                    ) : (
                      <button onClick={() => vote(m.id)} disabled={pending} className="btn btn-gold w-full">
                        {optimisticVote ? "Switch vote" : "Vote for this"}
                      </button>
                    ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
