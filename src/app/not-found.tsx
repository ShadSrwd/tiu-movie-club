import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-display text-8xl tracking-wide text-gold">404</p>
      <p className="mt-2 text-muted">This reel is missing.</p>
      <Link href="/" className="btn btn-gold mt-6">Back to voting</Link>
    </div>
  );
}
