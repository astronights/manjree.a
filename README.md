# Manjree's — Ethnic Wear Catalog PWA

*Embrace elegance in ethnic wear.*

Mobile-first Progressive Web App for browsing and enquiring about Kurtis and
Indian ethnic wear. Two experiences in one codebase:

- **Customer catalog** (public): browse pieces, new-arrivals row, category
  filter, product detail with swipeable gallery, "Enquire on WhatsApp"
  deep link, share button, light/dark mode.
- **Admin panel** (`/admin`, password-protected): add/edit/delete/duplicate
  pieces, multi-photo upload, draft mode, sold-out / new-arrival / pin toggles.

Installable on Android and iOS via "Add to Home Screen".

## Tech stack

React + Vite + Tailwind CSS 4 + `vite-plugin-pwa`, with Supabase
(Postgres + Auth + Storage) as the backend and Vercel for hosting.
See the design doc for the full architecture rationale.

## Getting started

```bash
npm install
npm run dev
```

With no configuration the app runs in **local demo mode**: the catalog is
seeded with sample pieces stored in the browser's localStorage, and the admin
panel unlocks with PIN `1234` (`VITE_DEMO_ADMIN_PIN` to change). This is great
for developing and demoing the UI without any backend.

## Connecting Supabase (production)

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql)
   in the SQL editor. It creates the `products` table, row-level-security
   policies, and the public `product-images` storage bucket.
2. Create the admin user under **Authentication → Users** (email + password).
3. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (project settings → API)
   - `VITE_WHATSAPP_NUMBER` (international format, no `+`)
4. Restart the dev server. The app now reads/writes Supabase, photos upload to
   storage, and `/admin/login` uses the Supabase email/password.

## Deploying to Vercel

Import the GitHub repo in Vercel (framework preset: Vite) and set the three
environment variables above in the project settings. Every push to the
production branch auto-deploys. `vercel.json` already contains the SPA rewrite
so deep links like `/product/<id>` work.

## Branding / re-skinning

Shop-specific details live in two places:

- [`src/config.js`](src/config.js) — shop name, tagline, Instagram URL,
  WhatsApp number, categories, sizes, currency.
- [`src/index.css`](src/index.css) — the brand palette (marigold, bougainvillea
  pink, leaf green, warm cream) as Tailwind theme tokens.

The PWA icons in `public/` are generated placeholders in the brand palette
(`npm run icons` regenerates them). When the final circular logo arrives,
replace `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`,
`apple-touch-icon.png` and `favicon.svg` with exports of it (the maskable
variant needs ~20% padding around the badge).

## Roadmap

Phase 1 (this repo) covers the MVP. Later phases from the design doc:
filters/search, wishlist, recently viewed, festive banner, "reserved for me"
flag, push notifications, collections, inventory counts, CSV export,
LLM-assisted tagging, analytics.
