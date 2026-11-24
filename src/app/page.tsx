import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { getMovie, getMyVote, getRoundMovies, getRounds, getVoterCount } from "@/lib/data";
import { formatDateTime, roundStatus } from "@/lib/format";
import type { Round } from "@/lib/types";
import { Ballot } from "@/components/ballot";
import { Countdown } from "@/components/countdown";
import { Poster } from "@/components/poster";
import { MovieMeta } from "@/components/movie-meta";

export default async function HomePage() {
  const [rounds, profile] = await Promise.all([getRounds(), getProfile()]);
  const now = new Date();

  const open = rounds.find((r) => roundStatus(r, now) === "open");
  const upcoming = rounds
    .filter((r) => roundStatus(r, now) === "upcoming")
    .sort((a, b) => +new Date(a.opens_at) - +new Date(b.opens_at))[0];
  const lastWinnerRound = rounds.find((r) => r.winner_movie_id);

  return (
    <div className="space-y-12">
      {open ? (
        <OpenRound round={open} userId={profile?.id ?? null} />
      ) : (
        <NoOpenRound upcoming={upcoming} />
      )}
      {lastWinnerRound && <UpNext round={lastWinnerRound} />}
    </div>
  );
}

async function OpenRound({ round, userId }: { round: Round; userId: string | null }) {
  const [movies, voters, myVote] = await Promise.all([
    getRoundMovies(round.id),
    getVoterCount(round.id),
    userId ? getMyVote(round.id, userId) : Promise.resolve(null),
  ]);

  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="marquee-bulbs" />
        <div className="flex flex-col gap-6 px-6 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Now voting</p>
            <h1 className="mt-1 font-display text-5xl leading-none tracking-wide sm:text-6xl">{round.title}</h1>
            <p className="mt-3 max-w-xl text-muted">
              Pick the film you want to watch next. One vote per student. You can change it until voting closes.
            </p>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <dt className="inline text-muted">Voting closes </dt>
                <dd className="inline">{formatDateTime(round.closes_at)}</dd>
              </div>
              {round.screening_at && (
                <div>
                  <dt className="inline text-muted">Screening </dt>
                  <dd className="inline">
                    {formatDateTime(round.screening_at)}
                    {round.location ? ` · ${round.location}` : ""}
                  </dd>
                </div>
              )}
              <div>
                <dt className="inline text-muted">Votes so far </dt>
                <dd className="inline font-semibold">{voters}</dd>
              </div>
            </dl>
          </div>
          <Countdown to={round.closes_at} />
        </div>
        <div className="marquee-bulbs" />
      </div>

      <div className="mt-8">
        {movies.length ? (
          <Ballot roundId={round.id} movies={movies} myVote={myVote} signedIn={Boolean(userId)} />
        ) : (
          <p className="text-muted">The shortlist for this round is being prepared. Check back soon.</p>
        )}
      </div>
    </section>
  );
}

function NoOpenRound({ upcoming }: { upcoming?: Round }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="marquee-bulbs opacity-40" />
      <div className="px-6 py-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">TIU Movie Club</p>
        {upcoming ? (
          <>
            <h1 className="mt-2 font-display text-5xl tracking-wide sm:text-6xl">Next vote opens soon</h1>
            <p className="mt-3 text-muted">
              <span className="text-paper">{upcoming.title}</span> opens on{" "}
              <span className="text-paper">{formatDateTime(upcoming.opens_at)}</span>.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-5xl tracking-wide sm:text-6xl">No vote running right now</h1>
            <p className="mt-3 text-muted">A new round starts every two weeks. Meanwhile, browse the catalog.</p>
          </>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/catalog" className="btn btn-gold">Browse the catalog</Link>
          <Link href="/suggest" className="btn btn-ghost">Suggest a film</Link>
        </div>
      </div>
      <div className="marquee-bulbs opacity-40" />
    </section>
  );
}

async function UpNext({ round }: { round: Round }) {
  const movie = round.winner_movie_id ? await getMovie(round.winner_movie_id) : null;
  if (!movie) return null;
  const upcomingScreening = round.screening_at && new Date(round.screening_at) > new Date();

  return (
    <section>
      <h2 className="font-display text-3xl tracking-wide">
        {upcomingScreening ? "Coming up on screen" : "Last winner"}
      </h2>
      <div className="mt-4 flex gap-5 rounded-2xl border border-line bg-surface p-4">
        <Poster path={movie.poster_path} title={movie.title} className="w-28 shrink-0 sm:w-36" sizes="144px" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{round.title} winner</p>
          <h3 className="mt-1 font-display text-4xl leading-none tracking-wide">{movie.title}</h3>
          <div className="mt-2">
            <MovieMeta movie={movie} />
          </div>
          {round.screening_at && (
            <p className="mt-3 text-sm">
              <span className="text-muted">Screening: </span>
              {formatDateTime(round.screening_at)}
              {round.location ? ` · ${round.location}` : ""}
            </p>
          )}
          {movie.overview && <p className="mt-3 line-clamp-3 max-w-2xl text-sm text-muted">{movie.overview}</p>}
          <Link href="/results" className="mt-3 inline-block text-sm text-gold hover:underline">
            See the results →
          </Link>
        </div>
      </div>
    </section>
  );
}
