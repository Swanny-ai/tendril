import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { checkServing, dnsRecordFor } from "@/lib/domains";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { AddDomainForm, DomainActions } from "./domain-controls";

export const instant = false;
export const metadata: Metadata = { title: "Custom domains" };

export default async function DomainsPage() {
  const userId = await requireUserId();
  const [plan, domains] = await Promise.all([
    getPlan(userId),
    db.domain.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { _count: { select: { smartLinks: true } } } }),
  ]);
  const max = PLAN_LIMITS[plan].customDomains;
  // Whether each DNS-verified domain really loads Tendril right now (Netlify may not serve it yet).
  const serving = await Promise.all(domains.map((d) => (d.verifiedAt ? checkServing(d.hostname) : Promise.resolve(false))));
  const autoNetlify = Boolean(process.env.NETLIFY_API_TOKEN);

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

      {domains.length ? (
        <ul className="space-y-4" aria-label="Your domains">
          {domains.map((d, i) => {
            const record = dnsRecordFor(d.hostname);
            const verified = !!d.verifiedAt;
            const live = verified && serving[i];
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
                          {live ? (
                            <Badge className="bg-[var(--sage-text)] text-white">
                              <CheckCircle2 /> Connected
                            </Badge>
                          ) : verified ? (
                            <Badge variant="secondary">
                              <Clock /> Waiting for Netlify
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock /> Waiting for DNS
                            </Badge>
                          )}
                          {d._count.smartLinks} {d._count.smartLinks === 1 ? "link" : "links"}
                        </CardDescription>
                      </div>
                      <DomainActions id={d.id} hostname={d.hostname} verified={live} />
                    </div>
                  </CardHeader>
                  {!live ? (
                    <CardContent className="space-y-3 text-sm">
                      {verified ? <p className="font-medium">DNS is set up correctly. One step left:</p> : null}
                      <p>At your domain provider (GoDaddy, Namecheap, Cloudflare…), add this DNS record, then press Verify:</p>
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
                            <tr>
                              <td className="px-3 py-2">{record.type}</td>
                              <td className="px-3 py-2">{record.name}</td>
                              <td className="px-3 py-2 break-all">{record.value}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        On Cloudflare, set the record to &ldquo;DNS only&rdquo; (grey cloud). Changes usually show up within minutes, sometimes up to an hour.
                        {autoNetlify ? " HTTPS is set up automatically once it's connected." : ""}
                      </p>
                      {!autoNetlify ? (
                        <p className={verified ? "rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950" : "rounded-lg bg-muted px-3 py-2 text-xs"}>
                          {verified ? "Required: " : "One-time step: "}in Netlify, open your site → <strong>Domain management</strong> →{" "}
                          <strong>Add a domain alias</strong> and enter <span className="font-mono">{d.hostname}</span>, then press Verify. Until then
                          visitors see Netlify&apos;s &ldquo;Not found&rdquo; page. (Add a <span className="font-mono">NETLIFY_API_TOKEN</span> to the
                          site&apos;s environment and Tendril will do this for you.)
                        </p>
                      ) : null}
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
