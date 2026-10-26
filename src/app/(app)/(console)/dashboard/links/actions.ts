"use server";

import { appHost } from "@/config/brand";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { checkLinkTarget } from "@/lib/link-targets";
import { linkLimitError, PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { invalidateSmartLinkFromAction, isTwoSteps, linkKindCounts } from "@/lib/smart-links";
import { normalizeDestinationUrl, smartLinkSchema, type SmartLinkInput } from "@/lib/validation";
import { copySlug } from "@/lib/copy-names";
import { checkImage, saveImage } from "@/lib/media";
import { parseLanding } from "@/lib/link-landing";
import { accessError, isDefaultAccess, parseAccess } from "@/lib/link-access";
import { parseWarningColors } from "@/warning-templates/colors";
import { isWarningTemplateKey } from "@/warning-templates/templates";

export type LinkActionResult = { ok: true; id?: string } | { ok: false; error: string; field?: string };

async function validate(userId: string, input: SmartLinkInput, linkId?: string) {
  const parsed = smartLinkSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: { ok: false as const, error: issue.message, field: String(issue.path[0] ?? "") } };
  }
  const data = parsed.data;
  // Template on: the destination is optional (the first section link stands in for it).
  const landing = parseLanding(data.landingPage);
  const firstLink = landing?.enabled ? landing.sections.find((s) => s.kind === "link" && s.url)?.url : undefined;
  if (landing?.enabled && !firstLink && !data.destinationUrl) return { error: { ok: false as const, error: "Add at least one link to your page." } };
  const dest = normalizeDestinationUrl(landing?.enabled && firstLink ? data.destinationUrl || firstLink : data.destinationUrl, appHost);
  if (!dest.ok) return { error: { ok: false as const, error: dest.error, field: "destinationUrl" } };
  if (!isWarningTemplateKey(data.warningTemplate)) return { error: { ok: false as const, error: "Pick a warning design.", field: "warningTemplate" } };

  const plan = await getPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const customText = Boolean(data.warningTitle || data.warningMessage || data.warningButton);
  if (customText && !limits.customWarningText) return { error: { ok: false as const, error: "Custom warning text is part of Pro." } };
  if (landing?.enabled && !limits.templatePages) return { error: { ok: false as const, error: "Two-Steps (Escape Meta Bot) is part of Pro." } };
  const access = parseAccess(data.access);
  const accessProblem = accessError(access);
  if (accessProblem) return { error: { ok: false as const, error: accessProblem } };
  const warningColors = parseWarningColors(data.warningColors);
  if (warningColors && !limits.customWarningText) return { error: { ok: false as const, error: "Custom colors are part of Pro." } };
  if (!data.showBadge && !limits.removeBadge) return { error: { ok: false as const, error: "Removing the badge is part of Pro." } };
  // Domain + Root/Path: same rules as bio pages (one root per domain, no shared paths).
  // Deep links share <app domain>/<name> with bio pages.
  if (await db.page.findUnique({ where: { username: data.slug }, select: { id: true } })) {
    return { error: { ok: false as const, error: "That link name is taken.", field: "slug" } };
  }
  const target = await checkLinkTarget(userId, { domainId: data.domainId, atRoot: data.atRoot }, data.slug, { linkId });
  if (!target.ok) return { error: { ok: false as const, error: target.error, field: "domainId" } };
  const { atRoot } = target.target;

  return {
    data: {
      slug: data.slug,
      destinationUrl: dest.url,
      label: data.label ?? "",
      // Template on = its links carry their own 18+ popups; the full-page check is off.
      adultWarning: landing?.enabled ? false : data.adultWarning,
      warningTemplate: data.warningTemplate,
      warningTitle: data.warningTitle || null,
      warningMessage: data.warningMessage || null,
      warningButton: data.warningButton || null,
      warningColors: warningColors ?? Prisma.DbNull,
      landingPage: landing ? (landing as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      access: isDefaultAccess(access) ? Prisma.DbNull : (access as unknown as Prisma.InputJsonValue),
      showBadge: data.showBadge,
      openInBrowser: data.openInBrowser,
      domainId: data.domainId || null,
      atRoot,
      enabled: data.enabled,
    },
    plan,
    limits,
  };
}

