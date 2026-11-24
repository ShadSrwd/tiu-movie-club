import type { Round, RoundStatus } from "./types";

// The club runs in Sulaymaniyah, so every date is shown in Baghdad time (UTC+3, no DST).
export const CLUB_TZ = "Asia/Baghdad";
const CLUB_OFFSET = "+03:00";

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** "2026-11-24T19:00" (Baghdad wall-clock, from <input type="datetime-local">) → ISO string */
export function localInputToIso(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value.length === 16 ? value + ":00" : value}${CLUB_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string → "2026-11-24T19:00" in Baghdad time, for datetime-local inputs */
export function isoToLocalInput(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function roundStatus(round: Round, now = new Date()): RoundStatus {
  if (round.winner_movie_id) return "closed";
  const t = now.getTime();
  if (t < new Date(round.opens_at).getTime()) return "upcoming";
  if (t >= new Date(round.closes_at).getTime()) return "closed";
  return "open";
}

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function runtimeLabel(minutes: number | null | undefined) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}
