# Deploying Tendril for free (Netlify + Neon)

Everything below runs on free plans:

| Piece | Service | Free plan notes |
| --- | --- | --- |
| Website, API, scheduled job | [Netlify](https://www.netlify.com) | Monthly usage limits. You get `your-name.netlify.app`. |
| PostgreSQL database | [Neon](https://neon.tech) | 0.5 GB storage. It sleeps when idle, so the first request after a quiet spell is about 1 second slower. |
| Code hosting (for automatic deploys) | [GitHub](https://github.com) | Private repositories are free. |
| Payments (test mode) | [Stripe](https://stripe.com) | Test mode is free. Real payments only after you activate the account. |
| Password-reset emails (optional) | [Resend](https://resend.com) | 3,000 emails a month. Without your own domain, it can only send to your own address. |

The project already contains what Netlify needs:

- `netlify.toml` runs the database migrations and then builds the site.
- `netlify/functions/nightly-rollup.mts` runs the analytics rollup every night.

## 1. Create the database (Neon)

1. Sign up at neon.tech and create a project. Pick the region closest to your visitors.
2. Open **Connect**, turn **Connection pooling off**, and copy the connection string. It looks
   like `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`.
   This is your `DATABASE_URL`. Keep it private.

## 2. Put the code on GitHub

Netlify builds from a Git repository. This keeps your local `.env` (with its local-only test
settings) out of the build. `.env` files are already in `.gitignore`.

1. Create a **private** empty repository on github.com, for example `tendril`.
2. In the `tendril` folder, run:

   ```bash
   git init
   git add .
   git commit -m "Tendril"
   git branch -M main
   git remote add origin https://github.com/<you>/tendril.git
   git push -u origin main
   ```

## 3. Create the site (Netlify)

1. Sign up at netlify.com (signing in with GitHub is easiest).
2. Choose **Add new project → Import an existing project → GitHub** and pick the repository.
   Netlify reads `netlify.toml`, so leave the build settings as they are.
3. Before the first deploy, open **Site configuration → Change site name** and choose one. Your
   address becomes `https://<site-name>.netlify.app`.
4. Under **Site configuration → Environment variables**, add the following:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | The Neon connection string from step 1 |
   | `AUTH_SECRET` | A random secret. Generate one with `npx auth secret`, or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `AUTH_URL` | `https://<site-name>.netlify.app` |
   | `AUTH_TRUST_HOST` | `true` |
   | `NEXT_PUBLIC_APP_URL` | `https://<site-name>.netlify.app` |
   | `CRON_SECRET` | Another random secret (same command) |
   | `STRIPE_SECRET_KEY` | Your Stripe **test** secret key (`sk_test_…`) |
   | `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY` | Price IDs (see step 5) |
   | `STRIPE_WEBHOOK_SECRET` | From step 5 (add it after the first deploy) |
   | `RESEND_API_KEY`, `MAIL_FROM` | Optional, see step 6 |

   Do **not** add `DISABLE_RATE_LIMITS` or `MAIL_TRANSPORT=file`. They're for local testing only.
5. Click **Deploy**. The first build creates all the database tables.

## 4. Check it works

- Open `https://<site-name>.netlify.app`, create an account, claim a username and add a link.
- Visit your public page from your phone, then check **Dashboard → Overview**. The view should
  appear, and on Pro your country should show in **Live activity**.
- The world map uses the visitor country that Netlify passes along. If countries show as
  "Unknown", say so and it can be adjusted.

## 5. Stripe (test mode)

1. In the Stripe Dashboard (test mode), create a product **Pro** with a monthly and a yearly
   price. Put the two price IDs into the Netlify variables.
2. Under **Developers → Webhooks**, add the endpoint
   `https://<site-name>.netlify.app/api/stripe/webhook` with these events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
3. Copy its signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`, then use
   **Deploys → Trigger deploy** so the site picks it up.
4. Upgrade from **Dashboard → Billing** with the test card `4242 4242 4242 4242`.

## 6. Emails (free, with Brevo)

Without email, "forgot password" and "confirm your email" don't send anything (the confirm
banner stays hidden until email works). Brevo's free plan sends 300 emails a day and doesn't
need your own domain:

1. Sign up at brevo.com (free plan).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: enter the address emails
   should come from (for example your Gmail) and confirm the email Brevo sends you.
3. **SMTP & API → API Keys → Generate a new API key**. Copy it.
4. In Netlify, add `BREVO_API_KEY` (the key, marked secret) and set `MAIL_FROM` to
   `Tendril <the-address-you-verified@gmail.com>`, then trigger a deploy.
5. **Security → Authorised IPs**: deactivate IP blocking. Netlify sends from a different IP
   address on almost every request, so with blocking on, Brevo rejects every email with
   `401 unrecognised IP address` (visible in the Netlify function log, not in Brevo's logs).

Emails sent "from" a Gmail address through Brevo can land in spam at first; owning a domain
and verifying it in Brevo fixes that later.

## 7. Creators' custom domains (automatic)

Pro creators can connect their own domains under **Dashboard → Custom domains**. For Tendril
to add each domain to Netlify by itself (so Netlify serves it and issues HTTPS), give it a
Netlify token once:

1. In Netlify, open your avatar → **User settings → Applications → Personal access tokens →
   New access token**. Name it `tendril-domains`, choose an expiry, and copy it.
2. In the site's **Environment variables**, add `NETLIFY_API_TOKEN` with that token (mark it
   secret), then trigger a deploy.

After that, a creator only adds the DNS record shown on the page. The page moves through
"Waiting for DNS → Connecting → Setting up HTTPS → Connected" on its own, and removing a domain
also removes it from Netlify. Without the token, you have to add each domain yourself under
**Domain management → Add a domain alias**. Netlify limits how many domain aliases one site can
have; check its docs if you expect many creators.

## Updating the site

Commit and push to `main`. Netlify rebuilds and runs any new migrations automatically.

## Good to know

- **Rate limits** (sign-in, sign-up, link logging) are kept in memory per server instance. On
  Netlify that memory isn't shared between instances, so the limits are looser than on a single
  server. For stronger limits, move them to a shared store such as Upstash Redis, which also has
  a free plan.
- **Content rules:** Netlify allows legal 18+ content but can remove sites at its discretion.
  Tendril only shows a warning page and redirects. It doesn't host adult media itself.
- **Custom domain:** add it under **Domain management**, then update `AUTH_URL`,
  `NEXT_PUBLIC_APP_URL` and the Stripe webhook URL to match.
