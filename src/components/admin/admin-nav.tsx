"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/movies", label: "Movies" },
  { href: "/admin/rounds", label: "Rounds" },
  { href: "/admin/suggestions", label: "Suggestions" },
  { href: "/admin/team", label: "Team" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active ? "bg-gold font-semibold text-ink" : "text-muted hover:text-paper"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
