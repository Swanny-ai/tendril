import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { PLAN_LIMITS, PRICES_USD } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { stripeConfigured } from "@/lib/stripe";
import { CheckoutStatus, ManageButton, UpgradeButtons } from "./billing-actions";

export const instant = false;
export const metadata: Metadata = { title: "Billing" };

const PRO_FEATURES = [
  "Unlimited blocks",
  "All themes, custom colors and fonts",
  "Remove the “Made with” badge",
  "Custom content-warning text",
  "Referrers, countries and devices",
  "Up to a year of analytics history",
];

export default async function BillingPage(props: PageProps<"/dashboard/billing">) {
  const { userId, page } = await requirePage();
  const [plan, sub, blockCount, user] = await Promise.all([
    getPlan(userId),
    db.subscription.findUnique({ where: { userId } }),
    db.block.count({ where: { pageId: page.id } }),
    db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } }),
  ]);
  const { checkout } = await props.searchParams;
  const configured = stripeConfigured();
  const limits = PLAN_LIMITS[plan];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your plan and payment details.</p>
      </div>

      <CheckoutStatus state={typeof checkout === "string" ? checkout : null} plan={plan} />

      {!configured ? (
        <p role="note" className="rounded-lg border border-[var(--persimmon)]/40 bg-[var(--persimmon)]/10 px-4 py-3 text-sm">
          Payments aren&apos;t configured on this server. Add Stripe test-mode keys and prices to <code>.env</code> (see README) to enable upgrades.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current plan <Badge variant={plan === "PRO" ? "default" : "secondary"}>{plan === "PRO" ? "Pro" : "Free"}</Badge>
          </CardTitle>
          <CardDescription>
            {plan === "PRO" && sub?.currentPeriodEnd
              ? `${sub.cancelAtPeriodEnd ? "Ends" : "Renews"} on ${sub.currentPeriodEnd.toLocaleDateString("en-US", { dateStyle: "long" })}`
              : plan === "PRO"
                ? "Thanks for supporting Tendril."
                : "You're on the free plan."}
            {sub?.status === "past_due" ? " Your last payment failed. Update your card to keep Pro." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Blocks</span>
              <span className="tabular-nums text-muted-foreground">
                {blockCount} / {limits.maxBlocks >= 200 ? "unlimited" : limits.maxBlocks}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (blockCount / limits.maxBlocks) * 100)}%` }} />
            </div>
          </div>
          {user?.stripeCustomerId && configured ? <ManageButton /> : null}
        </CardContent>
      </Card>

      {plan === "FREE" ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>Upgrade to Pro</CardTitle>
            <CardDescription>
              ${PRICES_USD.monthly}/month, or ${PRICES_USD.yearly}/year (2 months free). Cancel anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="grid gap-2 sm:grid-cols-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-[var(--sage)]" /> {f}
                </li>
              ))}
            </ul>
            <UpgradeButtons disabled={!configured} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
