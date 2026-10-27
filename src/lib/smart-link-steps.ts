import "server-only";
import { after } from "next/server";
import { appHost, appUrl } from "@/config/brand";
import { inAppDeepLink } from "@/lib/deeplink";
import { isAppHost } from "@/lib/domain-names";
import { detectInAppBrowser } from "@/lib/in-app";
import { htmlResponse, leanLandingPage, leanLeftPage, leanNotFound, leanOpenPage, leanTurnstilePage, leanWarningPage } from "@/lib/lean-link-pages";
import { ACCESS_MESSAGES, accessBlock, isDefaultAccess } from "@/lib/link-access";
import { countryFromHeaders } from "@/lib/analytics/visitor";
import { hasHumanPass, turnstileConfigured, turnstileSiteKey } from "@/lib/turnstile";
import { parseUserAgent } from "@/lib/ua";
import { publicLinkBase } from "@/lib/link-paths";
import { getSmartLink, recordSmartLinkEvent, type SmartLinkEventKind } from "@/lib/smart-links";
import { pickLang, templateCopy, WARNING_COPY } from "@/warning-templates/copy";
import { applyWarningColors } from "@/warning-templates/colors";
import { getWarningTemplate } from "@/warning-templates/templates";

// The steps a deep link can show before its destination, served as lean HTML (lib/lean-link-pages).
// Used by /l/<slug>/(warning|open|left) and, on custom domains, straight from /l/<slug> so a
// visitor's first page is a single request.

export type SmartLink = NonNullable<Awaited<ReturnType<typeof getSmartLink>>>;

const hostOf = (h: Headers) => (h.get("host") ?? "").replace(/:\d+$/, "");

function track(h: Headers, linkId: string, kinds: SmartLinkEventKind[]) {
  after(async () => {
    try {
      for (const kind of kinds) await recordSmartLinkEvent(h, linkId, kind);
    } catch {
      /* analytics never breaks the page */
    }
  });
}

/**
 * The link's Advanced rules (blocked countries, devices, active dates) for this request: a
 * "This link isn't available" page when it's blocked, or null to carry on. Not counted as a visit.
 */
export function accessDenied(h: Headers, link: SmartLink): Response | null {
  if (isDefaultAccess(link.access)) return null;
  const why = accessBlock(link.access, { country: countryFromHeaders(h), device: parseUserAgent(h.get("user-agent") ?? "").device, now: new Date() });
  return why ? leanNotFound(hostOf(h), ACCESS_MESSAGES[why]) : null;
}

/**
 * Cloudflare Turnstile gate: when the link has bot protection on (and Turnstile is configured), a
 * visitor without a valid pass cookie first sees an "are you human?" page. `returnPath` is where
 * they come back to after passing. Returns null to let the visit continue.
 */
export function turnstileGate(h: Headers, link: SmartLink): Response | null {
  if (!link.access.botProtection || !turnstileConfigured()) return null;
  const m = (h.get("cookie") ?? "").match(/(?:^|;\s*)vl_human=([^;]+)/);
  if (m && hasHumanPass(decodeURIComponent(m[1]))) return null;
  const to = publicLinkBase(h, link.slug, appHost);
  return htmlResponse(leanTurnstilePage({ host: hostOf(h), siteKey: turnstileSiteKey(), slug: link.slug, to }));
}

