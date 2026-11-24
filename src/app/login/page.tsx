import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { SignInButton } from "@/components/sign-in-button";

export const metadata: Metadata = { title: "Sign in" };

function safeNext(next: string | string[] | undefined) {
  const n = typeof next === "string" ? next : "/";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await getProfile()) redirect(next);

  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "tiu.edu.iq";

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8">
      <h1 className="font-display text-5xl tracking-wide">Sign in</h1>
      <p className="mt-3 text-muted">
        Use the same Microsoft account you use for Teams (<span className="text-paper">@{domain}</span>).
        Signing in lets you vote once per round and suggest films.
      </p>
      <div className="mt-6">
        <SignInButton next={next} />
      </div>
      <p className="mt-6 text-xs text-muted">
        We only see your name and university email. Your vote is private. Only the totals are shown
        after voting closes.
      </p>
    </div>
  );
}
