# Manjree's — Ethnic Wear Catalog PWA

*Embrace elegance in ethnic wear.*

Mobile-first Progressive Web App for browsing and enquiring about Kurtis and
Indian ethnic wear. Everything is designed for phone screens — customers and
admin alike. Two experiences in one codebase:

- **Customer catalog** (public, no login): browse pieces, new-arrivals row,
  category filter, product detail with swipeable gallery, "Enquire on
  WhatsApp" deep link, share button, light/dark mode. Pieces a customer
  enquired about get a "✓ Enquired" tag on that device — a personal reminder,
  no account needed.
- **Admin panel** (`/admin`, passcode-protected): add/edit/delete/duplicate
  pieces, multi-photo upload, draft mode, sold-out / new-arrival / pin
  toggles — plus an **analytics page** showing views and WhatsApp enquiries
  per piece and activity per (anonymous) device.

Installable on Android and iOS via "Add to Home Screen".

## Tech stack

TypeScript + React + Vite + Tailwind CSS 4 + `vite-plugin-pwa`, with Supabase
(Postgres + Auth + Storage) as the backend and Vercel for hosting. Vitest +
Testing Library for tests (run in CI on every push).

## Getting started

```bash
npm install
npm run dev
```

With no configuration the app runs in **local demo mode**: the catalog is
seeded with sample pieces stored in the browser's localStorage, and the admin
panel unlocks with passcode `1234` (`VITE_DEMO_ADMIN_PIN` to change). Great
for developing and demoing the UI without any backend.

```bash
npm test            # run the test suite once
npm run test:watch  # watch mode
```

## Connecting Supabase (production)

Everything is scripted — no SQL pasting in the dashboard:

1. Create a project at [supabase.com](https://supabase.com), then copy
   `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_DB_URL` (Connect → URI, "Session pooler", with your DB password)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API — keep this secret)
   - `VITE_WHATSAPP_NUMBER` (international format, no `+`)
2. Apply the database schema:
   ```bash
   npm run db:migrate
   ```
   This runs every file in `supabase/migrations/` in order and records what
   has been applied in a `schema_migrations` table — rerun it any time; new
   migration files are picked up, applied ones are skipped. To change the
   schema later, add a new numbered `.sql` file and run it again.
3. Set the admin passcode:
   ```bash
   npm run admin:create -- <your-passcode>
   ```
   The admin login is **just this passcode** (no email field). Under the hood
   it is the password of a fixed Supabase Auth account
   (`VITE_ADMIN_EMAIL`, default `admin@manjrees.local`). Run the same command
   again with a new passcode to rotate it.
4. Restart the dev server. The app now reads/writes Supabase, photos upload
   to storage, and analytics events flow into the `events` table.

## Deploying to Vercel

Import the GitHub repo in Vercel (framework preset: Vite) and set the
`VITE_*` environment variables in the project settings (`SUPABASE_DB_URL` and
the service-role key are only needed where you run the scripts, not in
Vercel). Every push to the production branch auto-deploys. `vercel.json`
contains the SPA rewrite so deep links like `/product/<id>` work.

## Analytics & privacy

Customers never log in. Each browser gets a random device id (localStorage);
product views (once per session) and WhatsApp taps are recorded against it.
Row-level security lets anyone insert events but only the signed-in admin
read them. The admin analytics page (`/admin` → Analytics) shows totals,
most-viewed pieces, enquiries per piece, and per-device activity.

## Branding / re-skinning

Shop-specific details live in two places:

- [`src/config.ts`](src/config.ts) — shop name, tagline, Instagram URL,
  WhatsApp number, categories, sizes, currency.
- [`src/index.css`](src/index.css) — the brand palette (marigold, bougainvillea
  pink, leaf green, warm cream) as Tailwind theme tokens.

The PWA icons in `public/` are generated placeholders in the brand palette
(`npm run icons` regenerates them). When the final circular logo arrives,
replace `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`,
`apple-touch-icon.png` and `favicon.svg` with exports of it (the maskable
variant needs ~20% padding around the badge).

## Roadmap

Later phases from the design doc: filters/search, wishlist, recently viewed,
festive banner, push notifications, collections, inventory counts, CSV
export, LLM-assisted tagging.
