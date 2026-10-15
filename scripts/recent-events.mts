// Dev helper: show the most recent analytics events.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const since = new Date(Date.now() - 10 * 60_000);
const show = (rows: object[]) => rows.forEach((r) => console.log(JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? undefined : v))));
console.log("clicks:"); show(await db.clickEvent.findMany({ where: { ts: { gte: since } }, orderBy: { ts: "desc" }, take: 6, omit: { id: true, visitorHash: true } }));
console.log("views:"); show(await db.pageView.findMany({ where: { ts: { gte: since } }, orderBy: { ts: "desc" }, take: 4, omit: { id: true, visitorHash: true } }));
console.log("warning views:", await db.warningView.count({ where: { ts: { gte: since } } }));
await db.$disconnect();
