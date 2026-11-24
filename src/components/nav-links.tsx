"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Vote" },
  { href: "/catalog", label: "Catalog" },
  { href: "/results", label: "Past screenings" },
  { href: "/suggest", label: "Suggest a film" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="order-last flex w-full gap-5 overflow-x-auto text-sm sm:order-none sm:w-auto">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap py-1 transition-colors ${
              active ? "text-paper" : "text-muted hover:text-paper"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {l.label}
            {active && <span className="mt-0.5 block h-0.5 rounded bg-gold" />}
          </Link>
        );
      })}
    </nav>
  );
}
