"use client";

import { useSyncExternalStore } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  // Ticks once per second on the client; renders "--" on the server.
  const nowSec = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 1000), () => null);
  const now = nowSec === null ? null : nowSec * 1000;

  const p = parts(now === null ? 0 : target - now);
  const units: [number, string][] = [
    [p.d, "days"],
    [p.h, "hrs"],
    [p.m, "min"],
    [p.s, "sec"],
  ];

  return (
    <div className="flex gap-2" aria-label="Time left to vote" suppressHydrationWarning>
      {units.map(([v, label]) => (
        <div key={label} className="min-w-14 rounded-lg border border-line bg-ink/70 px-2 py-1.5 text-center">
          <div className="font-display text-3xl leading-none tabular-nums">
            {now === null ? "--" : v.toString().padStart(2, "0")}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
        </div>
      ))}
    </div>
  );
}
