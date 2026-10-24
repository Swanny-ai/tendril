import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "../action-button";
import { markPayoutPaidAction } from "../actions";
import { Header, Pill, Stat, Table, day, fmt, money } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Affiliates" };

export default async function AdminAffiliates() {
  await requireAdmin();
  const [payouts, earned, paid, open, referred, top] = await Promise.all([
    // "requested" sorts after "paid", so descending puts the open requests first.
    db.payoutRequest.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 100, include: { user: { select: { id: true, email: true } } } }),
    db.affiliateCommission.aggregate({ _sum: { amountCents: true } }),
    db.payoutRequest.aggregate({ where: { status: "paid" }, _sum: { amountCents: true } }),
    db.payoutRequest.aggregate({ where: { status: "requested" }, _sum: { amountCents: true }, _count: true }),
    db.user.count({ where: { referredById: { not: null } } }),
    db.user.findMany({
      where: { referrals: { some: {} } },
      orderBy: { referrals: { _count: "desc" } },
      take: 25,
      select: { id: true, email: true, affiliateCode: true, _count: { select: { referrals: true, affiliateClicks: true } } },
    }),
  ]);
  const earnedBy = await db.affiliateCommission.groupBy({ by: ["affiliateId"], where: { affiliateId: { in: top.map((t) => t.id) } }, _sum: { amountCents: true } });
  const earnedOf = (id: string) => earnedBy.find((e) => e.affiliateId === id)?._sum.amountCents ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Header title="Affiliates" intro="Payout requests and the people bringing sign-ups. Send the money (PayPal / Wise), then mark the request as paid." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="To pay now" value={money(open._sum.amountCents ?? 0)} hint={`${open._count} request${open._count === 1 ? "" : "s"}`} tone={open._count ? "warn" : undefined} />
        <Stat label="Paid out" value={money(paid._sum.amountCents ?? 0)} />
        <Stat label="Commissions earned" value={money(earned._sum.amountCents ?? 0)} />
        <Stat label="Referred accounts" value={fmt(referred)} />
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Payout requests</h2>
        <Table head={["Affiliate", "Amount", "Send to", "Status", "Asked", ""]} empty={!payouts.length}>
          {payouts.map((p) => (
            <tr key={p.id}>
              <td className="max-w-56 truncate">
                <Link href={`/admin/users/${p.user.id}`} className="hover:underline">
                  {p.user.email}
                </Link>
              </td>
              <td className="font-medium tabular-nums">{money(p.amountCents)}</td>
              <td className="text-xs">{p.email}</td>
              <td>{p.status === "paid" ? <Pill tone="good">Paid {day(p.paidAt)}</Pill> : <Pill tone="warn">To pay</Pill>}</td>
              <td className="text-xs text-muted-foreground">{day(p.createdAt)}</td>
              <td className="text-right">
                {p.status === "requested" ? (
                  <ActionButton action={markPayoutPaidAction} fields={{ id: p.id }} variant="default" confirm={`Did you send ${money(p.amountCents)} to ${p.email}?`}>
                    <CheckCircle2 /> Mark paid
                  </ActionButton>
                ) : null}
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Top affiliates</h2>
        <Table head={["Affiliate", "Code", "Clicks", "Sign-ups", "Earned"]} empty={!top.length}>
          {top.map((t) => (
            <tr key={t.id}>
              <td className="max-w-64 truncate">
                <Link href={`/admin/users/${t.id}`} className="hover:underline">
                  {t.email}
                </Link>
              </td>
              <td className="text-xs">{t.affiliateCode ?? "—"}</td>
              <td className="tabular-nums">{fmt(t._count.affiliateClicks)}</td>
              <td className="tabular-nums">{fmt(t._count.referrals)}</td>
              <td className="tabular-nums">{money(earnedOf(t.id))}</td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}
