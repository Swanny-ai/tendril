import "dotenv/config";
import { execSync } from "node:child_process";

// Re-seed the demo account so analytics tests have predictable data, then clear
// the cached public page (the seed writes to the database directly).
export default async function globalSetup() {
  execSync("npx tsx prisma/seed.mts", { stdio: "inherit" });
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/internal/revalidate`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify({ username: "demo" }),
  });
  if (!res.ok) throw new Error(`Cache revalidation failed: ${res.status}`);
}
