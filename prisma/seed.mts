// Seeds a local demo account with a page and ~30 days of sample analytics.
// Local development only. Run: npm run db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

export const DEMO_EMAIL = "demo@tendril.test";
export const DEMO_PASSWORD = "tendril-demo-2026";
export const DEMO_USERNAME = "demo";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

async function main() {
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo Creator",
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      pages: {
        create: {
          username: DEMO_USERNAME,
          displayName: "Demo Creator",
          bio: "Ceramics, slow travel, and the occasional bread experiment.",
          themeKey: "orchard",
          blocks: {
            create: [
              { type: "SOCIAL_ROW", position: 0, data: { socials: [{ network: "instagram", handle: "democreator" }, { network: "youtube", handle: "@democreator" }, { network: "tiktok", handle: "democreator" }] } },
              { type: "HEADER", position: 1, title: "New this month" },
              { type: "LINK", position: 2, title: "Spring glaze collection", url: "https://example.com/shop" },
              { type: "LINK", position: 3, title: "Studio vlog #12", url: "https://example.com/vlog-12" },
              { type: "LINK", position: 4, title: "After-dark sketchbook (18+)", url: "https://example.com/sketchbook", contentWarning: true },
              { type: "TEXT", position: 5, data: { text: "Commissions open again in June." } },
            ],
          },
        },
      },
    },
    include: { pages: { include: { blocks: true } } },
  });

  await db.smartLink.deleteMany({ where: { slug: { in: ["demo-vip", "demo-shop"] } } });
  await db.smartLink.createMany({
    data: [
      { userId: user.id, slug: "demo-vip", destinationUrl: "https://example.com/vip", label: "VIP page (Instagram bio)", adultWarning: true, warningTemplate: "dusk" },
      { userId: user.id, slug: "demo-shop", destinationUrl: "https://example.com/shop", label: "Shop, no warning", adultWarning: false, warningTemplate: "paper" },
    ],
  });

  const page = user.pages[0];
  const links = page.blocks.filter((b) => b.type === "LINK");
  const referrers = [
    ["instagram.com", "social"], ["l.instagram.com", "social"], ["tiktok.com", "social"],
    ["youtube.com", "social"], ["google.com", "search"], [null, "direct"], ["someblog.net", "web"],
  ] as const;
  const countries = ["US", "US", "US", "GB", "CA", "DE", "FR", "BR", "MX", "IN", "AU", "MA", "ES", "JP", "NG", "ZA", "IT", "NL"];
  const devices = [["mobile", "ios"], ["mobile", "android"], ["mobile", "ios"], ["desktop", "windows"], ["desktop", "macos"], ["tablet", "ios"]] as const;
  const browsers = ["safari", "chrome", "instagram-webview", "tiktok-webview", "chrome", "firefox"];

  const views = [];
  const clicks = [];
  const warningViews = [];
  const returning = Array.from({ length: 300 }, () => crypto.randomBytes(8).toString("hex"));
  const now = Date.now();
  for (let d = 0; d < 30; d++) {
    const perDay = 20 + Math.floor(Math.random() * 40) + (30 - d);
    for (let i = 0; i < perDay; i++) {
      const ts = new Date(now - d * 86_400_000 - Math.floor(Math.random() * 86_400_000));
      const [referrerHost, source] = pick(referrers);
      const [device, os] = pick(devices);
      const visitorHash = Math.random() < 0.35 ? pick(returning) : crypto.randomBytes(8).toString("hex");
      const country = pick(countries);
      const browser = pick(browsers);
      views.push({ pageId: page.id, ts, visitorHash, referrerHost, source, country, device, os, browser });
      if (Math.random() < 0.42) {
        const link = pick(links);
        if (link.contentWarning) {
          warningViews.push({ pageId: page.id, blockId: link.id, ts: new Date(ts.getTime() + 2000), visitorHash });
          if (Math.random() < 0.25) continue; // some visitors go back instead of continuing
        }
        clicks.push({ pageId: page.id, blockId: link.id, ts: new Date(ts.getTime() + 4000), visitorHash, country, device, os, browser, warningConfirmed: link.contentWarning });
      }
    }
  }
  // Recent traffic, so the live panels have something to show.
  for (let i = 0; i < 25; i++) {
    const ts = new Date(now - Math.floor(Math.random() * 30 * 60_000));
    const [device, os] = pick(devices);
    views.push({ pageId: page.id, ts, visitorHash: crypto.randomBytes(8).toString("hex"), referrerHost: "instagram.com", source: "social", country: pick(countries), device, os, browser: pick(browsers) });
  }

  // Smart-link visits ("hit" events) for the global dashboard.
  const smartLinks = await db.smartLink.findMany({ where: { userId: user.id }, orderBy: { slug: "desc" } });
  const hits = [];
  for (const [n, link] of smartLinks.entries()) {
    const weight = n === 0 ? 1 : 0.45;
    const recent = Array.from({ length: Math.round(15 * weight) }, () => now - Math.floor(Math.random() * 30 * 60_000));
    const older = Array.from({ length: 30 }, (_, d) =>
      Array.from({ length: Math.round((15 + Math.random() * 30) * weight) }, () => now - d * 86_400_000 - Math.floor(Math.random() * 86_400_000)),
    ).flat();
    for (const t of [...recent, ...older]) {
      const [device, os] = pick(devices);
      hits.push({ linkId: link.id, kind: "hit", ts: new Date(t), visitorHash: crypto.randomBytes(8).toString("hex"), country: pick(countries), device, os, browser: pick(browsers) });
    }
  }
  await db.smartLinkEvent.createMany({ data: hits });

  await db.pageView.createMany({ data: views });
  await db.clickEvent.createMany({ data: clicks });
  await db.warningView.createMany({ data: warningViews });
  console.log(`Seeded ${DEMO_EMAIL} (/${DEMO_USERNAME}) with ${views.length} views, ${clicks.length} clicks and ${hits.length} smart-link visits.`);
}

main().finally(() => db.$disconnect());
