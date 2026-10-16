// Grant (or remove) the blue verified badge for a page. Only the site owner runs this,
// after checking the page really belongs to the person it claims to be.
//
//   node scripts/verify-page.mjs <username>            grant
//   node scripts/verify-page.mjs <username> --remove   remove
//
// Uses DATABASE_URL (from .env, or set it to your Neon connection string for production).
// If APP_URL and CRON_SECRET are set, the live page's cache is cleared so the badge shows at once.
import "dotenv/config";
import pg from "pg";

const [username, flag] = process.argv.slice(2);
if (!username) {
  console.error("Usage: node scripts/verify-page.mjs <username> [--remove]");
  process.exit(1);
}
const remove = flag === "--remove";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rowCount } = await client.query(`UPDATE "Page" SET "verifiedAt" = ${remove ? "NULL" : "now()"} WHERE username = $1`, [username.toLowerCase()]);
await client.end();
if (!rowCount) {
  console.error(`No page called /${username}.`);
  process.exit(1);
}
console.log(`${remove ? "Removed the verified badge from" : "Verified"} /${username}.`);

const appUrl = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (appUrl && secret) {
  const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/revalidate`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ username: username.toLowerCase() }),
  });
  console.log(res.ok ? "Live page refreshed." : `Couldn't refresh the live page (${res.status}); it updates on the creator's next save.`);
} else {
  console.log("The live page shows the change after its cache refreshes (or the creator's next save).");
}
