import Image from "next/image";
import { posterUrl } from "@/lib/format";

export function Poster({
  path,
  title,
  size = "w342",
  className = "",
  sizes = "(max-width: 640px) 50vw, 240px",
  priority = false,
}: {
  path: string | null;
  title: string;
  size?: "w185" | "w342" | "w500";
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const url = posterUrl(path, size);
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-lg bg-raised ${className}`}>
      {url ? (
        <Image src={url} alt={`${title} poster`} fill sizes={sizes} className="object-cover" priority={priority} />
      ) : (
        <div className="flex h-full items-end bg-gradient-to-br from-raised via-surface to-ink p-3">
          <span className="font-display text-2xl leading-tight tracking-wide text-muted">{title}</span>
        </div>
      )}
    </div>
  );
}
