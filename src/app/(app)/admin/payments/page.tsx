import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { planFromSubscription } from "@/lib/plan-rules";
import { FilterTabs, Header, Pager, Pill, Stat, Table, day, fmt, listParams, money } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Payments" };

export default async function AdminPayments(props: PageProps<"/admin/payments">) {
  await requireAdmin();
  const { page, skip, one } = await listParams(props.searchParams);
  const tab = one("tab") || "plans";
  const [subs, cryptoTotal, cryptoCount, crypto, finished] = await Promise.all([
    db.subscription.findMany({ where: { OR: [{ plan: "PRO" }, { stripeSubscriptionId: { not: null } }] }, orderBy: { updatedAt: "desc" }, include: { user: { select: { id: true, email: true } } } }),
    db.cryptoPayment.count(),
    db.cryptoPayment.count({ where: { status: "finished" } }),
    tab === "crypto"
      ? db.cryptoPayment.findMany({ orderBy: { createdAt: "desc" }, skip, take: 50, include: { user: { select: { id: true, email: true } } } })
      : Promise.resolve([]),
    db.cryptoPayment.aggregate({ where: { status: "finished" }, _sum: { amountCents: true } }),
  ]);
  const active = subs.filter((s) => planFromSubscription(s) === "PRO");
  const yearly = process.env.STRIPE_PRICE_PRO_YEARLY;
  const how = (s: (typeof subs)[number]) => (s.stripeSubscriptionId ? `Card · ${s.stripePriceId && s.stripePriceId === yearly ? "yearly" : "monthly"}` : s.status === "prepaid" ? "Crypto (prepaid)" : "Given by you");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Header title="Payments" intro="Pro plans and crypto payments. Card payments themselves live in Stripe." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pro right now" value={fmt(active.length)} tone="good" />
        <Stat label="Paying by card" value={fmt(active.filter((s) => s.stripeSubscriptionId).length)} hint={<a href="https://dashboard.stripe.com/subscriptions" target="_blank" rel="noreferrer" className="text-primary hover:underline">Open Stripe</a>} />
        <Stat label="Crypto received" value={money(finished._sum.amountCents ?? 0)} hint={`${cryptoCount} finished payments`} />
        <Stat label="Pro ended or canceled" value={fmt(subs.length - active.length)} />
      </div>
      <FilterTabs
        path="/admin/payments"
        name="tab"
        value={tab === "plans" ? "" : tab}
        options={[
          { value: "", label: "Pro plans", count: subs.length },
          { value: "crypto", label: "Crypto payments", count: cryptoTotal },
        ]}
      />
      {tab === "crypto" ? (
        <>
          <Table head={["Account", "Amount", "Plan", "Coin", "Status", "Invoice", "Date"]} empty={!crypto.length}>
            {crypto.map((p) => (
              <tr key={p.id}>
                <td className="max-w-56 truncate">
                  <Link href={`/admin/users/${p.user.id}`} className="hover:underline">
                    {p.user.email}
                  </Link>
                </td>
                <td className="font-medium tabular-nums">{money(p.amountCents)}</td>
                <td className="text-xs">1 {p.interval}</td>
                <td className="text-xs uppercase">{p.payCurrency ?? "—"}</td>
                <td>
                  <Pill tone={p.status === "finished" ? "good" : ["failed", "expired", "refunded"].includes(p.status) ? "warn" : "muted"}>{p.status}</Pill>
                </td>
                <td className="text-xs text-muted-foreground">{p.invoiceId ?? "—"}</td>
                <td className="text-xs whitespace-nowrap text-muted-foreground">{day(p.paidAt ?? p.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <Pager path="/admin/payments" page={page} total={cryptoTotal} params={{ tab }} />
        </>
      ) : (
        <Table head={["Account", "How", "Status", "Until / renews", ""]} empty={!subs.length}>
          {subs.map((s) => {
            const on = planFromSubscription(s) === "PRO";
            return (
              <tr key={s.id}>
                <td className="max-w-64 truncate">
                  <Link href={`/admin/users/${s.user.id}`} className="hover:underline">
                    {s.user.email}
                  </Link>
                </td>
                <td className="text-xs">{how(s)}</td>
                <td>
                  {on ? <Pill tone="good">Pro</Pill> : <Pill>Ended</Pill>} <span className="text-xs text-muted-foreground">{s.status}</span>
                  {s.cancelAtPeriodEnd ? <span className="text-xs text-[var(--persimmon)]"> · cancels</span> : null}
                </td>
                <td className="text-xs text-muted-foreground">{s.currentPeriodEnd ? day(s.currentPeriodEnd) : on ? "No end date" : "—"}</td>
                <td className="text-right">
                  {s.stripeSubscriptionId ? (
                    <a href={`https://dashboard.stripe.com/subscriptions/${s.stripeSubscriptionId}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      Stripe
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
