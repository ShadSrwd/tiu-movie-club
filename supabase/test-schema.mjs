// Tests the database security rules against an in-memory Postgres (PGlite).
// Run with: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};

// --- Minimal stand-in for Supabase's auth schema and roles ---
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

await db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
console.log("schema loaded");

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const S1 = "00000000-0000-0000-0000-000000000001";
const S2 = "00000000-0000-0000-0000-000000000002";
const OUT = "00000000-0000-0000-0000-0000000000ff";

// --- Sign-ups (trigger) ---
await db.query(`insert into auth.users (id,email,raw_user_meta_data) values ($1,'admin@tiu.edu.iq','{"name":"Admin"}')`, [ADMIN]);
await db.query(`insert into auth.users (id,email) values ($1,'s1@student.tiu.edu.iq')`, [S1]);
await db.query(`insert into auth.users (id,email) values ($1,'S2@TIU.EDU.IQ')`, [S2]);
let blocked = false;
try { await db.query(`insert into auth.users (id,email) values ($1,'hacker@gmail.com')`, [OUT]); }
catch (e) { blocked = /Only @tiu.edu.iq/.test(e.message); }
ok("outsider email is blocked at sign-up", blocked);
ok("evil subdomain-lookalike blocked", await (async () => {
  try { await db.query(`insert into auth.users (id,email) values (gen_random_uuid(),'x@eviltiu.edu.iq')`); return false; }
  catch { return true; }
})());
const profs = await db.query(`select email, full_name from public.profiles order by email`);
ok("profiles created for TIU users", profs.rows.length === 3, JSON.stringify(profs.rows));
await db.query(`update public.profiles set role='admin' where id=$1`, [ADMIN]);

// Run SQL as a given user through RLS
async function as(uid, sql, params = []) {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try { return await db.query(sql, params); }
  finally { await db.exec("reset role"); }
}
async function fails(uid, sql, params = []) {
  try { const r = await as(uid, sql, params); return r.affectedRows === 0 && /^\s*(update|delete)/i.test(sql); }
  catch { return true; }
}

// --- Movies ---
ok("student cannot add a movie", await fails(S1, `insert into public.movies (title) values ('x')`));
await as(ADMIN, `insert into public.movies (tmdb_id,title,approved) values (1,'Approved A',true),(2,'Approved B',true),(3,'Pending C',false)`);
let r = await as(null, `select title from public.movies order by id`);
ok("public sees only approved movies", r.rows.length === 2, JSON.stringify(r.rows));
r = await as(ADMIN, `select title from public.movies`);
ok("admin sees all movies", r.rows.length === 3);
ok("student cannot approve a movie", await fails(S1, `update public.movies set approved=true where tmdb_id=3`));

// --- Rounds ---
await as(ADMIN, `insert into public.rounds (title, opens_at, closes_at) values
  ('Open round', now() - interval '1 day', now() + interval '13 days'),
  ('Closed round', now() - interval '20 days', now() - interval '6 days'),
  ('Future round', now() + interval '13 days', now() + interval '27 days')`);
const ids = (await db.query(`select id, title from public.rounds order by id`)).rows;
const [OPEN, CLOSED, FUTURE] = ids.map((x) => x.id);
const mids = (await db.query(`select id from public.movies order by id`)).rows.map((x) => x.id);
const [A, B, C] = mids;
await as(ADMIN, `insert into public.round_movies values ($1,$2),($1,$3)`, [OPEN, A, B]);
ok("unapproved movie cannot go on a ballot", await fails(ADMIN, `insert into public.round_movies values ($1,$2)`, [OPEN, C]));
// Closed + future rounds: insert as superuser to set up data
await db.query(`insert into public.round_movies values ($1,$2),($1,$3),($4,$2)`, [CLOSED, A, B, FUTURE]);
ok("student cannot create a round", await fails(S1, `insert into public.rounds (title,opens_at,closes_at) values ('x',now(),now()+interval '1 day')`));

