# Tendril

A link-in-bio platform for creators. One page with all your links, a visual editor
with a live phone preview, per-link content warnings, privacy-respecting analytics,
and a Free/Pro plan with Stripe billing.

> "Tendril" is a working name. Change it in [`src/config/brand.ts`](src/config/brand.ts).
> Product decisions are in [`../docs/spec.md`](../docs/spec.md).

## Features

- **Auth:** email and password (bcrypt), optional Google sign-in. Auth.js v5 with JWT sessions.
  Password reset and email confirmation use single-use, expiring tokens; only their hashes are
  stored. Resetting or changing a password signs out every other device. Sign-up, sign-in and
  reset requests are rate-limited, and reset requests never reveal whether an email has an account.
- **Onboarding:** claim `/<username>` with a live availability check and reserved-word rules.
- **Editor:** link, header, text and social-icon blocks. Drag or keyboard reordering, show/hide,
  undoable delete, profile photo, bio, SEO fields, eight themes (four on Free), Pro custom colors
  and fonts, a live phone preview, and autosave.
- **Public page** `/<username>`: server-rendered and cached, refreshed on every save. Title,
  description, canonical URL, Open Graph image, ProfilePage JSON-LD, real 404s for unknown names.
- **Click tracking:** every link goes through `/go/<id>`, which logs the click after responding
  and returns a 302. Works without JavaScript.
- **View tracking:** a small beacon (`/api/v`) with a `<noscript>` fallback. Bots are dropped.
  No cookies, no raw IP addresses (visitors are a daily-rotating salted hash).
- **Content warnings:** optional interstitial per link, with custom text on Pro and a
  pass-through rate in analytics.
- **In-app browsers:** visitors inside Instagram, TikTok, Facebook and others see a tip on
  opening the page in their real browser.
- **Smart links** (`/l/<slug>`): short links with an **adult content warning that is on by
  default**. Visitors see an 18+ page in one of 12 original designs (live phone and desktop
  preview in the dashboard), with default wording in English, Spanish, Portuguese, French,
  German or Italian based on the visitor's browser. Visitors can continue or leave, and each
  link shows warning views, confirmation rate and visits for the last 30 days. Free: 3 links.
  Pro: 100 links, custom wording, and badge removal. Bio-page content warnings can use the same
  designs (Editor → Theme → Content-warning page style).
- **Global dashboard** (`/dashboard`): one view of every bio-page view and smart-link visit.
  Includes:
  - Date presets (today, yesterday, last 24 or 48 hours, last 7/14/30/90 days, last week, last
    month, this year) and a custom range.
  - A time zone picker that defaults to the browser's own zone.
  - Totals, active links, average views per link, and growth against the previous period.
  - An hourly or daily chart showing total, average and peak.
  - Top performers.
  - A live activity feed and a real-time panel (views per minute over the last 30 minutes,
    refreshed every 5 seconds).
  - CSV export.

  Pro adds a world map (log-scale shading), top countries and live locations. Free history is
  limited to 30 days.
- **Analytics:** views, daily-unique visitors, clicks, CTR, a daily chart, and per-link stats.
  Pro adds traffic sources, referrers, countries, devices and up to 365 days.
- **Billing:** Stripe Checkout (monthly or yearly), the Customer Portal, signed and idempotent
  webhooks, and server-enforced plan limits. Downgrading never deletes data.
- **Account:** change password, and delete account (cancels the subscription and removes all data).

## Tech stack

Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript ·
Tailwind CSS v4 · shadcn/ui (Base UI) · PostgreSQL + Prisma 7 · Auth.js v5 · Stripe ·
Recharts · dnd-kit · Zustand · Vitest · Playwright + axe

## Quick start (local development)

Requirements: **Node.js 20.9 or newer** (developed on 24) and npm. No system PostgreSQL is
needed, because a local server runs from `node_modules`.

```bash
cd tendril
npm install
```

npm 11 blocks dependency install scripts by default. If `prisma generate` or the database
fails to start after installing, approve the scripts these packages need, then rebuild them:

```bash
npm install-scripts approve prisma @prisma/engines @embedded-postgres/windows-x64 esbuild unrs-resolver
```

```bash
npm rebuild
```

On macOS or Linux, replace `@embedded-postgres/windows-x64` with your platform's package
(for example `@embedded-postgres/darwin-arm64` or `@embedded-postgres/linux-x64`).

