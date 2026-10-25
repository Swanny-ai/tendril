"use server";

import { revalidatePath } from "next/cache";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { isClaimable, normalizeHostname, wwwOf } from "@/lib/domain-names";
import { addHostedDomain, refreshDomain, removeHostedDomain } from "@/lib/domains";
import { countLimitError } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { invalidatePageFromAction } from "@/lib/pages";
import { invalidateSmartLinkFromAction } from "@/lib/smart-links";

export type DomainResult = { ok: true; message?: string } | { ok: false; error: string };

export async function addDomainAction(input: string): Promise<DomainResult> {
  const userId = await requireUserId();
  const plan = await getPlan(userId);
  const domainLimit = countLimitError(plan, "customDomains", await db.domain.count({ where: { userId } }));
  if (domainLimit) return { ok: false, error: domainLimit };

  const hostname = normalizeHostname(input);
  if (!hostname) return { ok: false, error: "Enter a domain like links.yourname.com." };
  if (!isClaimable(hostname, appHost)) return { ok: false, error: "That domain can't be used." };
  if (await db.domain.findUnique({ where: { hostname }, select: { id: true } })) return { ok: false, error: "That domain is already connected to an account." };

  // Register it with the host right away so HTTPS can be issued as soon as DNS points here.
  if ((await addHostedDomain(hostname)) === "taken") {
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
    return { ok: false, error: `Not pointing at ViewLink yet. Found: ${status.found.join(", ")}. ${STAGE_MESSAGE.dns}` };
  }
  return { ok: false, error: STAGE_MESSAGE[status.stage] };
}

export async function removeDomainAction(id: string): Promise<DomainResult> {
  const userId = await requireUserId();
  const domain = await db.domain.findFirst({ where: { id, userId }, include: { smartLinks: { select: { slug: true } } } });
  if (!domain) return { ok: false, error: "That domain no longer exists." };

  // 1. Remove it from the host (Vercel/Netlify) first, so a failure leaves everything as it was.
  //    Keep www there if it's also connected as a domain of its own.
  const www = wwwOf(domain.hostname);
  const keep = www && (await db.domain.findUnique({ where: { hostname: www }, select: { id: true } })) ? [www] : [];
  const hosted = await removeHostedDomain(domain.hostname, keep);
  if (hosted === "error") return { ok: false, error: "Couldn't remove the domain from the hosting right now. Please try again." };

  // 2. Remove it from ViewLink. Its links fall back to the ViewLink domain; a Root link becomes a normal link.
  await db.smartLink.updateMany({ where: { domainId: id }, data: { atRoot: false } });
  const pages = await db.page.findMany({ where: { domainId: id }, select: { id: true } });
  await db.page.updateMany({ where: { domainId: id }, data: { atRoot: false } });
  await db.domain.delete({ where: { id } });
  for (const l of domain.smartLinks) invalidateSmartLinkFromAction(l.slug);
  for (const p of pages) await invalidatePageFromAction(p.id);
  revalidatePath("/dashboard/domains");
  revalidatePath("/dashboard/links");
  return hosted === "manual"
    ? { ok: true, message: `${domain.hostname} was removed from ViewLink. The hosting API token isn't set, so remove it from the hosting dashboard too.` }
    : { ok: true, message: `${domain.hostname} was removed everywhere.` };
}
