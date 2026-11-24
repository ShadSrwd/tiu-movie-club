import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "tiu.edu.iq";
  const blocked = reason && /database error|only @/i.test(reason);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8">
      <h1 className="font-display text-5xl tracking-wide text-curtain">Couldn&apos;t sign you in</h1>
      {blocked ? (
        <p className="mt-3 text-muted">
          Only TIU accounts (<span className="text-paper">@{domain}</span>) can join the Movie Club.
          Sign out of any personal Microsoft account and try again with your Teams account.
        </p>
      ) : (
        <p className="mt-3 text-muted">
          Something went wrong during sign-in{reason ? `: ${reason}` : "."} Please try again.
        </p>
      )}
      <Link href="/login" className="btn btn-gold mt-6">
        Try again
      </Link>
    </div>
  );
}
