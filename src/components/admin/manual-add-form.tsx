"use client";

import { useActionState } from "react";
import { addManual } from "@/app/admin/actions";
import type { ActionState } from "@/lib/types";

export function ManualAddForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addManual, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="m-title">Title</label>
        <input id="m-title" name="title" required className="input" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label" htmlFor="m-year">Year</label>
          <input id="m-year" name="release_year" type="number" min={1900} max={2100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="m-runtime">Minutes</label>
          <input id="m-runtime" name="runtime" type="number" min={1} max={400} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="m-cert">Rating</label>
          <input id="m-cert" name="certification" placeholder="PG" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="m-overview">Synopsis</label>
        <textarea id="m-overview" name="overview" rows={3} className="input" />
      </div>
      <button disabled={pending} className="btn btn-gold">{pending ? "Adding…" : "Add film"}</button>
      <p aria-live="polite" className={`text-sm ${state?.ok ? "text-ok" : "text-curtain"}`}>{state?.message}</p>
    </form>
  );
}
