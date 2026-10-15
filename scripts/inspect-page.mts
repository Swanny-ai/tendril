// Dev helper: print a page and its blocks. Usage: npx tsx scripts/inspect-page.mts <username>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const page = await db.page.findUnique({
  where: { username: process.argv[2] },
  include: { blocks: { orderBy: { position: "asc" } } },
});
console.log(JSON.stringify(page, (_k, v) => (typeof v === "bigint" ? String(v) : v), 2));
await db.$disconnect();
