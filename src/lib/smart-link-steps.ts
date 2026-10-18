import "server-only";
import { after } from "next/server";
import { appHost, appUrl } from "@/config/brand";
import { inAppDeepLink } from "@/lib/deeplink";
import { isAppHost } from "@/lib/domain-names";
import { htmlResponse, leanLeftPage, leanOpenPage, leanWarningPage } from "@/lib/lean-link-pages";
import { publicLinkBase } from "@/lib/link-paths";
import { getSmartLink, recordSmartLinkEvent, type SmartLinkEventKind } from "@/lib/smart-links";
import { pickLang, templateCopy, WARNING_COPY } from "@/warning-templates/copy";
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
  const t = getWarningTemplate(link.warningTemplate);
  return htmlResponse(leanLeftPage({ host: hostOf(h), lang, title: copy.leftTitle, message: copy.leftMessage, pageBg: t.pageBg, text: t.text, muted: t.muted }));
}
