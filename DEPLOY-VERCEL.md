# Deploying Tendril on Vercel

Tendril runs on Vercel with the same Neon database. `vercel.json` sets the build command (it runs
the database migrations first) and the nightly analytics job.

Vercel's free Hobby plan is for non-commercial use only. Tendril takes payments, so it needs the
Pro plan.

## 1. Create the project

1. Sign in at vercel.com with GitHub.
2. **Add New → Project** and import `Swanny-ai/tendril`. Leave the framework (Next.js) and build
   settings as they are. Name the project `tendril`.

## 2. Environment variables

Under **Settings → Environment Variables**, for **Production**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Your Neon connection string (same as on Netlify) |
| `AUTH_SECRET`, `CRON_SECRET` | Same values as on Netlify, marked **Sensitive** |
| `AUTH_URL`, `NEXT_PUBLIC_APP_URL` | `https://<project>.vercel.app` (or your own domain later) |
| `AUTH_TRUST_HOST` | `true` |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_WEBHOOK_SECRET` | Same as on Netlify (the webhook secret changes in step 4) |
| `BREVO_API_KEY`, `MAIL_FROM` | Same as on Netlify |
| `VERCEL_API_TOKEN` | A token from **Account Settings → Tokens** (lets Tendril add creators' domains) |
| `VERCEL_TEAM_ID` | Your team's id from **Team Settings → General** |

Vercel runs `/api/cron/rollup` every night and sends `CRON_SECRET` with it automatically.

## 3. Deploy

**Deployments → Redeploy** (or push to `main`). Check the site, sign in, open a public page.

## 4. Stripe webhook

In Stripe (test mode), change the webhook endpoint URL to
`https://<project>.vercel.app/api/stripe/webhook`. If you create a new endpoint instead, copy its
signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

## 5. Creators' custom domains

New domains are added to the Vercel project automatically and get their own HTTPS certificate.
The DNS records shown to creators are `A @ → 216.198.79.1` (the older `76.76.21.21` also works) or `CNAME → cname.vercel-dns.com`
(plus `www`). Domains connected while Tendril ran on Netlify must switch their DNS records to
these values once.
