import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "@fontsource/bebas-neue";
import "@fontsource-variable/inter";
import "./globals.css";
import { getProfile } from "@/lib/auth";
import { NavLinks } from "@/components/nav-links";

export const metadata: Metadata = {
  title: { default: "TIU Movie Club", template: "%s · TIU Movie Club" },
  description:
    "Browse the TIU Movie Club's approved films and vote for the next screening.",
};

async function UserMenu() {
  const profile = await getProfile();
  if (!profile) {
    return (
      <Link href="/login" className="btn btn-gold">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {profile.role === "admin" && (
        <Link href="/admin" className="text-sm font-semibold text-gold hover:underline">
          Admin
        </Link>
      )}
      <span className="hidden text-sm text-muted md:inline">
        {profile.full_name ?? profile.email}
      </span>
      <form action="/auth/signout" method="post">
        <button className="btn btn-ghost">Sign out</button>
      </form>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-ink/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-display text-3xl leading-none tracking-wide text-gold">
                TIU
              </span>
              <span className="font-display text-3xl leading-none tracking-wide">
                Movie Club
              </span>
            </Link>
            <NavLinks />
            <div className="ml-auto">
              <Suspense fallback={<div className="h-9 w-20" />}>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-line/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between">
            <p>TIU Movie Club · Every film is checked by the club before it appears here.</p>
            <p>
              Movie data and posters from{" "}
              <a href="https://www.themoviedb.org" className="underline hover:text-paper">
                TMDB
              </a>
              . This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
