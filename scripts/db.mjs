// Local PostgreSQL for development, run from node_modules (no system install).
// Usage: npm run db:start   (keeps running; Ctrl+C to stop)
// Data lives in ./.pgdata. Production uses a hosted Postgres via DATABASE_URL.
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PGPORT_DEV ?? 54329);
const databaseDir = path.resolve(".pgdata");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "tendril",
  password: "tendril",
  port,
  persistent: true,
  onLog: () => {},
});

const fresh = !fs.existsSync(path.join(databaseDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();
for (const name of ["tendril", "tendril_test"]) {
  try {
    await pg.createDatabase(name);
  } catch {
    // already exists
  }
}
console.log(`[db] postgres ready on 127.0.0.1:${port} (databases: tendril, tendril_test)`);

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
