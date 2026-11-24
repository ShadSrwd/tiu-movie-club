"use client";

import { useActionState, useEffect, useRef } from "react";
import { suggestFilm } from "@/app/actions";
import type { ActionState } from "@/lib/types";

export function SuggestForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(suggestFilm, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div>
        <label htmlFor="title" className="label">Film title</label>
        <input id="title" name="title" required maxLength={200} className="input" placeholder="e.g. Paddington 2" />
      </div>
      <div>
        <label htmlFor="note" className="label">Why should we show it? (optional)</label>
        <textarea id="note" name="note" maxLength={500} rows={3} className="input" />
      </div>
      <button disabled={pending} className="btn btn-gold">
        {pending ? "Sending…" : "Send suggestion"}
      </button>
      <p aria-live="polite" className={`text-sm ${state?.ok ? "text-ok" : "text-curtain"}`}>
        {state?.message}
      </p>
    </form>
  );
}
