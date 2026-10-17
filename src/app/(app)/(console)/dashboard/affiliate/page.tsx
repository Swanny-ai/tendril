import type { Metadata } from "next";
import { ArrowRight, Clock, Gift, MousePointerClick, Sprout, UserPlus, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appUrl } from "@/config/brand";
import { getAffiliateOverview } from "@/lib/affiliate";
import { formatUsd, HOLD_DAYS, LEVELS, maskEmail, MIN_PAYOUT_CENTS } from "@/lib/affiliate-rules";
import { requireUserId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PayoutForm, ShareLink } from "./affiliate-forms";

export const instant = false;
export const metadata: Metadata = { title: "Affiliate" };

const fmt = new Intl.NumberFormat("en-US");
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");

export default async function AffiliatePage() {
  const userId = await requireUserId();
  const o = await getAffiliateOverview(userId);
  const link = `${appUrl}/join/${o.code}`;
  const progress = o.next ? Math.min(1, (o.funnel.customers - o.level.from) / (o.next.from - o.level.from)) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero: level, rate and the way up */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[#5b3fd1] via-[#6d4fe0] to-[#f2643d] p-6 text-white shadow-sm md:p-8">
        <div aria-hidden className="absolute -top-20 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Sprout className="size-4" /> Grow with ViewLink
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Earn {o.level.rate}% of every payment from creators you invite</h1>
            <p className="mt-2 text-white/80">
              Lifetime, on every monthly or yearly payment. Your rate grows as you bring in paying customers.
            </p>
          </div>
          <div className="w-full max-w-xs rounded-2xl bg-white/15 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Your level</span>
              <Badge className="bg-white text-[#4a33b0]" data-testid="affiliate-level">
                {o.level.name} · {o.level.rate}%
              </Badge>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/85">
              {o.next
                ? `${o.next.from - o.funnel.customers} more paying ${o.next.from - o.funnel.customers === 1 ? "customer" : "customers"} to ${o.next.name} (${o.next.rate}%)`
                : "Top level reached. Thank you!"}
            </p>
          </div>
        </div>
        <ol className="relative mt-6 flex flex-wrap gap-2 text-xs" aria-label="Levels">
          {LEVELS.map((l) => (
            <li key={l.key} className={cn("rounded-full px-3 py-1", l.key === o.level.key ? "bg-white text-[#4a33b0]" : "bg-white/15 text-white/85")}>
              {l.name} {l.rate}% · {l.from === 0 ? "from the start" : `${l.from}+ paying`}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="size-4 text-primary" /> Your invite link
            </CardTitle>
            <CardDescription>Anyone who signs up within 60 days of opening it counts as your referral.</CardDescription>
          </CardHeader>
          <CardContent>
            <ShareLink link={link} code={o.code} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" /> Payouts
            </CardTitle>
            <CardDescription>
              From {formatUsd(MIN_PAYOUT_CENTS)}, sent within 7 days of your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Available now</p>
            <p className="font-heading text-3xl font-semibold tabular-nums" data-testid="affiliate-available">
              {formatUsd(o.balances.available)}
            </p>
            <div className="mt-4">
              <PayoutForm email={o.payoutEmail} canRequest={!!o.payoutEmail && o.balances.available >= MIN_PAYOUT_CENTS} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel: clicks -> signups -> paying customers */}
      <section aria-label="Your funnel" className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <FunnelStep icon={MousePointerClick} label="Link clicks" value={o.funnel.clicks} />
        <FunnelArrow rate={pct(o.funnel.signups, o.funnel.clicks)} />
        <FunnelStep icon={UserPlus} label="Sign-ups" value={o.funnel.signups} />
        <FunnelArrow rate={pct(o.funnel.customers, o.funnel.signups)} />
        <FunnelStep icon={Sprout} label="Paying customers" value={o.funnel.customers} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Balance label="Pending" hint={`Held ${HOLD_DAYS} days in case of refunds`} cents={o.balances.pending} icon={Clock} />
        <Balance label="Available" hint="Ready to request" cents={o.balances.available} />
        <Balance label="Paid out" hint={o.balances.requested ? `${formatUsd(o.balances.requested)} on its way` : "Sent to you so far"} cents={o.balances.paidOut} />
        <Balance label="Lifetime earnings" hint="Everything you've earned" cents={o.balances.lifetime} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your referrals</CardTitle>
          <CardDescription>
            {o.referrals.length ? `${fmt.format(o.referrals.length)} ${o.referrals.length === 1 ? "creator" : "creators"} joined through your link` : "Nobody yet: share your link to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {o.referrals.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Your referrals">
                <thead className="text-left text-xs text-muted-foreground uppercase">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Creator</th>
                    <th className="py-2 pr-4 font-medium">Plan</th>
                    <th className="py-2 pr-4 font-medium">Joined</th>
                    <th className="py-2 pr-4 text-right font-medium">They paid</th>
                    <th className="py-2 text-right font-medium">You earned</th>
                  </tr>
                </thead>
                <tbody>
                  {o.referrals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{maskEmail(r.email)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={r.plan === "Pro" ? "default" : "secondary"}>{r.plan}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.joined.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(r.paidCents)}</td>
                      <td className="py-3 text-right font-medium tabular-nums">{formatUsd(r.earnedCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Tip: put your invite link in your own bio page, or show its QR code at the end of a video.
            </p>
          )}
        </CardContent>
      </Card>

      {o.payouts.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {o.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    {formatUsd(p.amountCents)} <span className="text-muted-foreground">to {p.email}</span>
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {p.createdAt.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}
                    <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status === "paid" ? "Paid" : "Requested"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function FunnelStep({ icon: Icon, label, value }: { icon: typeof Gift; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
      </p>
      <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">{fmt.format(value)}</p>
    </div>
  );
}

function FunnelArrow({ rate }: { rate: string }) {
  return (
    <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground md:flex-col">
      <ArrowRight className="size-4 rotate-90 md:rotate-0" />
      <span>{rate}</span>
    </div>
  );
}

function Balance({ label, hint, cents, icon: Icon }: { label: string; hint: string; cents: number; icon?: typeof Gift }) {
  return (
    <Card>
      <CardContent className="pt-1">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {Icon ? <Icon className="size-3.5" /> : null} {label}
        </p>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">{formatUsd(cents)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