// --- Votes ---
await as(S1, `insert into public.votes (round_id, movie_id) values ($1,$2)`, [OPEN, A]);
ok("student can vote in open round", true);
ok("student cannot vote twice", await fails(S1, `insert into public.votes (round_id, movie_id) values ($1,$2)`, [OPEN, B]));
await as(S1, `update public.votes set movie_id=$2 where round_id=$1`, [OPEN, B]);
r = await db.query(`select movie_id from public.votes where user_id=$1`, [S1]);
ok("student can change vote while open", r.rows[0].movie_id === B);
ok("cannot vote for a movie not on the ballot", await fails(S2, `insert into public.votes (round_id, movie_id) values ($1,$2)`, [OPEN, C]));
ok("cannot vote in closed round", await fails(S2, `insert into public.votes (round_id, movie_id) values ($1,$2)`, [CLOSED, A]));
ok("cannot vote in future round", await fails(S2, `insert into public.votes (round_id, movie_id) values ($1,$2)`, [FUTURE, A]));
ok("cannot vote as someone else", await fails(S2, `insert into public.votes (round_id, movie_id, user_id) values ($1,$2,$3)`, [OPEN, A, S1]));
ok("anonymous cannot vote", await fails(null, `insert into public.votes (round_id, movie_id) values ($1,$2)`, [OPEN, A]));
await as(S2, `insert into public.votes (round_id, movie_id) values ($1,$2)`, [OPEN, B]);
r = await as(S2, `select * from public.votes`);
ok("student sees only own vote", r.rows.length === 1 && r.rows[0].user_id === S2);

// --- Results visibility ---
r = await as(S1, `select * from public.round_results($1)`, [OPEN]);
ok("results hidden from students while open", r.rows.length === 0);
r = await as(null, `select public.round_voter_count($1) as n`, [OPEN]);
ok("voter count visible publicly", Number(r.rows[0].n) === 2);
r = await as(ADMIN, `select * from public.round_results($1)`, [OPEN]);
ok("admin sees live results", r.rows.length === 2 && Number(r.rows[0].vote_count) === 2, JSON.stringify(r.rows));
await db.query(`insert into public.votes (round_id,movie_id,user_id) values ($1,$2,$3)`, [CLOSED, A, S1]);
r = await as(null, `select * from public.round_results($1)`, [CLOSED]);
ok("results public after close", r.rows.length === 2 && Number(r.rows[0].vote_count) === 1);

// Winner set early closes voting
await as(ADMIN, `update public.rounds set winner_movie_id=$2 where id=$1`, [OPEN, B]);
ok("setting a winner closes voting", await fails(S1, `update public.votes set movie_id=$2 where round_id=$1`, [OPEN, A]));
r = await as(null, `select * from public.round_results($1)`, [OPEN]);
ok("results public once winner set", r.rows.length === 2);

// --- Suggestions ---
for (let i = 0; i < 3; i++) await as(S1, `insert into public.suggestions (title) values ($1)`, ["Movie " + i]);
ok("4th pending suggestion blocked", await fails(S1, `insert into public.suggestions (title) values ('Movie 4')`));
ok("student cannot self-approve suggestion", await fails(S1, `insert into public.suggestions (title,status) values ('x','added')`));
r = await as(S2, `select * from public.suggestions`);
ok("student cannot read others' suggestions", r.rows.length === 0);
r = await as(ADMIN, `select * from public.suggestions`);
ok("admin reads all suggestions", r.rows.length === 3);

// --- Profiles ---
ok("student cannot make self admin", await fails(S1, `update public.profiles set role='admin' where id=auth.uid()`));
r = await as(S1, `select * from public.profiles`);
ok("student sees only own profile", r.rows.length === 1);
r = await as(null, `select public.is_admin() as a`);
ok("anon is not admin", r.rows[0].a === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
