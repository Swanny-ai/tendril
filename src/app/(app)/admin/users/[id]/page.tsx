import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CalendarPlus, Crown, ExternalLink, LogOut, MailCheck, Trash2, UserMinus } from "lucide-react";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { smartLinkUrl } from "@/lib/domains";
import { pageUrl } from "@/lib/link-targets";
import { parseLanding } from "@/lib/link-landing";
import { planFromSubscription } from "@/lib/plan-rules";
import { ActionButton } from "../../action-button";
import { deleteUserAction, setPlanAction, signOutUserAction, suspendUserAction, verifyEmailAction } from "../../actions";
import { LinkRowActions, PageRowActions } from "../../row-actions";
import { Pill, Table, ago, day, daysAgo, fmt, money } from "../../ui";

export const instant = false;
export const metadata: Metadata = { title: "User" };

export default async function AdminUser(props: PageProps<"/admin/users/[id]">) {
  const { userId: me } = await requireAdmin();
  const { id } = await props.params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      accounts: { select: { provider: true } },
      referredBy: { select: { id: true, email: true } },
      pages: { orderBy: { createdAt: "asc" }, include: { domain: { select: { hostname: true } }, _count: { select: { blocks: true } } } },
      smartLinks: { orderBy: { createdAt: "asc" }, include: { domain: { select: { hostname: true } }, _count: { select: { reports: true } } } },
      domains: { orderBy: { createdAt: "asc" } },
      cryptoPayments: { orderBy: { createdAt: "desc" } },
      payoutRequests: { orderBy: { createdAt: "desc" } },
      referrals: { select: { id: true, email: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { referrals: true, affiliateClicks: true } },
    },
  });
  if (!user) notFound();

  const since = daysAgo(30);
  const [views, hits, earned] = await Promise.all([
    db.pageView.groupBy({ by: ["pageId"], where: { pageId: { in: user.pages.map((p) => p.id) }, ts: { gte: since }, isBot: false }, _count: { _all: true } }),
    db.smartLinkEvent.groupBy({ by: ["linkId"], where: { linkId: { in: user.smartLinks.map((l) => l.id) }, ts: { gte: since }, isBot: false, kind: "hit" }, _count: { _all: true } }),
    db.affiliateCommission.aggregate({ where: { affiliateId: id }, _sum: { amountCents: true } }),
  ]);
  const viewsOf = (pageId: string) => views.find((v) => v.pageId === pageId)?._count._all ?? 0;
  const hitsOf = (linkId: string) => hits.find((h) => h.linkId === linkId)?._count._all ?? 0;

  const sub = user.subscription;
  const isPro = planFromSubscription(sub) === "PRO";
  const card = !!(sub?.stripeSubscriptionId || sub?.paddleSubscriptionId) && ["active", "trialing", "past_due"].includes(sub.status);
  const forever = isPro && !card && sub?.status !== "prepaid";
  const self = user.id === me;
  const f = { id: user.id };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All users
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{user.email}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {isPro ? <Pill tone="good">Pro</Pill> : <Pill>Free</Pill>}
            {user.emailVerified ? <Pill tone="info">Email confirmed</Pill> : <Pill tone="warn">Email not confirmed</Pill>}
            {self ? <Pill tone="info">You</Pill> : null}
            <span>Joined {day(user.createdAt)} ({ago(user.createdAt)})</span>
            <span>· Sign-in: {[user.passwordHash ? "password" : null, ...user.accounts.map((a) => a.provider)].filter(Boolean).join(", ") || "none"}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">ID {user.id}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Plan</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {sub ? `${sub.plan} · ${sub.status}` : "Free (never paid)"}
              {sub?.cancelAtPeriodEnd ? " · cancels at period end" : ""}
            </dd>
            <dt className="text-muted-foreground">Until</dt>
            <dd>{sub?.currentPeriodEnd ? day(sub.currentPeriodEnd) : isPro ? "No end date" : "—"}</dd>
            {user.stripeCustomerId ? (
              <>
                <dt className="text-muted-foreground">Stripe</dt>
                <dd>
                  <a href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Open customer <ExternalLink className="size-3" />
                  </a>
                </dd>
              </>
            ) : null}
          </dl>
          {card ? (
            <p className="text-xs text-muted-foreground">Pays by card: change or cancel the plan in {sub?.paddleSubscriptionId ? `Paddle (subscription ${sub.paddleSubscriptionId})` : "Stripe"}.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* Adding time to Pro-with-no-end would shorten it, so only Free or prepaid accounts get these. */}
              {!forever ? (
                <>
                  <ActionButton action={setPlanAction} fields={{ ...f, mode: "month" }}>
                    <CalendarPlus /> +1 month Pro
                  </ActionButton>
                  <ActionButton action={setPlanAction} fields={{ ...f, mode: "year" }}>
                    <CalendarPlus /> +1 year Pro
                  </ActionButton>
                  <ActionButton action={setPlanAction} fields={{ ...f, mode: "forever" }} confirm="Give Pro with no end date?">
                    <Crown /> Pro forever
                  </ActionButton>
                </>
              ) : null}
              {isPro ? (
                <ActionButton action={setPlanAction} fields={{ ...f, mode: "free" }} confirm="Move this account to Free now?">
                  <UserMinus /> Move to Free
                </ActionButton>
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Account</h2>
          <div className="flex flex-wrap gap-2">
            {!user.emailVerified ? (
              <ActionButton action={verifyEmailAction} fields={f}>
                <MailCheck /> Mark email confirmed
              </ActionButton>
            ) : null}
            <ActionButton action={signOutUserAction} fields={f} confirm="Sign this account out on every device?">
              <LogOut /> Sign out everywhere
            </ActionButton>
            {!self ? (
              <>
                <ActionButton action={suspendUserAction} fields={f} confirm="Take all of this account's pages and links offline and sign it out? Nothing is deleted.">
                  <Ban /> Turn off everything
                </ActionButton>
                <ActionButton action={deleteUserAction} fields={f} variant="destructive" confirm="Delete this account with all its pages, links, domains and stats? This can't be undone." typeToConfirm={user.email} redirectTo="/admin/users">
                  <Trash2 /> Delete account
                </ActionButton>
              </>
            ) : null}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Referred by</dt>
            <dd>{user.referredBy ? <Link href={`/admin/users/${user.referredBy.id}`} className="text-primary hover:underline">{user.referredBy.email}</Link> : "—"}</dd>
            <dt className="text-muted-foreground">Affiliate</dt>
            <dd>
              {user.affiliateCode ? `code ${user.affiliateCode} · ` : ""}
              {fmt(user._count.affiliateClicks)} clicks · {fmt(user._count.referrals)} sign-ups · {money(earned._sum.amountCents ?? 0)} earned
            </dd>
            <dt className="text-muted-foreground">Payout email</dt>
            <dd>{user.payoutEmail ?? "—"}</dd>
          </dl>
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Bio pages ({user.pages.length})</h2>
        <Table head={["Page", "Template", "Blocks", "Views (30 d)", "Status", ""]} empty={!user.pages.length}>
          {user.pages.map((p) => (
            <tr key={p.id}>
              <td>
                <a href={pageUrl(p, p.domain, appUrl)} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {pageUrl(p, p.domain, appUrl).replace(/^https?:\/\//, "")}
                </a>
                <span className="block text-xs text-muted-foreground">{p.displayName || "No name"}</span>
              </td>
              <td className="text-xs">{p.layout}</td>
              <td className="tabular-nums">{p._count.blocks}</td>
              <td className="tabular-nums">{fmt(viewsOf(p.id))}</td>
              <td>
                <div className="flex gap-1">
                  {p.published ? <Pill tone="good">Live</Pill> : <Pill tone="warn">Offline</Pill>}
                  {p.verifiedAt ? <Pill tone="info">Badge</Pill> : null}
                </div>
              </td>
              <td>
                <PageRowActions page={p} />
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Links ({user.smartLinks.length})</h2>
        <Table head={["Link", "Type", "Goes to", "Visits (30 d)", "Status", ""]} empty={!user.smartLinks.length}>
          {user.smartLinks.map((l) => {
            const url = smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot);
            return (
              <tr key={l.id}>
                <td>
                  <a href={url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {url.replace(/^https?:\/\//, "")}
                  </a>
                </td>
                <td className="text-xs">{parseLanding(l.landingPage)?.enabled ? "Two-Steps" : "Deeplink"}</td>
                <td className="max-w-56 truncate text-xs text-muted-foreground">{l.destinationUrl}</td>
                <td className="tabular-nums">{fmt(hitsOf(l.id))}</td>
                <td>
                  <div className="flex gap-1">
                    {l.enabled ? <Pill tone="good">On</Pill> : <Pill tone="warn">Off</Pill>}
                    {l._count.reports ? <Pill tone="warn">{l._count.reports} reports</Pill> : null}
                  </div>
                </td>
                <td>
                  <LinkRowActions link={l} />
                </td>
              </tr>
            );
          })}
        </Table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">Domains ({user.domains.length})</h2>
          <Table head={["Domain", "Status", "Added"]} empty={!user.domains.length}>
            {user.domains.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.hostname}</td>
                <td>{d.verifiedAt ? <Pill tone="good">Connected</Pill> : <Pill tone="warn">Waiting for DNS</Pill>}</td>
                <td className="text-xs text-muted-foreground">{day(d.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold">Crypto payments ({user.cryptoPayments.length})</h2>
          <Table head={["Amount", "Plan", "Status", "Date"]} empty={!user.cryptoPayments.length}>
            {user.cryptoPayments.map((p) => (
              <tr key={p.id}>
                <td className="font-medium tabular-nums">{money(p.amountCents)}</td>
                <td className="text-xs">1 {p.interval}</td>
                <td>
                  <Pill tone={p.status === "finished" ? "good" : ["failed", "expired", "refunded"].includes(p.status) ? "warn" : "muted"}>{p.status}</Pill>
                </td>
                <td className="text-xs text-muted-foreground">{day(p.paidAt ?? p.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold">Payout requests ({user.payoutRequests.length})</h2>
          <Table head={["Amount", "To", "Status", "Asked"]} empty={!user.payoutRequests.length}>
            {user.payoutRequests.map((p) => (
              <tr key={p.id}>
                <td className="font-medium tabular-nums">{money(p.amountCents)}</td>
                <td className="text-xs">{p.email}</td>
                <td>{p.status === "paid" ? <Pill tone="good">Paid</Pill> : <Pill tone="warn">To pay</Pill>}</td>
                <td className="text-xs text-muted-foreground">{day(p.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold">People they referred ({user._count.referrals})</h2>
          <Table head={["Account", "Joined"]} empty={!user.referrals.length}>
            {user.referrals.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/users/${r.id}`} className="hover:underline">
                    {r.email}
                  </Link>
                </td>
                <td className="text-xs text-muted-foreground">{ago(r.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </div>
  );
}
