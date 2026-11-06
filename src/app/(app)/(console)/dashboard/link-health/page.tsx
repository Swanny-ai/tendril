import type { Metadata } from "next";
import Link from "next/link";
import { Check, Gauge, HeartPulse, Link2, Monitor, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { CountryFlag } from "@/components/country-flag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appUrl } from "@/config/brand";
import { countryName } from "@/lib/analytics/global";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { healthQuota, latestHealthChecks } from "@/lib/link-health";
import { CLIENTS, type HealthResult, type HealthStatus, type Outcome } from "@/lib/link-health-rules";
import { parseLanding } from "@/lib/link-landing";
import { pageUrl } from "@/lib/link-targets";
import { requireAccount } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "../analytics/report";
import { CheckButton } from "./check-button";

export const instant = false;
export const metadata: Metadata = { title: "Link Health" };

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
const ICON_LABEL = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", safari: "Safari", chrome: "Chrome", desktop: "" } as const;
const KIND_LABEL = { "two-steps": "Two-Steps", deeplink: "Deeplink", page: "Bio page" } as const;

const STATUS: Record<HealthStatus | "unchecked", { label: string; tone: string }> = {
  healthy: { label: "Healthy", tone: "bg-primary/15 text-primary" },
  warning: { label: "Needs attention", tone: "bg-amber-500/15 text-amber-400" },
  down: { label: "Down", tone: "bg-red-500/15 text-red-400" },
  unchecked: { label: "Not checked", tone: "bg-muted text-muted-foreground" },
};

const checkedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/** Link Health: one card per link or bio page, with its latest check. */
export default async function LinkHealthPage() {
  const { userId } = await requireAccount();
  const [links, pages, quota] = await Promise.all([
    db.smartLink.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { domain: { select: { hostname: true } } } }),
    db.page.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { domain: { select: { hostname: true } } } }),
    healthQuota(userId),
  ]);
  const rows = [
    ...links.map((l) => ({
      id: l.id,
      kind: "link" as const,
      type: (parseLanding(l.landingPage)?.enabled ? "two-steps" : "deeplink") as keyof typeof KIND_LABEL,
      url: smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot),
      note: l.label,
    })),
    ...pages.map((p) => ({ id: p.id, kind: "page" as const, type: "page" as const, url: pageUrl(p, p.domain, appUrl), note: p.displayName || `@${p.username}` })),
  ];
  const latest = await latestHealthChecks(
    userId,
    rows.map((r) => r.id),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <HeartPulse className="size-6 text-primary" aria-hidden /> Link Health
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We open each link the way Instagram, Facebook, TikTok and phone browsers do, check that it sends people to their real browser, test where it leads, and
            check your country rules.
          </p>
        </div>
        <div className="rounded-full border bg-card px-4 py-2 text-sm" title="Checks reset every day at midnight UTC">
          <span className="font-semibold tabular-nums">{quota.left}</span>
          <span className="text-muted-foreground"> / {quota.limit} checks left today</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Link2 className="size-8 text-primary" aria-hidden />
            <p className="font-semibold">No links to check yet</p>
            <p className="max-w-md text-sm text-muted-foreground">Create a Two-Steps page or a Deeplink, then come back to check it.</p>
            <Link href="/dashboard/deeplinks/new" className={buttonVariants({ size: "sm" })}>
              Create a Deeplink
            </Link>
          </CardContent>
        </Card>
      ) : (
        rows.map((r) => {
          const last = latest.get(r.id);
          const s = STATUS[last?.status ?? "unchecked"];
          return (
            <Card key={r.id}>
              <CardContent className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                  <div className="min-w-0">
                    <a href={r.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-[15px] font-medium hover:underline">
                      {bare(r.url)}
                    </a>
                    <p className="truncate text-xs text-muted-foreground">
                      {KIND_LABEL[r.type]}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", s.tone)}>{s.label}</span>
                    <CheckButton kind={r.kind} id={r.id} checked={!!last} disabled={quota.left <= 0} />
                  </div>
                </div>
                {last ? (
                  <Report result={last.result} checked={last.checkedAt} />
                ) : (
                  <p className="border-t pt-3 text-sm text-muted-foreground">Run a check to see how this link opens in each app and browser.</p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function Report({ result: r, checked }: { result: HealthResult; checked: string }) {
  const okDest = r.destinations.filter((d) => d.outcome !== "fail").length;
  return (
    <div>
      <Row label="Status">
        <Item outcome={r.live.outcome}>{r.live.note}</Item>
      </Row>
      <Row label="Opens in">
        {r.clients.map((c) => {
          const client = CLIENTS.find((x) => x.key === c.key);
          if (!client) return null;
          return (
            <Item key={c.key} outcome={c.outcome} title={c.note ?? `Loaded in ${c.ms} ms`}>
              {client.icon === "desktop" ? (
                <span className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground" aria-hidden>
                  <Monitor className="size-3.5" />
                </span>
              ) : (
                <PlatformIcon label={ICON_LABEL[client.icon]} />
              )}
              {client.label}
            </Item>
          );
        })}
      </Row>
      <Row label="In-app">
        <Item outcome={r.inApp.outcome}>{r.inApp.note}</Item>
      </Row>
      <Row label="Countries">
        {r.countries.map((c) => (
          <Item key={c.code} outcome={c.ok ? "ok" : "fail"} title={c.ok ? `Open in ${countryName(c.code)}` : `Blocked in ${countryName(c.code)} by your settings`}>
            <CountryFlag code={c.code} size="sm" />
            {c.code === "GB" ? "UK" : countryName(c.code)}
          </Item>
        ))}
        {r.otherBlocked ? <span className="text-sm text-muted-foreground">+{r.otherBlocked} more blocked by your settings</span> : null}
        {r.rules.map((rule) => (
          <span key={rule} className="text-sm text-muted-foreground">
            {rule}
          </span>
        ))}
      </Row>
      <Row label={r.kind === "page" ? "Buttons" : "Destination"}>
        {r.destinations.length === 0 ? (
          <span className="text-sm text-muted-foreground">No buttons with a link yet</span>
        ) : (
          <>
            {r.kind === "page" ? (
              <span className="text-sm text-muted-foreground">
                {okDest} of {r.destinations.length} work
              </span>
            ) : null}
            {r.destinations.map((d) => (
              <Item key={d.url} outcome={d.outcome} title={`${d.url} · ${d.status ? `answered ${d.status}` : "no answer"} · ${d.ms} ms`}>
                <span className="max-w-[240px] truncate">{bare(d.url).replace(/^www\./, "")}</span>
                <span className="text-xs text-muted-foreground">{d.note}</span>
              </Item>
            ))}
          </>
        )}
      </Row>
      <Row label="Speed">
        {r.speedMs == null ? (
          <span className="text-sm text-muted-foreground">Didn&apos;t load</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Gauge className="size-4 text-muted-foreground" aria-hidden />
            Loads in {(r.speedMs / 1000).toFixed(2)} s
            <span className="text-xs text-muted-foreground">({r.speedMs < 1000 ? "fast" : r.speedMs < 2500 ? "okay" : "slow"})</span>
          </span>
        )}
      </Row>
      <p className="pt-3 text-xs text-muted-foreground">Checked {checkedAt(checked)}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t py-3 sm:flex-row sm:items-center">
      <span className="w-32 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">{children}</div>
    </div>
  );
}

const MARK: Record<Outcome, { icon: typeof Check; tone: string; label: string }> = {
  ok: { icon: Check, tone: "text-primary", label: "Works" },
  warn: { icon: TriangleAlert, tone: "text-amber-400", label: "Needs a look" },
  fail: { icon: X, tone: "text-red-400", label: "Doesn't work" },
};

function Item({ outcome, title, children }: { outcome: Outcome; title?: string; children: ReactNode }) {
  const m = MARK[outcome];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" title={title}>
      {children}
      <m.icon className={cn("size-4", m.tone)} strokeWidth={2.5} aria-label={m.label} />
    </span>
  );
}
