-- =====================================================================
-- TIU Movie Club: database schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to read top to bottom; every table has Row Level Security on.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Settings: which email domain is allowed to sign in
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  allowed_email_domain text not null
);

-- CHANGE THIS if TIU student emails use a different domain.
-- Subdomains are accepted too (e.g. student.tiu.edu.iq matches tiu.edu.iq).
insert into public.settings (id, allowed_email_domain)
values (1, 'tiu.edu.iq')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Profiles: one row per signed-in student, created automatically
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed text;
  user_domain text;
begin
  select lower(allowed_email_domain) into allowed from public.settings where id = 1;
  user_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  if allowed is not null and allowed <> ''
     and not (user_domain = allowed or user_domain like '%.' || allowed) then
    raise exception 'Only @% accounts can sign in to the Movie Club', allowed;
  end if;

  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 3. Movies: the catalog. Only approved movies are visible to the public.
-- ---------------------------------------------------------------------
create table if not exists public.movies (
  id bigint generated always as identity primary key,
  tmdb_id int unique,
  imdb_id text,
  title text not null,
  overview text,
  poster_path text,
  backdrop_path text,
  release_year int,
  runtime int,
  certification text,
  genres text[] not null default '{}',
  approved boolean not null default false,
  content_notes text,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Rounds: one voting period (normally two weeks)
-- ---------------------------------------------------------------------
create table if not exists public.rounds (
  id bigint generated always as identity primary key,
  title text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  screening_at timestamptz,
  location text,
  winner_movie_id bigint references public.movies (id) on delete set null,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.round_movies (
  round_id bigint not null references public.rounds (id) on delete cascade,
  movie_id bigint not null references public.movies (id) on delete cascade,
  primary key (round_id, movie_id)
);

create or replace function public.round_is_open(p_round_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rounds
    where id = p_round_id
      and now() >= opens_at
      and now() < closes_at
      and winner_movie_id is null
  );
$$;

create or replace function public.movie_is_approved(p_movie_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.movies where id = p_movie_id and approved);
$$;

-- ---------------------------------------------------------------------
-- 5. Votes: one per student per round (enforced by the primary key)
-- ---------------------------------------------------------------------
create table if not exists public.votes (
  round_id bigint not null,
  movie_id bigint not null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (round_id, user_id),
  foreign key (round_id, movie_id)
    references public.round_movies (round_id, movie_id) on delete cascade
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists votes_touch on public.votes;
create trigger votes_touch
  before update on public.votes
  for each row execute function public.touch_updated_at();

-- Vote counts. Hidden from students until the round closes,
-- so people vote for what they want, not for whatever is winning.
create or replace function public.round_results(p_round_id bigint)
returns table (movie_id bigint, vote_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select rm.movie_id, count(v.user_id) as vote_count
  from public.round_movies rm
  join public.rounds r on r.id = rm.round_id
  left join public.votes v on v.round_id = rm.round_id and v.movie_id = rm.movie_id
  where rm.round_id = p_round_id
    and (r.closes_at <= now() or r.winner_movie_id is not null or public.is_admin())
  group by rm.movie_id
  order by vote_count desc;
$$;

-- Total number of students who voted (safe to show while a round is open).
create or replace function public.round_voter_count(p_round_id bigint)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.votes where round_id = p_round_id;
$$;

-- ---------------------------------------------------------------------
-- 6. Suggestions: students suggest titles; admins review them
-- ---------------------------------------------------------------------
create table if not exists public.suggestions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'added', 'rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.pending_suggestion_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.suggestions
  where user_id = auth.uid() and status = 'pending';
$$;

-- ---------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------
alter table public.settings     enable row level security;
alter table public.profiles     enable row level security;
alter table public.movies       enable row level security;
alter table public.rounds       enable row level security;
alter table public.round_movies enable row level security;
alter table public.votes        enable row level security;
alter table public.suggestions  enable row level security;

-- settings
drop policy if exists "settings: admins read" on public.settings;
create policy "settings: admins read" on public.settings
  for select using (public.is_admin());
drop policy if exists "settings: admins update" on public.settings;
create policy "settings: admins update" on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

-- profiles
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: admins update" on public.profiles;
create policy "profiles: admins update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- movies
drop policy if exists "movies: public reads approved" on public.movies;
create policy "movies: public reads approved" on public.movies
  for select using (approved or public.is_admin());
drop policy if exists "movies: admins insert" on public.movies;
create policy "movies: admins insert" on public.movies
  for insert with check (public.is_admin());
drop policy if exists "movies: admins update" on public.movies;
create policy "movies: admins update" on public.movies
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "movies: admins delete" on public.movies;
create policy "movies: admins delete" on public.movies
  for delete using (public.is_admin());

-- rounds
drop policy if exists "rounds: public read" on public.rounds;
create policy "rounds: public read" on public.rounds
  for select using (true);
drop policy if exists "rounds: admins insert" on public.rounds;
create policy "rounds: admins insert" on public.rounds
  for insert with check (public.is_admin());
drop policy if exists "rounds: admins update" on public.rounds;
create policy "rounds: admins update" on public.rounds
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "rounds: admins delete" on public.rounds;
create policy "rounds: admins delete" on public.rounds
  for delete using (public.is_admin());

-- round_movies (only approved movies can be put on a ballot)
drop policy if exists "round_movies: public read" on public.round_movies;
create policy "round_movies: public read" on public.round_movies
  for select using (true);
drop policy if exists "round_movies: admins insert approved" on public.round_movies;
create policy "round_movies: admins insert approved" on public.round_movies
  for insert with check (public.is_admin() and public.movie_is_approved(movie_id));
drop policy if exists "round_movies: admins delete" on public.round_movies;
create policy "round_movies: admins delete" on public.round_movies
  for delete using (public.is_admin());

-- votes
drop policy if exists "votes: read own or admin" on public.votes;
create policy "votes: read own or admin" on public.votes
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "votes: members vote in open rounds" on public.votes;
create policy "votes: members vote in open rounds" on public.votes
  for insert with check (
    user_id = auth.uid() and public.is_member() and public.round_is_open(round_id)
  );
drop policy if exists "votes: change own vote while open" on public.votes;
create policy "votes: change own vote while open" on public.votes
  for update
  using (user_id = auth.uid() and public.round_is_open(round_id))
  with check (user_id = auth.uid() and public.round_is_open(round_id));
drop policy if exists "votes: remove own vote while open" on public.votes;
create policy "votes: remove own vote while open" on public.votes
  for delete using (user_id = auth.uid() and public.round_is_open(round_id));

-- suggestions (max 3 pending per student)
drop policy if exists "suggestions: read own or admin" on public.suggestions;
create policy "suggestions: read own or admin" on public.suggestions
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "suggestions: members suggest" on public.suggestions;
create policy "suggestions: members suggest" on public.suggestions
  for insert with check (
    user_id = auth.uid()
    and public.is_member()
    and status = 'pending'
    and public.pending_suggestion_count() < 3
  );
drop policy if exists "suggestions: admins update" on public.suggestions;
create policy "suggestions: admins update" on public.suggestions
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "suggestions: admins delete" on public.suggestions;
create policy "suggestions: admins delete" on public.suggestions
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- 8. Grants (Row Level Security above still decides what each user sees)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.movies, public.rounds, public.round_movies to anon;
grant select, insert, update, delete
  on public.movies, public.rounds, public.round_movies, public.votes, public.suggestions
  to authenticated;
grant select, update on public.profiles, public.settings to authenticated;
grant execute on function public.round_results(bigint) to anon, authenticated;
grant execute on function public.round_voter_count(bigint) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. Make yourself an admin (run AFTER you sign in to the site once)
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'your.name@tiu.edu.iq';
