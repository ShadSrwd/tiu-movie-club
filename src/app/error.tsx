"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8">
      <h1 className="font-display text-4xl tracking-wide text-curtain">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">{error.message || "Please try again in a moment."}</p>
      <button onClick={reset} className="btn btn-gold mt-6">Try again</button>
    </div>
  );
}
