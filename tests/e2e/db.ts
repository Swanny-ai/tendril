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
