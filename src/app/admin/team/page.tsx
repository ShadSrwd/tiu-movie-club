import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { AddAdminForm } from "@/components/admin/add-admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { removeAdmin } from "../actions";

export default async function AdminTeamPage() {
  const me = await getProfile();
  const supabase = await createClient();
  const [{ data: admins }, { count: members }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role").eq("role", "admin").order("email"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="font-display text-2xl tracking-wide">Club admins</h2>
        <p className="mt-1 text-sm text-muted">{members ?? 0} students have signed in so far.</p>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {((admins ?? []) as Profile[]).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.full_name ?? a.email}</p>
                <p className="truncate text-xs text-muted">{a.email}</p>
              </div>
              {a.id === me?.id ? (
                <span className="text-xs text-muted">You</span>
              ) : (
                <form action={removeAdmin}>
                  <input type="hidden" name="user_id" value={a.id} />
                  <ConfirmButton className="btn btn-danger px-2.5 py-1 text-xs" message={`Remove ${a.email} as admin?`}>
                    Remove
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5 lg:self-start">
        <h2 className="font-display text-2xl tracking-wide">Add an admin</h2>
        <p className="mt-1 text-sm text-muted">They must sign in to the site once before you can add them.</p>
        <div className="mt-4">
          <AddAdminForm />
        </div>
      </section>
    </div>
  );
}
