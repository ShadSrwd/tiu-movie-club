"use client";

import { useActionState } from "react";
import { addAdmin } from "@/app/admin/actions";
import type { ActionState } from "@/lib/types";

export function AddAdminForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAdmin, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="admin-email">University email</label>
        <input id="admin-email" name="email" type="email" required className="input" placeholder="name@tiu.edu.iq" />
      </div>
      <button disabled={pending} className="btn btn-gold">{pending ? "Adding…" : "Make admin"}</button>
      <p aria-live="polite" className={`text-sm ${state?.ok ? "text-ok" : "text-curtain"}`}>{state?.message}</p>
    </form>
  );
}
