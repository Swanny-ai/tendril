// Make a page the public preview ("mockup") of its template in the Templates gallery, for
// everyone. Only the site owner runs this. It stores a frozen copy of the page (its images are
// copied too), so later edits to the page don't change the preview; run it again to refresh.
// New pages made from the template start from this copy. The preview hides the @username.
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
const { rows } = await client.query('SELECT * FROM "Page" WHERE username = $1', [name]);
const page = rows[0];
if (!page) {
  console.error(`No page called /${name}.`);
  process.exit(1);
}

if (flag === "--remove") {
  await client.query('DELETE FROM "TemplateShowcase" WHERE layout = $1', [page.layout]);
  await client.query('UPDATE "Page" SET showcase = false WHERE layout = $1', [page.layout]);
  console.log(`The "${page.layout}" template is back to its sample preview.`);
} else {
  const blocks = await client.query(
    'SELECT type, title, url, data, "contentWarning" FROM "Block" WHERE "pageId" = $1 AND enabled ORDER BY position',
    [page.id],
  );
  let doc = JSON.stringify({
    displayName: page.displayName,
    bio: page.bio,
    tagline: page.tagline,
    avatarUrl: page.avatarUrl,
    heroUrl: page.heroUrl,
    themeKey: page.themeKey,
    themeOverrides: page.themeOverrides,
    warningTemplate: page.warningTemplate,
    verified: !!page.verifiedAt && page.showVerified,
    blocks: blocks.rows,
  });
  // Copy the images the page uses to keys no page owns ("sc<key>"), and point the copy at them.
  const media = await client.query('SELECT key FROM "Media" WHERE "pageId" = $1', [page.id]);
  for (const { key } of media.rows) {
    if (!doc.includes(`/media/${key}`)) continue;
    await client.query(
      `INSERT INTO "Media" (key, "pageId", "contentType", bytes, "createdAt")
       SELECT 'sc' || key, 'showcase', "contentType", bytes, now() FROM "Media" WHERE key = $1
       ON CONFLICT (key) DO NOTHING`,
      [key],
    );
    doc = doc.split(`/media/${key}`).join(`/media/sc${key}`);
  }
  await client.query(
    `INSERT INTO "TemplateShowcase" (layout, data, "updatedAt") VALUES ($1, $2::jsonb, now())
     ON CONFLICT (layout) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = now()`,
    [page.layout, doc],
  );
  await client.query('UPDATE "Page" SET showcase = (id = $1) WHERE layout = $2', [page.id, page.layout]);
  console.log(`/${name} is now the preview of the "${page.layout}" template for everyone (a frozen copy).`);
}
await client.end();
