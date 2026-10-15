import "dotenv/config";
import pg from "pg";

// Direct DB access for test setup/assertions only (plain SQL keeps Playwright's loader happy).
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

export async function userIdByEmail(email: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM "User" WHERE email = $1', [email]);
  if (!rows[0]) throw new Error(`No user ${email}`);
  return rows[0].id;
}

export const closeDb = () => pool.end();

/** Records one bio-page view for a username, as if a visitor just opened the page. */
export async function addPageView(username: string, country = "MA"): Promise<void> {
  await pool.query(
    `INSERT INTO "PageView" ("pageId", ts, "visitorHash", source, country, device)
     SELECT id, now() AT TIME ZONE 'UTC', md5(random()::text), 'direct', $2, 'mobile' FROM "Page" WHERE username = $1`,
    [username, country],
  );
}

/** Puts a user (by username) on a plan directly, as the Stripe webhook would. */
export async function setPlanByUsername(username: string, plan: "FREE" | "PRO"): Promise<void> {
  await pool.query(
    `INSERT INTO "Subscription" (id, "userId", plan, status, "updatedAt")
     SELECT 'sub_test_' || p."userId", p."userId", $2::"Plan", 'active', now() FROM "Page" p WHERE p.username = $1
     ON CONFLICT ("userId") DO UPDATE SET plan = $2::"Plan", status = 'active'`,
    [username, plan],
  );
}
