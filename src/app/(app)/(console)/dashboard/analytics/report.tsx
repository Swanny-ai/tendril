import Link from "next/link";
import { Globe, Lock } from "lucide-react";
import { siFirefoxbrowser, siGooglechrome, siSafari } from "simple-icons";
import { CountryFlag } from "@/components/country-flag";
import { SocialGlyph, socialColor } from "@/components/public-page/social";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { countryName } from "@/lib/analytics/global";
import type { Analytics, LinkAnalytics } from "@/lib/analytics/queries";
import { cn } from "@/lib/utils";
import { BreakdownCard, StatCard, ViewsClicksChart } from "./charts";

export const fmt = new Intl.NumberFormat("en-US");
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const delta = (cur: number, prev: number) => (prev ? (cur - prev) / prev : null);

const SOURCE_LABELS: Record<string, string> = { social: "Social apps", search: "Search", web: "Other websites", direct: "Direct" };
const OS_LABELS: Record<string, string> = { ios: "iOS", android: "Android", windows: "Windows", macos: "macOS", linux: "Linux", other: "Other", unknown: "Unknown" };

// Platform logos (simple-icons, CC0), white on the brand colour like an app icon.
const SOCIAL_PLATFORMS: Record<string, string> = { Instagram: "instagram", TikTok: "tiktok", Facebook: "facebook", Snapchat: "snapchat", LinkedIn: "linkedin", X: "x" };
const BROWSER_ICONS: Record<string, { path: string; hex: string }> = { Safari: siSafari, Chrome: siGooglechrome, Firefox: siFirefoxbrowser };

export function PlatformIcon({ label }: { label: string }) {
  const network = SOCIAL_PLATFORMS[label];
  const browser = BROWSER_ICONS[label];
  const background = network ? socialColor(network) : browser ? `#${browser.hex}` : undefined;
  return (
    <span
      aria-hidden
      className={cn("grid size-6 shrink-0 place-items-center rounded-md text-white", !background && "bg-muted text-muted-foreground", label === "X" && "ring-1 ring-border")}
      style={background ? { background } : undefined}
    >
      {network ? (
        <SocialGlyph network={network} size={14} />
      ) : browser ? (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" focusable="false">
          <path d={browser.path} />
        </svg>
      ) : (
        <Globe className="size-3.5" />
      )}
    </span>
  );
}

type Breakdowns =Omit<NonNullable<Analytics["breakdowns"]>, "sources" | "referrers"> & Partial<Pick<NonNullable<Analytics["breakdowns"]>, "sources" | "referrers">>;

/** Pro breakdowns: platform, traffic sources and referrers (bio pages only), countries, devices. */
export function BreakdownGrid({ data, note }: { data: Breakdowns; note?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BreakdownCard title="Visitors by platform" items={data.platforms.map((p) => ({ label: p.label, icon: <PlatformIcon label={p.label} />, value: p.count }))} />
      {data.sources ? (
        <BreakdownCard title={`Traffic sources${note ?? ""}`} items={data.sources.map((s) => ({ label: SOURCE_LABELS[s.key] ?? s.key, value: s.count }))} />
      ) : null}
      {data.referrers ? <BreakdownCard title={`Top referrers${note ?? ""}`} items={data.referrers.map((s) => ({ label: s.label, value: s.count }))} /> : null}
      <BreakdownCard title="Countries" items={data.countries.map((c) => ({ label: countryName(c.code), icon: <CountryFlag code={c.code} />, value: c.count }))} />
      <BreakdownCard
        title="Devices"
        items={[
          ...data.devices.map((d) => ({ label: d.key[0].toUpperCase() + d.key.slice(1), value: d.count })),
          ...data.os.map((o) => ({ label: `· ${OS_LABELS[o.key] ?? o.key}`, value: o.count, muted: true })),
        ]}
      />
    </div>
  );
}

export function UpgradeCard() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Lock className="size-6 text-muted-foreground" />
        <div>
          <p className="font-semibold">See where your visitors come from</p>
          <p className="text-sm text-muted-foreground">Platforms, referrers, countries, devices and up to a year of history are part of Pro.</p>
        </div>
        <Link href="/dashboard/billing" className={buttonVariants()}>
          Upgrade to Pro
        </Link>
      </CardContent>
    </Card>
  );
}

/** One deep link: visits, unique visitors, redirects, 18+ confirmations or leaves, then breakdowns. */
export function LinkReport({ data, adultWarning, twoSteps = false }: { data: LinkAnalytics; adultWarning: boolean; twoSteps?: boolean }) {
  const rate = (n: number, d: number) => (d ? `${Math.round((Math.min(n, d) / d) * 100)}%` : "—");
  // Two-Steps pages: visitors open the page, reach Step 2 and tap its links (no redirect, no 18+ page).
  if (twoSteps)
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Visits" value={fmt.format(data.totals.visits)} delta={delta(data.totals.visits, data.previousVisits)} />
          <StatCard label="Visitors" hint="Unique" value={fmt.format(data.totals.visitors)} delta={null} />
          <StatCard label="Opened Step 2" value={fmt.format(data.totals.step2)} delta={null} hint={rate(data.totals.step2, data.totals.visits)} />
          <StatCard label="Link taps" value={fmt.format(data.totals.taps)} delta={null} hint={data.totals.visits ? `${(data.totals.taps / data.totals.visits).toFixed(1)} per visit` : undefined} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Visits and link taps</CardTitle>
            <CardDescription>Last {data.days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ViewsClicksChart data={data.series} labels={{ views: "Visits", clicks: "Link taps" }} />
          </CardContent>
        </Card>
        {data.breakdowns ? <BreakdownGrid data={data.breakdowns} /> : <UpgradeCard />}
      </>
    );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Visits" value={fmt.format(data.totals.visits)} delta={delta(data.totals.visits, data.previousVisits)} />
        <StatCard label="Visitors" hint="Unique" value={fmt.format(data.totals.visitors)} delta={null} />
        <StatCard label="Sent to destination" value={fmt.format(data.totals.redirects)} delta={null} hint={rate(data.totals.redirects, data.totals.visits)} />
        <StatCard
          label={adultWarning ? "Confirmed 18+" : "Left"}
          value={fmt.format(adultWarning ? data.totals.confirms : data.totals.leaves)}
          delta={null}
          hint={adultWarning ? `${rate(data.totals.confirms, data.totals.warningViews)} of ${fmt.format(data.totals.warningViews)} warning views` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visits and redirects</CardTitle>
          <CardDescription>Last {data.days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsClicksChart data={data.series} labels={{ views: "Visits", clicks: "Sent to destination" }} />
        </CardContent>
      </Card>

      {data.breakdowns ? <BreakdownGrid data={data.breakdowns} /> : <UpgradeCard />}
    </>
  );
}
