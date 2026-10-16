import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Globe, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { wwwOf, type DomainStage } from "@/lib/domain-names";
import { addNetlifyDomainAlias, answers, dnsRecordsFor, netlifyConfigured, refreshDomain } from "@/lib/domains";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { AddDomainForm, AutoRefresh, DomainActions } from "./domain-controls";

export const instant = false;
export const metadata: Metadata = { title: "Custom domains" };

const STEPS: { stage: Exclude<DomainStage, "connected">; label: string }[] = [
  { stage: "dns", label: "DNS record" },
  { stage: "connecting", label: "Connecting" },
  { stage: "https", label: "HTTPS" },
];
const ORDER: DomainStage[] = ["dns", "connecting", "https", "connected"];

const BADGE: Record<DomainStage, string> = {
  dns: "Waiting for DNS",
  connecting: "Connecting",
  https: "Setting up HTTPS",
  connected: "Connected",
};

export default async function DomainsPage() {
  const userId = await requireUserId();
  const [plan, domains] = await Promise.all([
    getPlan(userId),
    db.domain.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { _count: { select: { smartLinks: true } } } }),
  ]);
  const max = PLAN_LIMITS[plan].customDomains;
  // Each visit (and the auto-refresh below) moves pending domains forward on its own.
  const statuses = await Promise.all(domains.map((d) => refreshDomain(d)));
  const pending = statuses.some((s) => s.stage !== "connected");
  // For connected apex domains: does www.<domain> reach it too (over HTTPS)?
  const wwwWorks = await Promise.all(
    domains.map((d, i) => {
      const www = wwwOf(d.hostname);
      if (!www || statuses[i].stage !== "connected") return Promise.resolve(null);
      // Domains connected before www support may lack it on Netlify; adding is a no-op once present.
      return answers("https", www).then(async (ok) => {
        if (!ok) await addNetlifyDomainAlias(d.hostname);
        return ok;
      });
    }),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Custom domains</h1>
        <p className="text-muted-foreground">
          Share links on your own domain, like <span className="font-medium text-foreground">links.yourname.com/vip</span>, instead of {appHost}/l/vip. Pick
          the domain when you create a smart link.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connect a domain</CardTitle>
          <CardDescription>
            {max === 0 ? "Custom domains are part of Pro." : `${domains.length} of ${max} domains used. A subdomain such as links.yourname.com is easiest.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {max === 0 ? (
            <Link href="/dashboard/billing" className={buttonVariants()}>
              Upgrade to Pro
            </Link>
          ) : (
            <AddDomainForm disabled={domains.length >= max} />
          )}
        </CardContent>
      </Card>

      {pending ? <AutoRefresh seconds={20} /> : null}

      {domains.length ? (
        <ul className="space-y-4" aria-label="Your domains">
          {domains.map((d, i) => {
            const records = dnsRecordsFor(d.hostname);
            const www = wwwOf(d.hostname);
            const { stage, problem } = statuses[i];
            const connected = stage === "connected";
            return (
              <li key={d.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="size-4" /> {d.hostname}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-2">
                          <Badge className={connected ? "bg-[var(--sage-text)] text-white" : ""} variant={connected ? "default" : "secondary"}>
                            {connected ? <CheckCircle2 /> : <Loader2 className="animate-spin" />} {BADGE[stage]}
                          </Badge>
                          {d._count.smartLinks} {d._count.smartLinks === 1 ? "link" : "links"}
                        </CardDescription>
                      </div>
                      <DomainActions id={d.id} hostname={d.hostname} verified={connected} />
                    </div>
                  </CardHeader>
                  {!connected ? (
                    <CardContent className="space-y-4 text-sm">
                      <ol className="flex flex-wrap gap-x-6 gap-y-2" aria-label={`Setup progress for ${d.hostname}`}>
                        {STEPS.map((s) => {
                          const done = ORDER.indexOf(stage) > ORDER.indexOf(s.stage);
                          const current = s.stage === stage;
                          return (
                            <li key={s.stage} className={`flex items-center gap-1.5 ${done || current ? "text-foreground" : "text-muted-foreground"}`}>
                              {done ? (
                                <CheckCircle2 className="size-4 text-[var(--sage-text)]" />
                              ) : current ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Circle className="size-4" />
                              )}
                              {s.label}
                            </li>
                          );
                        })}
                      </ol>

                      {stage === "dns" ? (
                        <>
                          <p>At your domain provider (GoDaddy, Namecheap, Cloudflare, Spaceship…), add {records.length > 1 ? "these DNS records" : "this DNS record"}:</p>
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-left">
                              <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                                <tr>
                                  <th className="px-3 py-2">Type</th>
                                  <th className="px-3 py-2">Name / Host</th>
                                  <th className="px-3 py-2">Value / Points to</th>
                                </tr>
                              </thead>
                              <tbody className="font-mono">
                                {records.map((r) => (
                                  <tr key={r.name} className="border-t first:border-t-0">
                                    <td className="px-3 py-2">{r.type}</td>
                                    <td className="px-3 py-2">{r.name}</td>
                                    <td className="px-3 py-2 break-all">{r.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {www ? <>The www record makes <span className="font-mono">{www}</span> open your domain too. </> : null}
                            Remove any other A, AAAA or CNAME records for these names. On Cloudflare, set the record to &ldquo;DNS only&rdquo; (grey cloud).
                            Changes usually show up within minutes, sometimes up to an hour.
                          </p>
                        </>
                      ) : stage === "connecting" ? (
                        <p>Your DNS record is set up. We&apos;re connecting the domain to Tendril.</p>
                      ) : (
                        <p>Your domain works. We&apos;re issuing its HTTPS certificate, which usually takes a few minutes.</p>
                      )}

                      {problem === "taken" ? (
                        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
                          This domain is already attached to another website or hosting account. Remove it there, then press Check now.
                        </p>
                      ) : stage === "connecting" && !netlifyConfigured() ? (
                        <p className="text-xs text-muted-foreground">This is taking longer than usual. If it doesn&apos;t finish within an hour, contact support.</p>
                      ) : null}

                      <p className="text-xs text-muted-foreground">This page checks again every 20 seconds. You can also leave and come back later; it picks up where it left off.</p>
                    </CardContent>
                  ) : www && wwwWorks[i] !== null ? (
                    <CardContent className="text-sm">
                      {wwwWorks[i] ? (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="size-4 text-[var(--sage-text)]" /> <span className="font-mono">{www}</span> also opens this domain.
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          To make <span className="font-mono">{www}</span> work too, add a <span className="font-mono">CNAME</span> record named{" "}
                          <span className="font-mono">www</span> pointing to <span className="font-mono">{appHost}</span>. HTTPS for it is set up automatically
                          after that.
                        </p>
                      )}
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