1. **Configure the environment.** Copy `.env.example` to `.env`, then set `AUTH_SECRET`
   (generate one with `npx auth secret`) and `CRON_SECRET` (any random string). The defaults
   work for everything else locally.

2. **Start the database** in its own terminal, and leave it running:

   ```bash
   npm run db:start
   ```

   This runs PostgreSQL on `127.0.0.1:54329` with its data in `.pgdata/`. To use your own
   Postgres instead, point `DATABASE_URL` at it and skip this step.

3. **Create the tables**, and optionally seed the demo account (30 days of sample analytics):

   ```bash
   npm run db:migrate
   ```

   ```bash
   npm run db:seed
   ```

   The demo login is defined in [`prisma/seed.mts`](prisma/seed.mts). Its public page is
   `http://localhost:3000/demo`.

4. **Run the app:**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `AUTH_SECRET` | yes | Secret for signing session tokens. Generate with `npx auth secret`. |
| `AUTH_URL` | yes | Base URL of the app, used by Auth.js callbacks. |
| `AUTH_TRUST_HOST` | prod/proxy | Set to `true` behind a reverse proxy or with `next start`. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | no | Enables "Continue with Google". Callback URL: `<AUTH_URL>/api/auth/callback/google`. |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL for canonical links, OG tags, QR codes and Stripe redirects. **Read at build time.** |
| `CRON_SECRET` | yes | Bearer token for `/api/cron/rollup` and `/api/internal/revalidate`. |
| `STRIPE_SECRET_KEY` | for billing | Stripe **test** secret key (`sk_test_…`). |
| `STRIPE_WEBHOOK_SECRET` | for billing | Webhook signing secret (`whsec_…`). |
| `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` | for billing | Price IDs of the two Pro prices. |
| `ALLOW_LIVE_STRIPE` | no | Live keys (`sk_live_…`) are refused unless this is `true`. |
| `RESEND_API_KEY` | prod | Sends password-reset and confirmation emails via [Resend](https://resend.com). |
| `MAIL_FROM` | prod | Sender address, verified in Resend. |
| `MAIL_TRANSPORT` | no | `resend`, `file` or `disabled`. Defaults to `file` in development: emails are appended to `.mail-outbox.jsonl` so you can open the links locally. In production without a key, emails aren't sent. |
| `DISABLE_RATE_LIMITS` | test only | `true` turns off rate limits for local e2e runs. Never set it in production. |

When Stripe isn't configured, the app still works: the billing page explains that payments
aren't set up, and the upgrade buttons are disabled.

## Stripe setup (test mode)

1. In the Stripe Dashboard (test mode), create a product **Pro** with two recurring prices:
   **$6 per month** and **$60 per year**. Put their IDs in `STRIPE_PRICE_PRO_MONTHLY` and
   `STRIPE_PRICE_PRO_YEARLY`.
2. Copy your test secret key into `STRIPE_SECRET_KEY`.
3. Enable the Customer Portal under Settings → Billing → Customer portal, and allow
   canceling and switching between the two prices.
4. Forward webhooks to your local app with the [Stripe CLI](https://stripe.com/docs/stripe-cli),
   and put the `whsec_…` value it prints into `STRIPE_WEBHOOK_SECRET`:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

5. Upgrade from **Dashboard → Billing** with the test card `4242 4242 4242 4242`, any
   future expiry date, and any CVC.

In production, add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` with these
events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run db:start` | Local PostgreSQL (embedded, port 54329). |
| `npm run db:migrate` | Create and apply migrations in development. |
| `npm run db:deploy` | Apply migrations in production. |
| `npm run db:seed` | (Re)create the demo account with sample analytics. |
| `npm run typecheck` | Generate route types and run TypeScript. |
| `npm run lint` | ESLint. |
| `npm test` | Unit tests (Vitest). |
| `npm run test:e2e` | End-to-end tests (Playwright). |

## Testing

- **Unit tests** (`tests/unit`) cover validation, URL safety, plan rules, theme contrast,
  referrer classification and user-agent parsing:

  ```bash
  npm test
  ```

- **End-to-end tests** (`tests/e2e`) cover sign-up, onboarding, the editor, public pages,
  redirects, content warnings, the in-app tip, analytics, billing (with signed test
  webhooks), settings, account deletion, and accessibility (axe, WCAG 2.1 AA) plus phone
  layouts, plus password reset and email confirmation (they read links from the local mail
  outbox). They need the database running, `MAIL_TRANSPORT=file` and `DISABLE_RATE_LIMITS=true`
  in `.env`, and they re-seed the demo account before running:

  ```bash
  npm run test:e2e
  ```

  The tests use your installed Chrome (`channel: "chrome"`), so no browser download is
  needed. They reuse a server already running on port 3000, or start `npm run dev`. To test
  the production build, run `npm run build && npm start` first, or point `E2E_BASE_URL`
  at another server.

## Deploying to production

**Free hosting:** see [DEPLOY-NETLIFY.md](DEPLOY-NETLIFY.md) for a step-by-step setup on
Netlify + Neon (both free). The notes below apply to any host.

1. **Database:** use a hosted PostgreSQL, set `DATABASE_URL`, and run `npm run db:deploy`.
2. **Environment:** set every variable above. `NEXT_PUBLIC_APP_URL` must be your public URL
   **before** `npm run build`.
3. **Cron:** call `GET /api/cron/rollup` once a day with `Authorization: Bearer $CRON_SECRET`.
   It builds daily rollups and deletes raw events older than 400 days.
4. **Visitor countries** come from `x-vercel-ip-country` or `cf-ipcountry`. On another host,
   forward a country header, or countries will show as unknown.
5. **Things to change before real traffic:**
   - **Profile photos** are written to `public/uploads` (see `uploadAvatarAction`). That's fine
     for one server but not for serverless or multiple instances: switch to object storage
     such as S3, R2 or Vercel Blob.
   - **The rate limiter** (`src/lib/rate-limit.ts`) is in memory, so it works per instance.
     Use Redis/Upstash when running more than one.
   - **CDN caching:** public pages send `Cache-Control: s-maxage=3600`. On Vercel, on-demand
     revalidation purges the edge cache. Behind your own CDN, either have it respect Next.js
     revalidation or lower `s-maxage`, or edits can take up to an hour to show there.
6. **Ops endpoint:** after changing data outside the app (database fixes, scripts), clear a
   page's cache with:

   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" -H "content-type: application/json" -d '{"username":"someone"}' https://<your-domain>/api/internal/revalidate
   ```

## Project structure

```
src/
  app/
    page.tsx                     landing page
    (auth)/login, signup         auth pages and server actions
    (auth)/forgot-password, reset-password, verify-email   account recovery
    (app)/onboarding             claim a username
    (app)/dashboard/…            overview, editor, analytics, billing, settings
    [username]/                  public page, OG image, in-app tip, view beacon
    go/[blockId]/                click redirect (route.ts) and warning page
    l/[slug]/                    smart link redirect, 18+ warning page, "left" page
    api/                         auth, view beacon, analytics, billing, Stripe webhook,
                                 cron rollup, internal revalidate, username check
  components/public-page/        shared renderer (public page and editor preview)
  components/ui/                 shadcn/ui components
  lib/                           auth, db, plans, pages (caching), analytics, stripe, ua
  themes/presets.ts              theme tokens and contrast helpers
  warning-templates/             12 warning designs, wording (6 languages), renderer
  config/                        brand name and reserved usernames
prisma/                          schema, migrations, seed
tests/unit, tests/e2e            Vitest and Playwright suites
scripts/                         local database and dev helpers
```

## How it works

- **Caching:** public page data is cached with `"use cache"` and tagged `page:<username>`.
  Redirect targets are tagged per block and per page. Editor saves call `updateTag`, so the
  next visit shows the change. Stripe webhooks and account deletion expire the tags
  immediately. The first visit to a username waits for the complete page
  (`ensureStatic = "navigation"`), so unknown names get a real 404.
- **Plan enforcement** happens on the server only (`src/lib/plans.ts`). The UI disables
  locked controls, but every server action and route checks again.
- **Analytics** are read from raw events (`PageView`, `ClickEvent`, `WarningView`), which are
  indexed by page and time. The nightly job also writes `DailyStat` rollups, which are
  available for longer ranges as data grows.

## Known limitations

- **About 150 KB of compressed JavaScript on the public page.** That's mostly the React and
  Next.js runtime that every App Router page loads. The spec's 15 KB target isn't achievable
  with this stack; in testing the page still renders fast (local LCP about 300 ms).
- **Content Security Policy covers framing, base URI, form targets and plugins only.** A strict
  `script-src` needs nonce-based rendering and is a follow-up.
- **Usernames can't be changed** after claiming them.
