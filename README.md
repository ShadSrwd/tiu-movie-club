# TIU Movie Club

A public website where students browse the club's approved films and vote, every two weeks, for the next screening.

- **Students** sign in with their TIU Microsoft (Teams) account, vote once per round (they can change their vote until it closes), see past winners and suggest films.
- **Admins** add films from TMDB, vet them against the content rules (with a direct link to each film's IMDb Parents Guide), build each round's shortlist, and declare winners.

**Stack:** Next.js 16 · Supabase (Postgres + Auth) · Microsoft Entra ID sign-in · TMDB API · Vercel

---

## How it works

| Page | Who | What |
|---|---|---|
| `/` | Everyone | Current round: countdown, shortlist, vote buttons. The last winner and its screening time. |
| `/catalog` | Everyone | All approved films, with search and genre filters |
| `/results` | Everyone | Winners and vote counts of finished rounds |
| `/suggest` | Signed-in students | Suggest a film (max 3 waiting at a time) |
| `/admin` | Admins | Live results, end voting, declare winner |
| `/admin/movies` | Admins | Search TMDB, vet, write notes, approve |
| `/admin/rounds` | Admins | Create rounds (dates + shortlist), edit screening, history |
| `/admin/suggestions` | Admins | Review student suggestions |
| `/admin/team` | Admins | Add or remove admins |

### Security rules (enforced inside the database, not just the website)

- Only `@tiu.edu.iq` emails can create an account. Anyone else is rejected at sign-up.
- One vote per student per round (the database's primary key), only while the round is open, and only for films on that round's shortlist.
- Students can't see anyone else's vote. Vote counts stay hidden until voting closes, so people vote for what they want, not for whatever is winning. Admins see live counts.
- Only approved films are visible to the public, and only approved films can go on a ballot.
- Only admins can add, approve or delete films, create rounds and pick winners. Students can't make themselves admins.

`npm run test:db` checks all of these rules (31 checks) against an in-memory Postgres.

---

## Setup (about 30–45 minutes the first time)

### 1. Supabase (database + sign-in)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   - If TIU student emails use a different domain than `tiu.edu.iq`, edit the `insert into public.settings` line first.
     Subdomains are accepted automatically (`student.tiu.edu.iq` matches `tiu.edu.iq`).
3. Open **Project Settings → API keys** and copy the **Project URL** and the **publishable key**. You need them in step 4.

### 2. Microsoft sign-in (TIU Teams accounts)

Microsoft sign-in needs an "app registration" in Microsoft Entra ID (Azure AD). There are two ways to set it up:

**Option A (recommended): ask TIU IT to register the app in the university's tenant.**
This is the cleanest option: only TIU accounts can even see the sign-in page, and students won't hit an "admin approval required" screen. Send IT these details:

- App type: **Web**, single tenant (accounts in this organization only)
- Redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Permissions: `openid`, `profile`, `email` (Microsoft Graph, delegated). Ask them to **grant admin consent**.
- Optional claims (ID token): `email`, `xms_edov`

They give you back the **Application (client) ID**, a **client secret value** and the **Directory (tenant) ID**.

**Option B: register it yourself** in your own free Azure account at [portal.azure.com](https://portal.azure.com):

1. **Microsoft Entra ID → App registrations → New registration**
   - Supported account types: **Accounts in any organizational directory (multitenant)**
   - Redirect URI: **Web** → `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Copy the **Application (client) ID**.
3. **Certificates & secrets → New client secret**. Copy the **Value** (not the Secret ID). Set a reminder before it expires.
4. **Token configuration → Add optional claim → ID token →** tick `email` and `xms_edov`. This lets Supabase confirm the email address is verified, which matters for a multitenant app.
5. The database still blocks every non-TIU email. Note: if TIU has disabled "user consent" for apps, students will see "Need admin approval". In that case you need IT anyway (Option A).

**Then, in Supabase:** go to **Authentication → Sign In / Providers → Azure**, turn it on, and paste:

- **Client ID** and **Client Secret**
- **Azure Tenant URL**:
  - Option A: `https://login.microsoftonline.com/<TIU-tenant-id>`
  - Option B: `https://login.microsoftonline.com/organizations`

Finally, in **Authentication → URL Configuration**:

- **Site URL**: your live address (e.g. `https://movieclub.example.com`). Use `http://localhost:3000` until you deploy.
- **Redirect URLs**: add `http://localhost:3000/**` and `https://<your-live-domain>/**`

### 3. TMDB (posters and film details)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org).
2. **Settings → API** → request an API key (choose non-commercial / educational use).
3. Copy the **API Read Access Token** (the long one starting with `eyJ`).

### 4. Run it on your computer

```bash
npm install
cp .env.example .env.local   # then fill in the four values
npm run dev
```

Open http://localhost:3000 and sign in with your TIU account.

### 5. Make yourself the first admin

After you've signed in once, run this in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'your.name@tiu.edu.iq';
```

Refresh the site. An **Admin** link appears in the header. Add other club members from **Admin → Team** (they need to sign in once first).

### 6. Put it online (Vercel, free)

1. Push this folder to a GitHub repository.
2. At [vercel.com](https://vercel.com), click **Add New → Project** and import the repo.
3. Add the same four environment variables from `.env.local`.
4. Deploy. Then optionally add your own domain under **Settings → Domains**.
5. Go back to Supabase **URL Configuration** and set the **Site URL** and **Redirect URLs** to the live address.
   (The Microsoft redirect URI points to Supabase, so it never changes.)

---

## The two-week routine (for club admins)

1. **Vet new films:** go to Admin → Movies → Pending review. Open each film's **Parents Guide**, write a note (e.g. "Clean" or "Skip 1:12:30–1:13:10"), and click **Approve**.
2. **Create the round:** go to Admin → Rounds. The dates are pre-filled for the next two weeks (Baghdad time). Pick 4–6 approved films and add the screening time and place.
3. **Share** the site link on Teams and the club's social media.
4. **When voting closes:** open Admin → Overview, check the results and click **Declare winner**. If there's a tie, you decide (or run a quick tiebreak round).

Voting opens and closes on its own at the times you set. No one has to press a button.

---

## Project structure

```
supabase/schema.sql        Database tables, security rules, results function
supabase/test-schema.mjs   Tests for the security rules (npm run test:db)
src/proxy.ts               Keeps the sign-in session fresh on every request
src/lib/                   Supabase clients, auth helpers, TMDB client, date formatting
src/app/page.tsx           Home / current vote
src/app/catalog, results, suggest, login, auth/...
src/app/actions.ts         Student actions (vote, suggest)
src/app/admin/             Admin pages + admin actions
src/components/            UI components (ballot, poster, countdown, admin forms)
```

All dates are shown in Baghdad time (UTC+3), whatever device the visitor uses.

## Notes

- **Content vetting is a human job.** The US age rating (PG, PG-13) is shown as a hint, but only an admin's approval puts a film in the catalog.
- **TMDB attribution** is in the footer, as TMDB's terms require. Keep it there.
- Get the university's approval before launch, since the site uses the club's and TIU's name.
