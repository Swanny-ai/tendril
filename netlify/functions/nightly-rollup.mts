// Netlify scheduled function: runs the nightly analytics rollup once a day (UTC midnight).
// It calls the app's own protected endpoint, so the logic stays in src/app/api/cron/rollup.
export default async function nightlyRollup() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("nightly-rollup: URL or CRON_SECRET is not set");
    return new Response("missing config", { status: 500 });
  }
  const res = await fetch(`${base}/api/cron/rollup`, { headers: { authorization: `Bearer ${secret}` } });
  const body = await res.text();
  console.log(`nightly-rollup: ${res.status} ${body.slice(0, 200)}`);
  return new Response(body, { status: res.status });
}

export const config = { schedule: "@daily" };
