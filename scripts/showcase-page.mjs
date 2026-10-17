// Make a page the public preview ("mockup") of its template in the Templates gallery, for
// everyone. Only the site owner runs this. The preview hides the page's @username.
// Use pages whose name and photos you have the rights to show as an advertisement.
//
//   node scripts/showcase-page.mjs <username>            showcase it (replaces the template's current one)
//   node scripts/showcase-page.mjs <username> --remove   back to the sample preview
//
// Uses DATABASE_URL (from .env, or set it to your Neon connection string for production).
import "dotenv/config";
import pg from "pg";

const [username, flag] = process.argv.slice(2);
if (!username) {
  console.error("Usage: node scripts/showcase-page.mjs <username> [--remove]");
  process.exit(1);
}
const name = username.toLowerCase().replace(/^\//, "");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query('SELECT id, layout FROM "Page" WHERE username = $1', [name]);
if (!rows.length) {
  console.error(`No page called /${name}.`);
  process.exit(1);
}
if (flag === "--remove") {
  await client.query('UPDATE "Page" SET showcase = false WHERE id = $1', [rows[0].id]);
  console.log(`/${name} is no longer a template preview.`);
} else {
  // One showcase per template.
  await client.query('UPDATE "Page" SET showcase = false WHERE layout = $1', [rows[0].layout]);
  await client.query('UPDATE "Page" SET showcase = true WHERE id = $1', [rows[0].id]);
  console.log(`/${name} is now the preview of the "${rows[0].layout}" template for everyone.`);
}
await client.end();