export async function createSmartLinkAction(input: SmartLinkInput): Promise<LinkActionResult> {
  const userId = await requireUserId();
  const v = await validate(userId, input);
  if ("error" in v) return v.error!;
  const limitError = linkLimitError(v.plan, await linkKindCounts(userId), isTwoSteps(v.data));
  if (limitError) return { ok: false, error: limitError };
  if (await db.smartLink.findUnique({ where: { slug: v.data.slug }, select: { id: true } })) {
    return { ok: false, error: "That link name is taken.", field: "slug" };
  }
  try {
    const link = await db.smartLink.create({ data: { userId, ...v.data } });
    invalidateSmartLinkFromAction(link.slug);
    return { ok: true, id: link.id };
  } catch (e) {
    // Unique slug clash (P2002) is the expected case; anything else is logged so it can be fixed.
    if ((e as { code?: string }).code !== "P2002") {
      console.error("create smart link failed", e);
      return { ok: false, error: "Couldn't save the link. Please try again." };
    }
    return { ok: false, error: "That link name was just taken.", field: "slug" };
  }
}

export async function updateSmartLinkAction(id: string, input: SmartLinkInput): Promise<LinkActionResult> {
  const userId = await requireUserId();
  const existing = await db.smartLink.findFirst({ where: { id, userId }, select: { slug: true, landingPage: true } });
  if (!existing) return { ok: false, error: "That link no longer exists." };
  const v = await validate(userId, input, id);
  if ("error" in v) return v.error!;
  // Turning a Deeplink into Two-Steps (or back) counts against the other kind's allowance.
  if (isTwoSteps(existing) !== isTwoSteps(v.data)) {
    const limitError = linkLimitError(v.plan, await linkKindCounts(userId, id), isTwoSteps(v.data));
    if (limitError) return { ok: false, error: limitError };
  }
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

/** Avatar / cover image for a link's profile page; returns its /media/ URL. */
export async function uploadLinkImageAction(form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const file = form.get("file");
  const check = checkImage(file);
  if (!check.ok) return { ok: false, error: check.error };
  return { ok: true, url: await saveImage(userId, file as File, check.ext) };
}

/** A copy of a deep link (settings, 18+ page, Two-Steps page) at a new name, "<name>-copy". */
export async function duplicateSmartLinkAction(id: string): Promise<LinkActionResult & { slug?: string }> {
  const userId = await requireUserId();
  const link = await db.smartLink.findFirst({ where: { id, userId } });
  if (!link) return { ok: false, error: "That link no longer exists." };
  const limitError = linkLimitError(await getPlan(userId), await linkKindCounts(userId), isTwoSteps(link));
  if (limitError) return { ok: false, error: limitError };
  const slug = await copySlug(link.slug);
  if (!slug) return { ok: false, error: "Couldn't find a free name for the copy." };
  const json = (v: unknown) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue));
  const copy = await db.smartLink.create({
    data: {
      userId,
      slug,
      destinationUrl: link.destinationUrl,
      label: link.label ? `${link.label} (copy)`.slice(0, 80) : "",
      enabled: link.enabled,
      adultWarning: link.adultWarning,
      warningTemplate: link.warningTemplate,
      warningTitle: link.warningTitle,
      warningMessage: link.warningMessage,
      warningButton: link.warningButton,
      warningColors: json(link.warningColors),
      landingPage: json(link.landingPage),
      access: json(link.access),
      showBadge: link.showBadge,
      openInBrowser: link.openInBrowser,
      // Same domain, but always at a path: a domain has only one Root.
      domainId: link.domainId,
      atRoot: false,
    },
  });
  invalidateSmartLinkFromAction(copy.slug);
  return { ok: true, id: copy.id, slug: copy.slug };
}
