import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Suggestion } from "@/lib/types";
import { ConfirmButton, SubmitButton } from "@/components/admin/confirm-button";
import { deleteSuggestion, setSuggestionStatus } from "../actions";

type Row = Suggestion & { profile: { email: string; full_name: string | null } | null };

export default async function AdminSuggestionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("*, profile:profiles(email, full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-2xl tracking-wide">Waiting for review ({pending.length})</h2>
        <ul className="mt-3 space-y-2">
          {pending.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{s.title}</p>
                {s.note && <p className="text-sm text-muted">&ldquo;{s.note}&rdquo;</p>}
                <p className="mt-0.5 text-xs text-muted">
                  {s.profile?.full_name ?? s.profile?.email} · {formatDate(s.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/movies?q=${encodeURIComponent(s.title)}`} className="btn btn-ghost px-2.5 py-1 text-xs">
                  Find on TMDB
                </Link>
                <StatusForm id={s.id} status="added" label="Mark added" cls="btn btn-gold px-2.5 py-1 text-xs" />
                <StatusForm id={s.id} status="rejected" label="Reject" cls="btn btn-danger px-2.5 py-1 text-xs" />
              </div>
            </li>
          ))}
          {!pending.length && <li className="text-sm text-muted">No new suggestions.</li>}
        </ul>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="font-display text-2xl tracking-wide">Reviewed</h2>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {done.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="truncate">{s.title}</span>
                <div className="flex items-center gap-2">
                  <span className={s.status === "added" ? "text-ok" : "text-curtain"}>{s.status}</span>
                  <StatusForm id={s.id} status="pending" label="Undo" cls="btn btn-ghost px-2 py-0.5 text-xs" />
                  <form action={deleteSuggestion}>
                    <input type="hidden" name="suggestion_id" value={s.id} />
                    <ConfirmButton className="btn btn-ghost px-2 py-0.5 text-xs" message="Delete this suggestion?">
                      ✕
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusForm({ id, status, label, cls }: { id: number; status: string; label: string; cls: string }) {
  return (
    <form action={setSuggestionStatus}>
      <input type="hidden" name="suggestion_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton className={cls}>{label}</SubmitButton>
    </form>
  );
}
