// Mark an affiliate payout request as paid, after you've sent the money (PayPal/Wise).
//
//   node scripts/mark-payout-paid.mjs            list open requests
//   node scripts/mark-payout-paid.mjs <id>       mark one as paid
//
// Uses DATABASE_URL (from .env, or set it to your Neon connection string for production).
import "dotenv/config";
import pg from "pg";

const [id] = process.argv.slice(2);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
if (!id) {
  const { rows } = await client.query(
    `SELECT p.id, p."amountCents", p.email, p."createdAt", u.email AS account FROM "PayoutRequest" p JOIN "User" u ON u.id = p."userId" WHERE p.status = 'requested' ORDER BY p."createdAt"`,
  );
  if (!rows.length) console.log("No open payout requests.");
  for (const r of rows) console.log(`${r.id}  $${(r.amountCents / 100).toFixed(2)}  to ${r.email}  (account ${r.account}, ${r.createdAt.toISOString().slice(0, 10)})`);
} else {
  const { rowCount } = await client.query(`UPDATE "PayoutRequest" SET status = 'paid', "paidAt" = now() WHERE id = $1 AND status = 'requested'`, [id]);
  console.log(rowCount ? `Marked ${id} as paid.` : `No open payout request ${id}.`);
}
await client.end();
