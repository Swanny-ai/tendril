import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PLAN_PRICES_USD, planFromSubscription } from "@/lib/plan-rules";
import { paddlePriceIds } from "@/lib/paddle";
import { DayBars, Header, Pill, Stat, ago, daysAgo, fillDays, fmt, money } from "./ui";

export const instant = false;
export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview() {
  await requireAdmin();
  const since = daysAgo;  const [
    users,
    users1,
    users7,
    users30,
    unverified,
    subs,
    cryptoAll,
    crypto30,
    pages,
    published,
    links,
    twoSteps,
    domains,
    verifiedDomains,
    views30,
    clicks30,
    hits30,
    reports,
    payouts,
    signupDays,
    visitDays,
    recentUsers,
    recentCrypto,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since(1) } } }),
    db.user.count({ where: { createdAt: { gte: since(7) } } }),
    db.user.count({ where: { createdAt: { gte: since(30) } } }),
    db.user.count({ where: { emailVerified: null } }),
    db.subscription.findMany({ where: { plan: { in: ["PRO", "BUSINESS"] } }, select: { plan: true, status: true, currentPeriodEnd: true, stripeSubscriptionId: true, stripePriceId: true, paddleSubscriptionId: true, paddlePriceId: true } }),
    db.cryptoPayment.aggregate({ where: { status: "finished" }, _sum: { amountCents: true }, _count: true }),
    db.cryptoPayment.aggregate({ where: { status: "finished", paidAt: { gte: since(30) } }, _sum: { amountCents: true } }),
    db.page.count(),
    db.page.count({ where: { published: true } }),
    db.smartLink.count(),
    db.smartLink.count({ where: { landingPage: { path: ["enabled"], equals: true } } }),
    db.domain.count(),
    db.domain.count({ where: { verifiedAt: { not: null } } }),
    db.pageView.count({ where: { ts: { gte: since(30) }, isBot: false } }),
    db.clickEvent.count({ where: { ts: { gte: since(30) }, isBot: false } }),
    db.smartLinkEvent.count({ where: { ts: { gte: since(30) }, isBot: false, kind: "hit" } }),
    db.linkReport.count(),
    db.payoutRequest.aggregate({ where: { status: "requested" }, _sum: { amountCents: true }, _count: true }),
    db.$queryRaw<{ day: string; n: bigint }[]>`SELECT to_char("createdAt", 'YYYY-MM-DD') AS day, count(*) AS n FROM "User" WHERE "createdAt" >= ${since(30)} GROUP BY 1`,
    db.$queryRaw<{ day: string; n: bigint }[]>`
      SELECT day, sum(n) AS n FROM (
        SELECT to_char(ts, 'YYYY-MM-DD') AS day, count(*) AS n FROM "PageView" WHERE ts >= ${since(30)} AND NOT "isBot" GROUP BY 1
        UNION ALL
        SELECT to_char(ts, 'YYYY-MM-DD') AS day, count(*) AS n FROM "SmartLinkEvent" WHERE ts >= ${since(30)} AND NOT "isBot" AND kind = 'hit' GROUP BY 1
      ) t GROUP BY day`,
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, email: true, createdAt: true, pages: { select: { username: true }, take: 1 } } }),
    db.cryptoPayment.findMany({ where: { status: "finished" }, orderBy: { paidAt: "desc" }, take: 6, include: { user: { select: { id: true, email: true } } } }),
  ]);

  const pro = subs.filter((s) => planFromSubscription(s) !== "FREE");
  const business = pro.filter((s) => s.plan === "BUSINESS").length;
  const card = pro.filter((s) => s.stripeSubscriptionId || s.paddleSubscriptionId);
  // Monthly revenue from card plans: yearly plans count as a twelfth of their price.
  const paddlePrices = paddlePriceIds();
  const yearlyIds = new Set([process.env.STRIPE_PRICE_PRO_YEARLY, paddlePrices.PRO.year, paddlePrices.BUSINESS.year].filter(Boolean));
  const mrr = card.reduce((sum, s) => {
    const prices = PLAN_PRICES_USD[s.plan === "BUSINESS" ? "BUSINESS" : "PRO"];
    return sum + (yearlyIds.has(s.paddlePriceId ?? s.stripePriceId ?? "") ? prices.yearly / 12 : prices.monthly);
  }, 0);
  const crypto = pro.filter((s) => s.status === "prepaid").length;
  const gifted = pro.length - card.length - crypto;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Header title="Overview" intro="Everything on ViewLink at a glance. Numbers are live; bots are left out." />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">People & money</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Accounts" value={fmt(users)} hint={`+${fmt(users1)} today · +${fmt(users7)} this week`} href="/admin/users" />
          <Stat label="Paid accounts" value={fmt(pro.length)} hint={`${pro.length - business} Pro · ${business} Business · ${card.length} card · ${crypto} crypto · ${gifted} given`} href="/admin/payments" tone="good" />
          <Stat label="Card revenue / month" value={`$${fmt(Math.round(mrr))}`} hint="Estimated from active card plans" href="/admin/payments" />
          <Stat label="Crypto revenue" value={money(cryptoAll._sum.amountCents ?? 0)} hint={`${money(crypto30._sum.amountCents ?? 0)} in 30 days · ${cryptoAll._count} payments`} href="/admin/payments" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">What people made</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Bio pages" value={fmt(pages)} hint={`${fmt(published)} live`} href="/admin/pages" />
          <Stat label="Two-Steps links" value={fmt(twoSteps)} href="/admin/links?type=two-steps" />
          <Stat label="Deeplinks" value={fmt(links - twoSteps)} href="/admin/links?type=deeplinks" />
          <Stat label="Custom domains" value={fmt(domains)} hint={`${fmt(verifiedDomains)} connected`} href="/admin/domains" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Last 30 days</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="New accounts" value={fmt(users30)} hint={`${fmt(unverified)} accounts never confirmed their email`} href="/admin/users" />
          <Stat label="Bio page views" value={fmt(views30)} href="/admin/activity" />
          <Stat label="Link visits" value={fmt(hits30)} href="/admin/activity" />
          <Stat label="Clicks on bio pages" value={fmt(clicks30)} href="/admin/activity" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <DayBars label="New accounts per day" data={fillDays(signupDays, 30)} />
          <DayBars label="Visits per day (pages + links)" data={fillDays(visitDays, 30)} />
        </div>
      </section>

      {reports || payouts._count ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {reports ? <Stat label="Open reports" value={fmt(reports)} hint="Visitors reported a link" href="/admin/reports" tone="warn" /> : null}
          {payouts._count ? (
            <Stat label="Payouts to send" value={money(payouts._sum.amountCents ?? 0)} hint={`${payouts._count} affiliate request${payouts._count === 1 ? "" : "s"}`} href="/admin/affiliates" tone="warn" />
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Newest accounts</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {recentUsers.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/50">
                  <span className="min-w-0 truncate">
                    {u.email}
                    {u.pages[0] ? <span className="ml-2 text-muted-foreground">@{u.pages[0].username}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ago(u.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Latest crypto payments</h2>
          {recentCrypto.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {recentCrypto.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/users/${p.user.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/50">
                    <span className="min-w-0 truncate">{p.user.email}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Pill tone="good">{money(p.amountCents)}</Pill>
                      <span className="text-xs text-muted-foreground">{ago(p.paidAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground">No crypto payments yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
