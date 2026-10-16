"use server";

import { revalidatePath } from "next/cache";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { isClaimable, normalizeHostname } from "@/lib/domain-names";
import { addNetlifyDomainAlias, refreshDomain, removeNetlifyDomainAlias } from "@/lib/domains";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { invalidateSmartLinkFromAction } from "@/lib/smart-links";

export type DomainResult = { ok: true; message?: string } | { ok: false; error: string };

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

  // Register it with the host right away so HTTPS can be issued as soon as DNS points here.
  if ((await addNetlifyDomainAlias(hostname)) === "taken") {
    return { ok: false, error: "That domain is already used by another website. Remove it there first." };
  }
  await db.domain.create({ data: { userId, hostname } });
  revalidatePath("/dashboard/domains");
  return { ok: true };
}

const STAGE_MESSAGE = {
  dns: "No matching DNS record yet. DNS changes can take up to an hour; this page keeps checking.",
  connecting: "DNS is set up. We're connecting your domain; this page keeps checking.",
  https: "Almost there: we're setting up HTTPS (usually a few minutes). This page keeps checking.",
  connected: "Connected. Your links can now use this domain.",
};

export async function verifyDomainAction(id: string): Promise<DomainResult> {
  const userId = await requireUserId();
  const domain = await db.domain.findFirst({ where: { id, userId } });
  if (!domain) return { ok: false, error: "That domain no longer exists." };
  const status = await refreshDomain(domain);
  revalidatePath("/dashboard/domains");
  if (status.stage === "connected") return { ok: true, message: STAGE_MESSAGE.connected };
  if (status.problem === "taken") return { ok: false, error: "That domain is already used by another website. Remove it there first." };
  if (status.stage === "dns" && status.found.length) {
    return { ok: false, error: `Not pointing at Tendril yet. Found: ${status.found.join(", ")}. ${STAGE_MESSAGE.dns}` };
  }
  return { ok: false, error: STAGE_MESSAGE[status.stage] };
}

export async function removeDomainAction(id: string): Promise<DomainResult> {
  const userId = await requireUserId();
  const domain = await db.domain.findFirst({ where: { id, userId }, include: { smartLinks: { select: { slug: true } } } });
  if (!domain) return { ok: false, error: "That domain no longer exists." };
  await db.domain.delete({ where: { id } }); // links fall back to the Tendril domain
  await removeNetlifyDomainAlias(domain.hostname);
  for (const l of domain.smartLinks) invalidateSmartLinkFromAction(l.slug);
  revalidatePath("/dashboard/domains");
  return { ok: true };
}
