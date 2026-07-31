# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`nsc-middleware` is the Node/Express + MongoDB middleware layer for Neighborhood Stage Carolinas. It sits between the public GHL-hosted site and MongoDB Atlas: it receives GHL form-submission webhooks, provides an EJS-rendered admin approval panel, and exports approved data as static JSON to a Cloudflare R2 CDN (since GHL cannot make authenticated API calls). See the parent directory's `Web App/CLAUDE.md` for the full three-layer architecture and MongoDB collection design intent — this file documents the code as it actually exists in this repo, which has drifted somewhat from that higher-level plan (field names differ in places — see Schema notes below).

## Commands

```
npm run dev         # nodemon server.js — local development
npm start            # node server.js — production start command (Railway)
npm run upload:cdn   # scripts/upload-cdn-assets.js — push cdn/ static assets to R2
```

There is no test suite / test script in this repo (`data/test*` are stray leftover files from an early R2 connectivity check, not a test harness).

Local dev requires a `.env` (see `.env.example`) with `MONGODB_URI`, `SESSION_SECRET`, `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`, `GHL_WEBHOOK_SECRET`, and `CDN_*` (Cloudflare R2) vars.

## Architecture

**Entry point:** `server.js` — connects to MongoDB first, and only starts the Express server and registers the three `node-cron` jobs inside the `mongoose.connect().then()` callback. Cron schedules (all `America/New_York`):
- `0 2 * * *` — `jobs/backup.js` (`runBackup`) — full collection dump to R2
- `0 3 * * *` — `jobs/exportJson.js` (`runExport`) — publish CDN JSON
- `0 4 * * 1` — `jobs/archiveOld.js` (`runArchive`) — weekly archive/cleanup (Mondays)

Each also has a manual trigger under `routes/cron.js` (session-authed), useful for testing without waiting on the schedule.

**Route layer** (`routes/`):
- `webhook.js` — public, CORS-open. Receives raw GHL form POSTs (`/submit-show`, `/submit-audition`, `/submit-company`, `/submit-venue`, `/submit-review`, `/submit-review-request`) and file uploads (`/upload-image`, `/upload-logo`) direct to R2. Everything created here lands with `status: 'pending'` — nothing auto-publishes. Only `/submit-review` runs `middleware/validateWebhook.js` (HMAC check); the rest are unauthenticated by design since they only ever produce pending records.
- `admin.js` — session-authenticated (`middleware/auth.js` `requireAuth`) EJS admin panel: approve/reject pending queue, full CRUD for companies/venues/productions/auditions/review-requests, venue geocoding.
- `api.js` — public read JSON endpoints (`/api/auditions`, `/api/productions`, `/api/companies/:slug`). This exists but Phase 1 GHL pages read the CDN-exported static JSON directly rather than calling this API — check before assuming it's the live data path for the public site.
- `cron.js` — session-authed manual triggers for the three jobs above.

**Jobs** (`jobs/`) — the CDN/backup pipeline:
- `exportJson.js` — queries `published` + not-yet-`expiresAt` Auditions/Productions (populated with company/venue) plus `verified` Companies and all Venues, uploads each as `data/{name}.json` to R2. This is what the public GHL site actually fetches.
- `archiveOld.js` — moves expired Productions into the separate `past_productions` collection (`models/PastProduction.js`) and deletes expired Auditions (no history kept for auditions), then re-runs `runExport` so the CDN JSON reflects the change.
- `backup.js` — dumps every Mongo collection to `backups/YYYY-MM-DD/{collection}.json` in R2; prunes backup folders older than `RETENTION_DAYS` (30).

**Models** (`models/`) — Mongoose schemas: `Company`, `Venue`, `Production`, `Audition`, `Review`, `ReviewRequest`, `Comment`, `Media`, `PastProduction`. Cross-references use `linkedCompanyId` / `linkedVenueId` / `linkedProductionId` / `linkedAuditionId` (ObjectId refs, not embedded documents), matching the parent-doc's foreign-key principle. `Production` and `Audition` both have a `pre('save')` hook that auto-sets `expiresAt` (production: `dates.closes` + 1 day; audition: latest `auditionDates[].date` + 1 day) the first time `status` transitions to `published`.

**`lib/regions.js`** is the single source of truth for the region enum used by `Company`/`Venue` schemas and the admin EJS forms. If you change it, also update `cdn/assets/js/nsc-modals.js` (the public-facing submission modals) — there is no shared import between the Node backend and the GHL-side JS, so they're kept in sync by hand.

**`lib/geocode.js`** — free-tier Census Bureau geocoder, used whenever a venue is created/updated (webhook submission, admin create/edit, and the bulk `/admin/venues/geocode-all` backfill route) to populate `lat`/`lng`.

**`cdn/`** — versioned copy of the static assets deployed to the R2-backed CDN that GHL pages load: `cdn/assets/{css,js,html}` (site chrome, filter/search JS, submission-modal JS) is pushed via `npm run upload:cdn`; `cdn/data/` is excluded from that script since it's exclusively managed by `jobs/exportJson.js`.

**`views/admin/`** — server-rendered EJS templates for the admin panel (dashboard, pending queue, companies/venues/productions/auditions/review-requests CRUD, login). `views/admin/_nav.ejs` is the shared nav partial.

## Schema notes (code vs. the higher-level project doc)

The actual Mongoose schemas nest show data more deeply than the flat schema sketched in the parent `Web App/CLAUDE.md`. When touching `Production`/`Audition`, use the real shape:
- Show fields live under a nested `show: {...}` subdocument (`show.title`, `show.showType`, `show.familyRating`, etc.), not top-level.
- Run dates are `dates.opens` / `dates.closes` (Production) — not `runDates.start/end`.
- Audition show dates are `show.showDates.opens` / `show.showDates.closes`; audition-specific dates are the `auditionDates[]` array (`date`, `startTime`, `endTime`, `format`).
- `status` enums are implementation-specific: Production is `pending | published | closed | rejected`, Audition is `pending | published | expired | rejected` (not the `pending | approved | published | archived` sketched elsewhere).
- Expired/closed productions move to the separate `PastProduction` model/`past_productions` collection rather than an `archived` status value.

## Known repo quirks

- Several `.min.js` files checked into `routes/`, `models/`, `jobs/`, and `cdn/assets/js/` (e.g. `webhook.min.js`, `Production.min.js`, `exportJson.min.js`) are empty, unreferenced stray artifacts — nothing `require()`s them. Ignore them; don't treat their presence as a build step you need to maintain.
- `middleware/validateWebhook.js` expects `req.body` to be a raw `Buffer` (for HMAC verification against the raw payload), but `server.js` applies `express.json()` globally before the webhook routes are mounted, so `req.body` is already a parsed object by the time it reaches this middleware. This only executes when `NODE_ENV === 'production'` and `GHL_WEBHOOK_SECRET` is set — worth checking closely before relying on it.
