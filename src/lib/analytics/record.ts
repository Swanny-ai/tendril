import "server-only";
import { isbot } from "isbot";
import { db } from "@/lib/db";
import { detectInAppBrowser } from "@/lib/in-app";
import { parseUserAgent } from "@/lib/ua";
import { appHost } from "@/config/brand";
import { classifySource, normalizeReferrer } from "./referrer";
import { clientIp, countryFromHeaders, visitorHash } from "./visitor";

type Ctx = { headers: Headers };

async function visitorContext({ headers }: Ctx) {
  const ua = headers.get("user-agent") ?? "";
  const parsed = parseUserAgent(ua);
  return {
    ua,
    ...parsed,
    isBot: !ua || isbot(ua),
    country: countryFromHeaders(headers),
    visitorHash: await visitorHash(clientIp(headers), ua),
    inApp: detectInAppBrowser(ua),
  };
}

export async function recordPageView(ctx: Ctx, pageId: string, referrer: string | null) {
  const v = await visitorContext(ctx);
  if (v.isBot) return; // bots are dropped entirely
  const page = await db.page.findUnique({ where: { id: pageId }, select: { id: true } });
  if (!page) return;
  const { source, referrerHost } = classifySource(normalizeReferrer(referrer, appHost), v.inApp);
  await db.pageView.create({
    data: { pageId, visitorHash: v.visitorHash, referrerHost, source, country: v.country, device: v.device, os: v.os, browser: v.browser },
  });
}

export async function recordClick(ctx: Ctx, pageId: string, blockId: string, warningConfirmed: boolean) {
  const v = await visitorContext(ctx);
  await db.clickEvent.create({
    data: {
      pageId,
      blockId,
      visitorHash: v.visitorHash,
      country: v.country,
      device: v.device,
      os: v.os,
      browser: v.browser,
      warningConfirmed,
      isBot: v.isBot,
    },
  });
}

export async function recordWarningView(ctx: Ctx, pageId: string, blockId: string) {
  const v = await visitorContext(ctx);
  if (v.isBot) return;
  await db.warningView.create({ data: { pageId, blockId, visitorHash: v.visitorHash } });
}
