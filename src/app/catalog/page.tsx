import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Movie } from "@/lib/types";
import { CatalogGrid } from "@/components/catalog-grid";

export const metadata: Metadata = { title: "Catalog" };

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("approved", true)
    .order("title");
  if (error) throw new Error(error.message);
  const movies = (data ?? []) as Movie[];

  return (
    <div>
      <h1 className="font-display text-5xl tracking-wide">The catalog</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every film here has been checked by the club against the university&apos;s content guidelines
        (no 18+ material, no romantic or intimate scenes). Each round&apos;s shortlist is picked from this list.
      </p>
      <div className="mt-8">
        {movies.length ? (
          <CatalogGrid movies={movies} />
        ) : (
          <p className="text-muted">No films approved yet.</p>
        )}
      </div>
    </div>
  );
}
