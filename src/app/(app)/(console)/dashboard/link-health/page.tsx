import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Gauge, Globe, HeartPulse, Link2, Lock, Monitor, Power, Smartphone, TriangleAlert, X } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appUrl } from "@/config/brand";
import { countryName } from "@/lib/analytics/global";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { healthQuota, latestHealthChecks } from "@/lib/link-health";
import { CLIENTS, HEALTH_CHECKS_PER_DAY, type HealthResult, type HealthStatus, type Outcome } from "@/lib/link-health-rules";
import { PAID_PLANS, PLAN_LABEL } from "@/lib/plan-rules";
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

const STATUS: Record<HealthStatus | "unchecked", { label: string; tone: string; dot: string }> = {
  healthy: { label: "Healthy", tone: "bg-primary/15 text-primary", dot: "bg-primary" },
  warning: { label: "Needs attention", tone: "bg-amber-500/15 text-amber-400", dot: "bg-amber-400" },
  down: { label: "Down", tone: "bg-red-500/15 text-red-400", dot: "bg-red-400" },
  unchecked: { label: "Not checked", tone: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/40" },
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

  const paid = quota.limit > 0;
  const perPlan = PAID_PLANS.map((p) => `${PLAN_LABEL[p]} ${HEALTH_CHECKS_PER_DAY[p]}`).join(" · ");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <HeartPulse className="size-6 text-primary" aria-hidden /> Link Health
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We open each link like Instagram, Facebook, TikTok and phone browsers do, check it sends people to their real browser, and test where it leads.
          </p>
        </div>
        {paid ? (
          <div className="rounded-full border bg-card px-4 py-2 text-sm" title="Checks reset every day at midnight UTC">
            <span className="font-semibold tabular-nums">{quota.left}</span>
            <span className="text-muted-foreground"> / {quota.limit} checks left today</span>
          </div>
        ) : null}
      </div>

      {paid ? null : (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Link checks are part of the paid plans</p>
            <p className="text-sm text-muted-foreground">Checks a day: {perPlan}.</p>
          </div>
          <Link href="/dashboard/billing" className={buttonVariants({ size: "sm" })}>
            Upgrade
          </Link>
        </div>
      )}

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
        <div className="space-y-3">
          {rows.map((r) => {
            const last = latest.get(r.id);
            const s = STATUS[last?.status ?? "unchecked"];
            return (
              <section key={r.id} aria-label={bare(r.url)} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("size-2.5 shrink-0 rounded-full", s.dot)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <a href={r.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-sm font-medium hover:underline">
                      {bare(r.url)}
                    </a>
                    <p className="truncate text-xs text-muted-foreground">
                      {KIND_LABEL[r.type]}
                      {r.note ? ` · ${r.note}` : ""}
                      {last ? ` · Checked ${checkedAt(last.checkedAt)}` : ""}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", s.tone)}>{s.label}</span>
                  <CheckButton
                    kind={r.kind}
                    id={r.id}
                    label={bare(r.url)}
                    checked={!!last}
                    disabled={quota.left <= 0}
                    reason={paid ? undefined : "Link checks are part of the paid plans"}
                  />
                </div>
                {last ? (
                  <Report result={last.result} />
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">{paid ? "Run a check to see how this link opens in each app and browser." : "Not checked yet."}</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const WORST: Outcome[] = ["fail", "warn", "ok"];
const worst = (xs: Outcome[]): Outcome => WORST.find((o) => xs.includes(o)) ?? "ok";

/** The latest check, small: six tiles, then what needs a look, then the full detail on demand. */
function Report({ result: r }: { result: HealthResult }) {
  const appsOk = r.clients.filter((c) => c.outcome === "ok").length;
  const destOk = r.destinations.filter((d) => d.outcome !== "fail").length;
  const firstBadDest = r.destinations.find((d) => d.outcome !== "ok");
  const blocked = r.countries.filter((c) => !c.ok).length + r.otherBlocked;
  const speed = r.speedMs == null ? null : r.speedMs / 1000;

  const tiles: { label: string; icon: typeof Check; value: string; outcome: Outcome; title?: string }[] = [
    { label: "Status", icon: Power, value: r.live.outcome === "ok" ? "On" : "Off", outcome: r.live.outcome, title: r.live.note },
    { label: "Apps", icon: Smartphone, value: `${appsOk}/${r.clients.length} open`, outcome: worst(r.clients.map((c) => c.outcome)) },
    { label: "In-app", icon: ExternalLink, value: r.inApp.outcome === "ok" ? "Works" : "Check", outcome: r.inApp.outcome, title: r.inApp.note },
    { label: "Countries", icon: Globe, value: blocked ? `${blocked} blocked` : "All open", outcome: blocked ? "warn" : "ok", title: r.rules.join(" · ") || undefined },
    {
      label: r.kind === "page" ? "Buttons" : "Destination",
      icon: Link2,
      value: r.destinations.length === 0 ? "None yet" : r.kind === "page" ? `${destOk}/${r.destinations.length} work` : (firstBadDest?.note ?? "Works"),
      outcome: r.destinations.length === 0 ? "warn" : worst(r.destinations.map((d) => d.outcome)),
    },
    { label: "Speed", icon: Gauge, value: speed == null ? "No load" : `${speed.toFixed(2)} s`, outcome: speed == null ? "fail" : speed < 2.5 ? "ok" : "warn" },
  ];

  const issues = [
    ...(r.live.outcome !== "ok" ? [{ outcome: r.live.outcome, text: r.live.note }] : []),
    ...r.clients
      .filter((c) => c.outcome !== "ok")
      .map((c) => ({ outcome: c.outcome, text: `${CLIENTS.find((x) => x.key === c.key)?.label ?? c.key}: ${c.note ?? "didn't open"}` })),
    ...(r.inApp.outcome !== "ok" ? [{ outcome: r.inApp.outcome, text: r.inApp.note }] : []),
    ...r.destinations.filter((d) => d.outcome !== "ok").map((d) => ({ outcome: d.outcome, text: `${bare(d.url).replace(/^www\./, "")}: ${d.note}` })),
  ];

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} title={t.title} className={cn("rounded-lg border px-3 py-2", TILE[t.outcome])}>
            <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <t.icon className="size-3.5" aria-hidden /> {t.label}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold">
              <Mark outcome={t.outcome} /> <span className="truncate">{t.value}</span>
            </p>
          </div>
        ))}
      </div>

      {issues.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Needs a look">
          {issues.map((i) => (
            <li
              key={i.text}
              className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", i.outcome === "fail" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300")}
            >
              <Mark outcome={i.outcome} /> {i.text}
            </li>
          ))}
        </ul>
      ) : null}

      <details className="group text-sm">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden /> Details
        </summary>
        <div className="mt-2 space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {r.clients.map((c) => {
              const client = CLIENTS.find((x) => x.key === c.key);
              if (!client) return null;
              return (
                <span key={c.key} className="inline-flex items-center gap-1.5 text-xs" title={c.note ?? `Loaded in ${c.ms} ms`}>
                  {client.icon === "desktop" ? <Monitor className="size-3.5 text-muted-foreground" aria-hidden /> : <PlatformIcon label={ICON_LABEL[client.icon]} />}
                  {client.label}
                  <Mark outcome={c.outcome} />
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {r.countries.map((c) => (
              <span key={c.code} className="inline-flex items-center gap-1.5 text-xs" title={c.ok ? `Open in ${countryName(c.code)}` : `Blocked in ${countryName(c.code)} by your settings`}>
                <CountryFlag code={c.code} size="sm" />
                {c.code === "GB" ? "UK" : countryName(c.code)}
                <Mark outcome={c.ok ? "ok" : "fail"} />
              </span>
            ))}
            {r.otherBlocked ? <span className="text-xs text-muted-foreground">+{r.otherBlocked} more blocked by your settings</span> : null}
          </div>
          {r.destinations.length ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {r.destinations.map((d) => (
                <span key={d.url} className="inline-flex max-w-full items-center gap-1.5 text-xs" title={`${d.url} · ${d.status ? `answered ${d.status}` : "no answer"} · ${d.ms} ms`}>
                  <span className="truncate">{bare(d.url).replace(/^www\./, "")}</span>
                  <span className="text-muted-foreground">{d.note}</span>
                  <Mark outcome={d.outcome} />
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

const TILE: Record<Outcome, string> = { ok: "border-border", warn: "border-amber-500/30 bg-amber-500/5", fail: "border-red-500/30 bg-red-500/5" };

const MARK: Record<Outcome, { icon: typeof Check; tone: string; label: string }> = {
  ok: { icon: Check, tone: "text-primary", label: "Works" },
  warn: { icon: TriangleAlert, tone: "text-amber-400", label: "Needs a look" },
  fail: { icon: X, tone: "text-red-400", label: "Doesn't work" },
};

function Mark({ outcome }: { outcome: Outcome }) {
  const m = MARK[outcome];
  return <m.icon className={cn("size-3.5 shrink-0", m.tone)} strokeWidth={2.5} aria-label={m.label} />;
}
