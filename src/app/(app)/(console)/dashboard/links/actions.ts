"use server";

import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { checkLinkTarget } from "@/lib/link-targets";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { invalidateSmartLinkFromAction } from "@/lib/smart-links";
import { normalizeDestinationUrl, smartLinkSchema, type SmartLinkInput } from "@/lib/validation";
import { isWarningTemplateKey } from "@/warning-templates/templates";

export type LinkActionResult = { ok: true; id?: string } | { ok: false; error: string; field?: string };

async function validate(userId: string, input: SmartLinkInput, linkId?: string) {
  const parsed = smartLinkSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: { ok: false as const, error: issue.message, field: String(issue.path[0] ?? "") } };
  }
  const data = parsed.data;
  const dest = normalizeDestinationUrl(data.destinationUrl, appHost);
  if (!dest.ok) return { error: { ok: false as const, error: dest.error, field: "destinationUrl" } };
  if (!isWarningTemplateKey(data.warningTemplate)) return { error: { ok: false as const, error: "Pick a warning design.", field: "warningTemplate" } };

  const limits = PLAN_LIMITS[await getPlan(userId)];
  const customText = Boolean(data.warningTitle || data.warningMessage || data.warningButton);
  if (customText && !limits.customWarningText) return { error: { ok: false as const, error: "Custom warning text is part of Pro." } };
  if (!data.showBadge && !limits.removeBadge) return { error: { ok: false as const, error: "Removing the badge is part of Pro." } };
  // Domain + Root/Path: same rules as bio pages (one root per domain, no shared paths).
  const target = await checkLinkTarget(userId, { domainId: data.domainId, atRoot: data.atRoot }, data.slug, { linkId });
  if (!target.ok) return { error: { ok: false as const, error: target.error, field: "domainId" } };
  const { atRoot } = target.target;

  return {
    data: {
      slug: data.slug,
      destinationUrl: dest.url,
      label: data.label ?? "",
      adultWarning: data.adultWarning,
      warningTemplate: data.warningTemplate,
      warningTitle: data.warningTitle || null,
      warningMessage: data.warningMessage || null,
      warningButton: data.warningButton || null,
      showBadge: data.showBadge,
      openInBrowser: data.openInBrowser,
      domainId: data.domainId || null,
      atRoot,
      enabled: data.enabled,
    },
    limits,
  };
}

export async function createSmartLinkAction(input: SmartLinkInput): Promise<LinkActionResult> {
  const userId = await requireUserId();
  const v = await validate(userId, input);
  if ("error" in v) return v.error!;
  const count = await db.smartLink.count({ where: { userId } });
  if (count >= v.limits.maxSmartLinks) {
    return { ok: false, error: `Your plan includes ${v.limits.maxSmartLinks} deep link${v.limits.maxSmartLinks === 1 ? "" : "s"}. Upgrade to Pro for more.` };
  }
  if (await db.smartLink.findUnique({ where: { slug: v.data.slug }, select: { id: true } })) {
    return { ok: false, error: "That link name is taken.", field: "slug" };
  }
  try {
    const link = await db.smartLink.create({ data: { userId, ...v.data } });
    invalidateSmartLinkFromAction(link.slug);
    return { ok: true, id: link.id };
  } catch {
    return { ok: false, error: "That link name was just taken.", field: "slug" };
  }
}

export async function updateSmartLinkAction(id: string, input: SmartLinkInput): Promise<LinkActionResult> {
  const userId = await requireUserId();
  const existing = await db.smartLink.findFirst({ where: { id, userId }, select: { slug: true } });
  if (!existing) return { ok: false, error: "That link no longer exists." };
  const v = await validate(userId, input, id);
  if ("error" in v) return v.error!;
  if (v.data.slug !== existing.slug && (await db.smartLink.findUnique({ where: { slug: v.data.slug }, select: { id: true } }))) {
    return { ok: false, error: "That link name is taken.", field: "slug" };
  }
  await db.smartLink.update({ where: { id }, data: v.data });
  invalidateSmartLinkFromAction(existing.slug);
  if (v.data.slug !== existing.slug) invalidateSmartLinkFromAction(v.data.slug);
  return { ok: true, id };
}

export async function toggleSmartLinkAction(id: string, enabled: boolean): Promise<LinkActionResult> {
  const userId = await requireUserId();
  const link = await db.smartLink.findFirst({ where: { id, userId }, select: { slug: true } });
  if (!link) return { ok: false, error: "That link no longer exists." };
  await db.smartLink.update({ where: { id }, data: { enabled } });
  invalidateSmartLinkFromAction(link.slug);
  return { ok: true };
}

export async function deleteSmartLinkAction(id: string): Promise<LinkActionResult> {
  const userId = await requireUserId();
  const link = await db.smartLink.findFirst({ where: { id, userId }, select: { slug: true } });
  if (!link) return { ok: true };
  await db.smartLink.delete({ where: { id } });
  invalidateSmartLinkFromAction(link.slug);
  return { ok: true };
}