/** The 18+ page. `entry`: this page is the visit itself (counts a hit too). */
export function warningStep(h: Headers, link: SmartLink, slug: string, entry: boolean): Response {
  const lang = pickLang(h.get("accept-language"));
  const template = getWarningTemplate(link.warningTemplate);
  const copy = templateCopy(template, lang);
  track(h, link.id, entry ? ["hit", "view"] : ["view"]);

  // Clean addresses on custom domains: "/" or "/vip" instead of /l/vip.
  const base = publicLinkBase(h, slug, appHost);
  const leave = base === "/" || base === `/l/${slug}` ? `/l/${slug}/left` : `${base}/left`;
  // Inside Instagram/TikTok/...: confirming opens the destination in the default browser.
  const origin = isAppHost(h.get("host"), appHost) ? appUrl : `https://${hostOf(h)}`;
  const ua = h.get("user-agent") ?? "";
  const escapeTarget = `${origin}${base}?ok=1&ib=1`;
  const deepLink = link.openInBrowser ? inAppDeepLink(ua, escapeTarget) : null;

  let destinationHost = "";
  try {
    destinationHost = new URL(link.destinationUrl).host.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  return htmlResponse(
    leanWarningPage({
      host: hostOf(h),
      userAgent: ua,
      lang,
      template,
      colors: link.warningColors,
      title: link.warningTitle || copy.title,
      message: link.warningMessage || copy.message,
      button: link.warningButton || copy.button,
      leave: copy.leave,
      destinationLabel: copy.destination,
      destinationHost,
      continueHref: deepLink ?? `${base}?ok=1`,
      leaveHref: leave,
      showBadge: link.showBadge,
      escape: link.openInBrowser ? { target: escapeTarget, stay: `${base}?ok=1&ib=1` } : null,
    }),
  );
}

/** The creator's profile page ("Template"), shown before the link continues. */
/** `step2`: the visitor tapped Step 1's button (the visit was already counted). */
export function landingStep(h: Headers, link: SmartLink, slug: string, step2 = false): Response {
  const base = publicLinkBase(h, slug, appHost);
  // Step 1 is only for visitors inside a social app (Instagram, TikTok...): in a real browser
  // (Safari, Chrome...) they get Step 2 straight away.
  const ua = h.get("user-agent") ?? "";
  const inApp = !!detectInAppBrowser(ua);
  // Step 1 is on as soon as it has its button.
  const showStep1 = !!link.landing?.introSections.length && !step2 && inApp;
  // A visit is counted once (on the first page seen); every Step 2 shown counts as "Opened Step 2".
  track(h, link.id, [...(step2 ? [] : (["hit"] as const)), ...(showStep1 ? [] : (["step2"] as const))]);
  // From Step 1, the button opens Step 2 in the phone's browser when "Open in phone browser" is on.
  const origin = isAppHost(h.get("host"), appHost) ? appUrl : `https://${hostOf(h)}`;
  const deepLink = link.openInBrowser && inApp ? inAppDeepLink(ua, `${origin}${base}?step=2`) : null;
  const step2Href = `${origin}${base}?step=2`;
  const lang = pickLang(h.get("accept-language"));
  const copy = WARNING_COPY[lang];
  // Tab title and share previews: "Name (@handle)" with the cover photo (the Step 2 identity).
  const lp = link.landing!;
  const metaName = (lp.name || link.owner?.name || link.label || "").trim();
  const metaHandle = (lp.handle || link.owner?.username || "").trim();
  const meta = { name: metaName || null, handle: metaHandle || null, description: lp.bio?.trim() || null, image: lp.coverUrl || null };
  return htmlResponse(
    leanLandingPage({
      host: hostOf(h),
      lang,
      age: { title: copy.title, message: copy.message, button: copy.button, leave: copy.leave },
      page: link.landing!,
      fallbackName: link.owner?.name ?? link.label ?? slug,
      showBadge: link.showBadge,
      slug,
      step: showStep1 ? 1 : 2,
      step2Href,
      step2Deep: deepLink ?? undefined,
      meta,
      // Inside Instagram, TikTok...: show Step 1, then straight away open Step 2 in the phone's browser.
      autoOpen: showStep1 && deepLink ? deepLink : undefined,
    }),
  );
}

/** "Open in your browser" for visitors inside a social app. */
export function openStep(h: Headers, link: SmartLink, slug: string, entry: boolean): Response {
  if (entry) track(h, link.id, ["hit"]);
  const origin = isAppHost(h.get("host"), appHost) ? appUrl : `https://${hostOf(h)}`;
  const base = publicLinkBase(h, slug, appHost);
  return htmlResponse(
    leanOpenPage({
      host: hostOf(h),
      userAgent: h.get("user-agent") ?? "",
      target: `${origin}${base}?ib=1`,
      stay: `${base}?ib=1`,
      name: link.owner?.name ?? link.label ?? slug,
      username: link.owner?.username ?? null,
      avatarUrl: link.owner?.avatarUrl ?? null,
      label: link.label,
    }),
  );
}

/** After "Take me back". */
export function leftStep(h: Headers, link: SmartLink): Response {
  const lang = pickLang(h.get("accept-language"));
  const copy = WARNING_COPY[lang];
  track(h, link.id, ["leave"]);
  const t = applyWarningColors(getWarningTemplate(link.warningTemplate), link.warningColors);
  return htmlResponse(leanLeftPage({ host: hostOf(h), lang, title: copy.leftTitle, message: copy.leftMessage, pageBg: t.pageBg, text: t.text, muted: t.muted }));
}
