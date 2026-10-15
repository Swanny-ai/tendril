import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// Nightly maintenance (call with Authorization: Bearer $CRON_SECRET):
//  1. Roll up the last 3 complete UTC days of raw events into DailyStat.
//  2. Prune raw analytics older than 400 days and webhook ids older than 30 days.
const RAW_RETENTION_DAYS = 400;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let rolledUp = 0;

  for (let i = 1; i <= 3; i++) {
    const day = new Date(today.getTime() - i * 86_400_000);
    const next = new Date(day.getTime() + 86_400_000);
    const range = { gte: day, lt: next };

    const [views, uniques, clicks, refs, countries, devices, blocks] = await Promise.all([
      db.pageView.groupBy({ by: ["pageId"], where: { ts: range }, _count: { _all: true } }),
      db.$queryRaw<{ pageId: string; n: bigint }[]>`SELECT "pageId", COUNT(DISTINCT "visitorHash")::bigint AS n FROM "PageView" WHERE ts >= ${day} AND ts < ${next} GROUP BY 1`,
      db.clickEvent.groupBy({ by: ["pageId"], where: { ts: range, isBot: false }, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["pageId", "referrerHost"], where: { ts: range }, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["pageId", "country"], where: { ts: range }, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["pageId", "device"], where: { ts: range }, _count: { _all: true } }),
      db.clickEvent.groupBy({ by: ["pageId", "blockId"], where: { ts: range, isBot: false }, _count: { _all: true } }),
    ]);

    const pageIds = new Set([...views.map((v) => v.pageId), ...clicks.map((c) => c.pageId)]);
    const bucket = <T extends { pageId: string; _count: { _all: number } }>(rows: T[], key: (r: T) => string | null, pageId: string) =>
      Object.fromEntries(rows.filter((r) => r.pageId === pageId).map((r) => [key(r) ?? "unknown", r._count._all]));

    for (const pageId of pageIds) {
      const data = {
        views: views.find((v) => v.pageId === pageId)?._count._all ?? 0,
        uniques: Number(uniques.find((u) => u.pageId === pageId)?.n ?? 0),
        clicks: clicks.find((c) => c.pageId === pageId)?._count._all ?? 0,
        byReferrer: bucket(refs, (r) => r.referrerHost ?? "direct", pageId),
        byCountry: bucket(countries, (r) => r.country, pageId),
        byDevice: bucket(devices, (r) => r.device, pageId),
        byBlock: bucket(blocks, (r) => r.blockId, pageId),
      };
      await db.dailyStat.upsert({ where: { pageId_day: { pageId, day } }, create: { pageId, day, ...data }, update: data });
      rolledUp++;
    }
  }

  const cutoff = new Date(today.getTime() - RAW_RETENTION_DAYS * 86_400_000);
  const [pv, ce, wv, se] = await Promise.all([
    db.pageView.deleteMany({ where: { ts: { lt: cutoff } } }),
    db.clickEvent.deleteMany({ where: { ts: { lt: cutoff } } }),
    db.warningView.deleteMany({ where: { ts: { lt: cutoff } } }),
    db.stripeEvent.deleteMany({ where: { receivedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } }),
  ]);

  return NextResponse.json({ ok: true, rolledUp, pruned: { pageViews: pv.count, clicks: ce.count, warningViews: wv.count, stripeEvents: se.count } });
}
