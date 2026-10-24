import type { Metadata } from "next";
import Link from "next/link";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { countryName } from "@/lib/analytics/global";
import { DayBars, FilterTabs, Header, Stat, Table, daysAgo, fillDays, fmt } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Traffic" };

type Row = { key: string | null; n: bigint };

/** Site-wide traffic: every bio page and link together (bots left out). */
export default async function AdminActivity(props: PageProps<"/admin/activity">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const since = daysAgo(days);

  const [views, hits, clicks, step2, taps, viewDays, hitDays, clickDays, topPages, topLinks, countries, devices, referrers, live] = await Promise.all([
    db.pageView.count({ where: { ts: { gte: since }, isBot: false } }),
    db.smartLinkEvent.count({ where: { ts: { gte: since }, isBot: false, kind: "hit" } }),
    db.clickEvent.count({ where: { ts: { gte: since }, isBot: false } }),
    db.smartLinkEvent.count({ where: { ts: { gte: since }, isBot: false, kind: "step2" } }),
    db.smartLinkEvent.count({ where: { ts: { gte: since }, isBot: false, kind: "tap" } }),
    db.$queryRaw<{ day: string; n: bigint }[]>`SELECT to_char(ts, 'YYYY-MM-DD') AS day, count(*) AS n FROM "PageView" WHERE ts >= ${since} AND NOT "isBot" GROUP BY 1`,
    db.$queryRaw<{ day: string; n: bigint }[]>`SELECT to_char(ts, 'YYYY-MM-DD') AS day, count(*) AS n FROM "SmartLinkEvent" WHERE ts >= ${since} AND NOT "isBot" AND kind = 'hit' GROUP BY 1`,
    db.$queryRaw<{ day: string; n: bigint }[]>`SELECT to_char(ts, 'YYYY-MM-DD') AS day, count(*) AS n FROM "ClickEvent" WHERE ts >= ${since} AND NOT "isBot" GROUP BY 1`,
    db.$queryRaw<{ id: string; username: string; email: string; userId: string; n: bigint }[]>`
      SELECT p.id, p.username, u.email, u.id AS "userId", count(*) AS n FROM "PageView" v
      JOIN "Page" p ON p.id = v."pageId" JOIN "User" u ON u.id = p."userId"
      WHERE v.ts >= ${since} AND NOT v."isBot" GROUP BY p.id, u.id ORDER BY n DESC LIMIT 15`,
    db.$queryRaw<{ id: string; slug: string; email: string; userId: string; n: bigint }[]>`
      SELECT l.id, l.slug, u.email, u.id AS "userId", count(*) AS n FROM "SmartLinkEvent" e
      JOIN "SmartLink" l ON l.id = e."linkId" JOIN "User" u ON u.id = l."userId"
      WHERE e.ts >= ${since} AND NOT e."isBot" AND e.kind = 'hit' GROUP BY l.id, u.id ORDER BY n DESC LIMIT 15`,
    db.$queryRaw<Row[]>`
      SELECT key, sum(n) AS n FROM (
        SELECT country AS key, count(*) AS n FROM "PageView" WHERE ts >= ${since} AND NOT "isBot" GROUP BY 1
        UNION ALL SELECT country AS key, count(*) AS n FROM "SmartLinkEvent" WHERE ts >= ${since} AND NOT "isBot" AND kind = 'hit' GROUP BY 1
      ) t GROUP BY key ORDER BY n DESC LIMIT 12`,
    db.$queryRaw<Row[]>`
      SELECT key, sum(n) AS n FROM (
        SELECT device AS key, count(*) AS n FROM "PageView" WHERE ts >= ${since} AND NOT "isBot" GROUP BY 1
        UNION ALL SELECT device AS key, count(*) AS n FROM "SmartLinkEvent" WHERE ts >= ${since} AND NOT "isBot" AND kind = 'hit' GROUP BY 1
      ) t GROUP BY key ORDER BY n DESC`,
    db.$queryRaw<Row[]>`SELECT source AS key, count(*) AS n FROM "PageView" WHERE ts >= ${since} AND NOT "isBot" GROUP BY 1 ORDER BY n DESC LIMIT 10`,
    db.smartLinkEvent.count({ where: { ts: { gte: daysAgo(5 / 1440) }, isBot: false, kind: "hit" } }),
  ]);
  const share = (rows: Row[]) => {
    const total = rows.reduce((s, r) => s + Number(r.n), 0) || 1;
    return rows.map((r) => ({ key: r.key, n: Number(r.n), pct: Math.round((Number(r.n) / total) * 100) }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Header title="Traffic" intro="Visits across every bio page and link on ViewLink. Bots are left out.">
        <FilterTabs
          path="/admin/activity"
          name="days"
          value={String(days)}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
        />
      </Header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Bio page views" value={fmt(views)} />
        <Stat label="Link visits" value={fmt(hits)} hint={`${fmt(live)} in the last 5 min`} />
        <Stat label="Clicks on bio pages" value={fmt(clicks)} />
        <Stat label="Opened Step 2" value={fmt(step2)} hint="Two-Steps" />
        <Stat label="Link taps" value={fmt(taps)} hint="Two-Steps" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <DayBars label="Bio page views" data={fillDays(viewDays, days)} />
        <DayBars label="Link visits" data={fillDays(hitDays, days)} />
        <DayBars label="Clicks on bio pages" data={fillDays(clickDays, days)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">Top bio pages</h2>
          <Table head={["Page", "Owner", "Views"]} empty={!topPages.length}>
            {topPages.map((p) => (
              <tr key={p.id}>
                <td>
                  <a href={`${appUrl}/${p.username}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    /{p.username}
                  </a>
                </td>
                <td className="max-w-48 truncate text-xs">
                  <Link href={`/admin/users/${p.userId}`} className="hover:underline">
                    {p.email}
                  </Link>
                </td>
                <td className="tabular-nums">{fmt(Number(p.n))}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold">Top links</h2>
          <Table head={["Link", "Owner", "Visits"]} empty={!topLinks.length}>
            {topLinks.map((l) => (
              <tr key={l.id}>
                <td className="font-medium">/{l.slug}</td>
                <td className="max-w-48 truncate text-xs">
                  <Link href={`/admin/users/${l.userId}`} className="hover:underline">
                    {l.email}
                  </Link>
                </td>
                <td className="tabular-nums">{fmt(Number(l.n))}</td>
              </tr>
            ))}
          </Table>
        </section>
        <Breakdown title="Countries" rows={share(countries).map((r) => ({ ...r, label: r.key ? countryName(r.key) : "Unknown" }))} />
        <div className="space-y-6">
          <Breakdown title="Devices" rows={share(devices).map((r) => ({ ...r, label: r.key ?? "Unknown" }))} />
          <Breakdown title="Where bio page visitors came from" rows={share(referrers).map((r) => ({ ...r, label: r.key ?? "Direct" }))} />
        </div>
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; n: number; pct: number }[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <div className="space-y-2 rounded-xl border bg-card p-4">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.label} className="text-sm">
              <div className="flex justify-between">
                <span className="capitalize">{r.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {fmt(r.n)} · {r.pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">No visits yet.</p>
        )}
      </div>
    </section>
  );
}
