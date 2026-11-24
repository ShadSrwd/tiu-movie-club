import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { SignInButton } from "@/components/sign-in-button";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8">
        <h1 className="font-display text-4xl tracking-wide">Admin area</h1>
        <p className="mt-2 text-muted">Sign in with your TIU account to continue.</p>
        <div className="mt-5">
          <SignInButton next="/admin" />
        </div>
      </div>
    );
  }
  if (profile.role !== "admin") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8">
        <h1 className="font-display text-4xl tracking-wide">Admins only</h1>
        <p className="mt-2 text-muted">
          You&apos;re signed in as {profile.email}, which isn&apos;t a Movie Club admin. Ask an existing admin to add
          you on the Team page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <h1 className="font-display text-4xl tracking-wide">
          Club <span className="text-gold">admin</span>
        </h1>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
