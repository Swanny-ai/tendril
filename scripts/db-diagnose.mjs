// Prints why the build can't reach the database, without ever printing the password.
// Used by scripts/migrate-deploy.sh when `prisma migrate deploy` fails.
import net from "node:net";
import dns from "node:dns/promises";
import pg from "pg";

const raw = process.env.DATABASE_URL ?? "";
console.log("[db-diagnose] DATABASE_URL set:", raw.length > 0, "| length:", raw.length);
console.log("[db-diagnose] has leading/trailing whitespace or quotes:", raw !== raw.trim() || /^["']|["']$/.test(raw.trim()));
let url;
try {
  url = new URL(raw.trim());
} catch (e) {
  console.log("[db-diagnose] not a valid URL:", e.message);
  process.exit(0);
}
console.log("[db-diagnose] protocol:", url.protocol, "| host:", url.hostname, "| port:", url.port || "(default 5432)", "| db:", url.pathname);
console.log("[db-diagnose] user set:", !!url.username, "| password set:", !!url.password, "| params:", [...url.searchParams.keys()].join(","));
console.log("[db-diagnose] param values:", [...url.searchParams.entries()].map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" "));

try {
  const addrs = await dns.lookup(url.hostname, { all: true });
  console.log("[db-diagnose] dns:", addrs.map((a) => `${a.address}(v${a.family})`).join(", "));
} catch (e) {
  console.log("[db-diagnose] dns failed:", e.code);
}

await new Promise((resolve) => {
  const s = net.connect({ host: url.hostname, port: Number(url.port || 5432), timeout: 8000 }, () => {
    console.log("[db-diagnose] tcp: connected");
    s.end();
    resolve();
  });
  s.on("timeout", () => { console.log("[db-diagnose] tcp: timeout"); s.destroy(); resolve(); });
  s.on("error", (e) => { console.log("[db-diagnose] tcp error:", e.code, e.message); resolve(); });
});

const client = new pg.Client({ connectionString: raw.trim(), connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  const r = await client.query("select version()");
  console.log("[db-diagnose] pg: connected OK,", String(r.rows[0].version).split(" ").slice(0, 2).join(" "));
} catch (e) {
  console.log("[db-diagnose] pg error:", e.code ?? "", e.message);
} finally {
  await client.end().catch(() => {});
}
