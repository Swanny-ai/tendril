"use server";

import { revalidatePath } from "next/cache";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { isClaimable, normalizeHostname } from "@/lib/domain-names";
import { addNetlifyDomainAlias, checkDns, checkServing } from "@/lib/domains";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { invalidateSmartLinkFromAction } from "@/lib/smart-links";

export type DomainResult = { ok: true; message?: string; netlify?: "added" | "manual" | "error" } | { ok: false; error: string };

export async function addDomainAction(input: string): Promise<DomainResult> {
  const userId = await requireUserId();
  const plan = await getPlan(userId);
  const max = PLAN_LIMITS[plan].customDomains;
  if (max === 0) return { ok: false, error: "Custom domains are part of Pro." };
  if ((await db.domain.count({ where: { userId } })) >= max) return { ok: false, error: `You can connect up to ${max} domains.` };

  const hostname = normalizeHostname(input);
  if (!hostname) return { ok: false, error: "Enter a domain like links.yourname.com." };
  if (!isClaimable(hostname, appHost)) return { ok: false, error: "That domain can't be used." };
  if (await db.domain.findUnique({ where: { hostname }, select: { id: true } })) return { ok: false, error: "That domain is already connected to an account." };

  await db.domain.create({ data: { userId, hostname } });
  const netlify = await addNetlifyDomainAlias(hostname);
  revalidatePath("/dashboard/domains");
  return { ok: true, netlify };
}

export async function verifyDomainAction(id: string): Promise<DomainResult> {
  const userId = await requireUserId();
  const domain = await db.domain.findFirst({ where: { id, userId } });
  if (!domain) return { ok: false, error: "That domain no longer exists." };
  const dnsCheck = await checkDns(domain.hostname);
  if (!dnsCheck.ok) {
    return {
      ok: false,
      error: dnsCheck.found.length
        ? `Not pointing at Tendril yet. Found: ${dnsCheck.found.join(", ")}. DNS changes can take up to an hour.`
        : "No DNS record found yet. Add the record below; changes can take up to an hour to show up.",
    };
  }
  await db.domain.update({ where: { id }, data: { verifiedAt: domain.verifiedAt ?? new Date() } });
  const netlify = await addNetlifyDomainAlias(domain.hostname);
  revalidatePath("/dashboard/domains");
  if (!(await checkServing(domain.hostname))) {
    return {
      ok: false,
      error:
        netlify === "manual"
          ? "DNS is set up, but Netlify doesn't serve this domain yet. Add it in Netlify (see the steps below), then check again."
          : "DNS is set up. Netlify is still adding the domain; check again in a minute.",
    };
  }
  return { ok: true, message: "Connected. Your links can now use this domain." };
}

export async function removeDomainAction(id: string): Promise<DomainResult> {
  const userId = await requireUserId();
  const domain = await db.domain.findFirst({ where: { id, userId }, include: { smartLinks: { select: { slug: true } } } });
  if (!domain) return { ok: false, error: "That domain no longer exists." };
  await db.domain.delete({ where: { id } }); // links fall back to the Tendril domain
  for (const l of domain.smartLinks) invalidateSmartLinkFromAction(l.slug);
  revalidatePath("/dashboard/domains");
  return { ok: true };
}
