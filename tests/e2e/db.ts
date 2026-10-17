import "dotenv/config";
import pg from "pg";

// Direct DB access for test setup/assertions only (plain SQL keeps Playwright's loader happy).
// Recreated on demand, because one spec file closes it when it finishes while others in the same worker still need it.
let current: pg.Pool | null = null;
const db = () => (current ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 }));

export async function userIdByEmail(email: string): Promise<string> {
  const { rows } = await db().query<{ id: string }>('SELECT id FROM "User" WHERE email = $1', [email]);
  if (!rows[0]) throw new Error(`No user ${email}`);
  return rows[0].id;
}

export async function closeDb() {
  const p = current;
  current = null;
  await p?.end();
}

/** Records one bio-page view for a username, as if a visitor just opened the page. */
export async function addPageView(username: string, country = "MA"): Promise<void> {
  await db().query(
    `INSERT INTO "PageView" ("pageId", ts, "visitorHash", source, country, device)
     SELECT id, now() AT TIME ZONE 'UTC', md5(random()::text), 'direct', $2, 'mobile' FROM "Page" WHERE username = $1`,
    [username, country],
  );
}

/** Puts a user (by username) on a plan directly, as the Stripe webhook would. */
export async function setPlanByUsername(username: string, plan: "FREE" | "PRO"): Promise<void> {
  await db().query(
    `INSERT INTO "Subscription" (id, "userId", plan, status, "updatedAt")
     SELECT 'sub_test_' || p."userId", p."userId", $2::"Plan", 'active', now() FROM "Page" p WHERE p.username = $1
     ON CONFLICT ("userId") DO UPDATE SET plan = $2::"Plan", status = 'active'`,
    [username, plan],
  );
}

/** Connects a custom domain directly (as if DNS had been verified). */
export async function connectDomain(username: string, hostname: string): Promise<void> {
  await db().query(
    `INSERT INTO "Domain" (id, "userId", hostname, "verifiedAt", "createdAt")
     SELECT 'dom_' || md5(random()::text), p."userId", $2, now(), now() FROM "Page" p WHERE p.username = $1`,
    [username, hostname],
  );
}

/** Stores a frozen showcase for a template, as scripts/showcase-page.mjs does. */
export async function showcaseTemplate(layout: string): Promise<void> {
  const data = {
    displayName: "Showcase Star",
    bio: "Showcase bio",
    tagline: "Showcase tagline",
    avatarUrl: null,
    heroUrl: null,
    themeKey: "midnight",
    themeOverrides: null,
    warningTemplate: null,
    verified: false,
    blocks: [{ type: "LINK", title: "Showcase link", url: "https://example.com/showcase", data: {}, contentWarning: false }],
  };
  await db().query(
    `INSERT INTO "TemplateShowcase" (layout, data, "updatedAt") VALUES ($1, $2::jsonb, now())
     ON CONFLICT (layout) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = now()`,
    [layout, JSON.stringify(data)],
  );
}

export async function removeShowcase(layout: string): Promise<void> {
  await db().query(`DELETE FROM "TemplateShowcase" WHERE layout = $1`, [layout]);
}

/** A page's name, theme, tagline and number of blocks. */
export async function pageSummary(username: string): Promise<{ displayName: string; themeKey: string; tagline: string; blocks: number }> {
  const { rows } = await db().query(
    `SELECT p."displayName", p."themeKey", p.tagline, (SELECT count(*)::int FROM "Block" b WHERE b."pageId" = p.id) AS blocks FROM "Page" p WHERE p.username = $1`,
    [username],
  );
  return rows[0];
}
