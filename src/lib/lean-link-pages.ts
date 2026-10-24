import "server-only";
import { brand } from "@/config/brand";
import { openInBrowserUrl, platformFromUserAgent, pressAndHoldOnly } from "@/lib/deeplink";
import { detectInAppBrowser, type InAppBrowser } from "@/lib/in-app";
import { LANDING_CSS, LANDING_JS, LANDING_SHEETS_JS, landingHtml, type LandingRenderInput } from "@/lib/link-landing";
import { WARNING_CSS, esc, warningHtml, type WarningScreenProps } from "@/warning-templates/warning-html";

// Deep link pages (18+ warning, "open in browser", "you left") as single, self-contained HTML
// documents: inline CSS, a few hundred bytes of inline JS, no framework and no trackers. They are
// the first thing a fan sees after tapping a creator's link, so they have to load instantly.

const BASE_CSS = `html,body{margin:0;min-height:100%}body{min-height:100vh;min-height:100svh;display:flex;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}body>.w-root{min-height:100vh;min-height:100svh}[hidden]{display:none!important}
.vl-sheet{position:fixed;left:.75rem;right:.75rem;bottom:.75rem;z-index:60;margin:0 auto;max-width:24rem;border-radius:1rem;background:#1c1c1c;padding:1rem;font:14px/1.45 system-ui,-apple-system,sans-serif;color:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.5)}.vl-sheet p{margin:0}.vl-sheet b{display:block;padding-right:1.5rem}.vl-steps{margin-top:.25rem!important;color:rgba(255,255,255,.8)}.vl-steps svg{vertical-align:-3px}
.vl-x{position:absolute;top:.5rem;right:.5rem;border:0;background:none;color:rgba(255,255,255,.7);padding:.25rem;cursor:pointer;font-size:18px;line-height:1}
.vl-hold{display:block;margin-top:.75rem;border-radius:.75rem;background:#fff;padding:.75rem;text-align:center;font-weight:600;color:#1c1c1c;text-decoration:none;-webkit-touch-callout:default;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.vl-note{margin-top:.5rem!important;text-align:center;font-size:.75rem;color:rgba(255,255,255,.7)}.vl-stay{display:block;margin-top:.75rem;border-radius:.75rem;background:rgba(255,255,255,.1);padding:.5rem;text-align:center;font-weight:500;color:#fff;text-decoration:none}`;

// Port of lib/handoff-watch.ts + components/browser-escape.tsx, minified by hand.
// c = { fail: id of the "didn't open?" box, hold: id of the press-and-hold sheet (or ""),
//       cont: the continue link's href (press-and-hold apps), auto: deep link to try on load }
const ESCAPE_JS = `(function(c){var d=document,w=window,S='a[href^="intent:"],a[href^="x-safari-"],a[href^="instagram:"],a[href^="barcelona:"]';function show(i){var e=i&&d.getElementById(i);if(e)e.hidden=false}function watch(cb){var t0=Date.now(),lost=0,back=0,done=0,tm;function end(l){if(done)return;done=1;clearTimeout(tm);d.removeEventListener("visibilitychange",vis);w.removeEventListener("pagehide",ph);w.removeEventListener("pageshow",ps);w.removeEventListener("blur",bl);w.removeEventListener("focus",fo);if(!l)cb()}function vis(){d.visibilityState==="hidden"&&end(1)}function ph(){end(1)}function ps(e){e.persisted&&end(1)}function bl(){lost||(lost=Date.now())}function fo(){lost&&(back=1)}function chk(s){if(done)return;if(d.visibilityState==="hidden")return end(1);var el=Date.now()-t0;if(el>s+1200)return end(1);if(lost&&!back&&el<8000){tm=setTimeout(function(){chk(el+500)},500);return}end(0)}d.addEventListener("visibilitychange",vis);w.addEventListener("pagehide",ph);w.addEventListener("pageshow",ps);w.addEventListener("blur",bl);w.addEventListener("focus",fo);tm=setTimeout(function(){chk(2000)},2000)}d.addEventListener("click",function(e){if(e.defaultPrevented)return;var a=e.target.closest&&e.target.closest("a[href],[data-close]");if(!a)return;if(a.hasAttribute("data-close")){a.closest("[role=dialog]").hidden=true;return}if(a.hasAttribute("data-hold")){e.preventDefault();return}if(a.matches(S)){watch(function(){show(c.fail)});return}if(c.hold&&a.getAttribute("href")===c.cont){e.preventDefault();show(c.hold)}});if(c.auto){var go=function(){setTimeout(function(){location.href=c.auto;watch(function(){show(c.fail)})},0)};d.readyState==="complete"?go():w.addEventListener("load",go)}})`;

const ICON_EXT = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
const ICON_MORE_H = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="the menu button"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
const ICON_MORE_V = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="the menu button"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

const APP_NAMES: Record<Exclude<InAppBrowser, null>, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", snapchat: "Snapchat", linkedin: "LinkedIn", twitter: "X" };

type DocOptions = {
  lang?: string;
  host: string;
  css: string;
  body: string;
  config?: Record<string, string>;
  /** Navigate here as the very first thing, before the page draws (opening the phone's browser). */
  goNow?: string;
};

/** A whole page. Link previews show only the domain; the tab shows only the brand. */
function documentHtml({ lang = "en", host, css, body, config, goNow }: DocOptions): string {
  const script = config ? `<script>${ESCAPE_JS}(${JSON.stringify(config).replace(/</g, "\\u003c")})</script>` : "";
  return (
    `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8">${goNow ? `<script>location.href=${JSON.stringify(goNow).replace(/</g, "\\u003c")}</script>` : ""}<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">` +
    `<title>${esc(brand.name)}</title><meta name="robots" content="noindex,nofollow"><meta property="og:title" content="${esc(host)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(host)}">` +
    `<link rel="icon" href="/icon.svg" type="image/svg+xml"><style>${BASE_CSS}${css}</style></head><body>${body}${script}</body></html>`
  );
}

export const htmlResponse = (html: string, status = 200) =>
  new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" } });

function stepsText(android: boolean) {
  return `Tap ${android ? ICON_MORE_V : ICON_MORE_H} in the top corner, then &ldquo;Open in ${android ? "Chrome" : "external browser"}&rdquo;.`;
}

function pressAndHold(target: string) {
  return (
    `<a href="${esc(target)}" rel="nofollow" class="vl-hold" data-hold="">Press and hold here</a>` +
    `<p class="vl-note">Keep your finger on the button, then choose &ldquo;Open in browser&rdquo;.</p>`
  );
}

export type LeanWarningInput = Omit<WarningScreenProps, "preview"> & {
  host: string;
  userAgent: string;
  /** Escape help for social-app browsers (when the link opens in the real browser). */
  escape: { target: string; stay: string } | null;
};

/** The 18+ warning page. */
export function leanWarningPage(p: LeanWarningInput): string {
  const { host, userAgent, escape, ...screen } = p;
  let sheets = "";
  let config: Record<string, string> | undefined;
  if (escape) {
    const android = platformFromUserAgent(userAgent) === "android";
    const holdOnly = pressAndHoldOnly(userAgent);
    sheets =
      `<div id="vl-fail" role="dialog" aria-label="Open in your browser" class="vl-sheet" hidden><button type="button" class="vl-x" aria-label="Close" data-close="">&times;</button>` +
      `<b>Didn&apos;t open in ${android ? "your browser" : "Safari"}?</b><p class="vl-steps">${stepsText(android)}</p>` +
      (android ? "" : pressAndHold(escape.target)) +
      `<a href="${esc(escape.stay)}" rel="nofollow" class="vl-stay">Continue here instead</a></div>` +
      (holdOnly
        ? `<div id="vl-hold" role="dialog" aria-label="Open in your browser" class="vl-sheet" hidden><button type="button" class="vl-x" aria-label="Close" data-close="">&times;</button>` +
          `<b>Open it in your browser</b>${pressAndHold(escape.target)}<a href="${esc(escape.stay)}" rel="nofollow" class="vl-stay">Continue here instead</a></div>`
        : "");
    config = { fail: "vl-fail", hold: holdOnly ? "vl-hold" : "", cont: screen.continueHref, auto: "" };
  }
  return documentHtml({ lang: screen.lang, host, css: WARNING_CSS, body: warningHtml(screen) + sheets, config });
}

const OPEN_CSS = `body{background:#151515;color:#fff;align-items:center;justify-content:center;padding:2.5rem 1.25rem;box-sizing:border-box;position:relative;overflow-x:hidden}
.o-bg{position:fixed;inset:0;background:radial-gradient(60% 45% at 15% 10%,rgba(73,242,100,.22),transparent),radial-gradient(55% 45% at 90% 90%,rgba(230,255,170,.12),transparent);pointer-events:none}
.o-card{position:relative;width:100%;max-width:24rem;border-radius:28px;border:1px solid rgba(255,255,255,.1);background:rgba(28,28,28,.92);padding:1.75rem;text-align:center;box-shadow:0 24px 60px -20px rgba(0,0,0,.8)}
.o-av{margin:0 auto;width:6rem;height:6rem;overflow:hidden;border-radius:9999px;border:4px solid #1c1c1c;background:linear-gradient(135deg,#e6ffaa,#49f264,#16351c);display:grid;place-items:center;font-size:1.875rem;font-weight:600}.o-av img{width:100%;height:100%;object-fit:cover}
.o-card h1{margin:1rem 0 0;font-size:1.5rem;font-weight:600;letter-spacing:-.025em}.o-user{margin:0;font-size:.875rem;color:#a3a3a3}.o-label{margin:.75rem auto 0;width:fit-content;border-radius:9999px;background:#151b12;padding:.25rem .75rem;font-size:.75rem;font-weight:500;color:#6cf583}
.o-btn{margin-top:1.5rem;display:flex;height:3.5rem;width:100%;align-items:center;justify-content:center;gap:.5rem;border-radius:1rem;background:#49f264;font-size:1rem;font-weight:600;color:#0a0a0a;text-decoration:none;box-shadow:0 10px 24px -8px rgba(73,242,100,.55);transition:transform .15s}.o-btn:active{transform:scale(.98)}.o-btn[data-hold]{-webkit-touch-callout:default;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.o-hint{margin:.5rem 0 0;font-size:.75rem;color:#a3a3a3}.o-why{margin:1rem 0 0;font-size:.875rem;line-height:1.6;color:#a3a3a3}
.o-help{margin-top:1rem;border-radius:1rem;background:#262626;padding:1rem;text-align:left;font-size:.875rem}.o-help p{margin:0}.o-help svg{vertical-align:-3px}.o-help .vl-steps{color:#d4d4d4}
.o-stay{margin-top:1.25rem;display:inline-block;font-size:.875rem;font-weight:500;color:#a3a3a3;text-underline-offset:4px;text-decoration:none}.o-stay:hover{color:#fff;text-decoration:underline}`;

export type LeanOpenInput = { host: string; userAgent: string; target: string; stay: string; name: string; username: string | null; avatarUrl: string | null; label: string };

/** "Open in your browser" step for visitors inside a social app's built-in browser. */
export function leanOpenPage(p: LeanOpenInput): string {
  const platform = platformFromUserAgent(p.userAgent);
  const app = detectInAppBrowser(p.userAgent);
  const holdOnly = pressAndHoldOnly(p.userAgent);
  const deepLink = openInBrowserUrl(p.target, platform, p.userAgent);
  const browser = platform === "ios" ? "Safari" : "your browser";
  const avatar = p.avatarUrl ? `<img src="${esc(p.avatarUrl)}" alt="">` : esc(p.name.slice(0, 1).toUpperCase());
  const button = holdOnly
    ? `<a href="${esc(p.target)}" rel="nofollow" class="o-btn" data-hold="">${ICON_EXT} Press and hold to open</a><p class="o-hint">Keep your finger on the button, then choose &ldquo;Open in browser&rdquo;.</p>`
    : `<a href="${esc(deepLink ?? p.target)}" class="o-btn">${ICON_EXT} Open in ${platform === "ios" ? "Safari" : "browser"}</a>`;
  const body =
    `<div class="o-bg" aria-hidden="true"></div><main class="o-card"><div class="o-av">${avatar}</div><h1>${esc(p.name)}</h1>` +
    (p.username ? `<p class="o-user">@${esc(p.username)}</p>` : "") +
    (p.label ? `<p class="o-label">${esc(p.label)}</p>` : "") +
    button +
    `<p class="o-why">${app ? `You&apos;re in ${esc(APP_NAMES[app])}&apos;s built-in browser.` : "This link works best in your browser."} Opening in ${browser} keeps you signed in and makes payments work.</p>` +
    `<div id="vl-help" role="status" class="o-help" hidden><p><b>Didn&apos;t open?</b></p><p class="vl-steps">${stepsText(platform === "android")}</p></div>` +
    `<a href="${esc(p.stay)}" class="o-stay">Continue here instead</a></main>`;
  // Android usually lets a page open the browser straight away: try once on arrival.
  const config = { fail: "vl-help", hold: "", cont: "", auto: platform === "android" && deepLink ? deepLink : "" };
  return documentHtml({ host: p.host, css: OPEN_CSS, body, config });
}

/** After "Take me back" on an 18+ page. */
export function leanLeftPage(p: { host: string; lang: string; title: string; message: string; pageBg: string; text: string; muted: string }): string {
  const css = `body{align-items:center;justify-content:center;text-align:center;padding:0 1.25rem}h1{margin:0;font-size:1.5rem;font-weight:600}p{margin:.5rem 0 0}`;
  const body = `<main style="width:100%"><h1>${esc(p.title)}</h1><p style="color:${esc(p.muted)}">${esc(p.message)}</p></main>`;
  return documentHtml({ lang: p.lang, host: p.host, css: `${css}body{background:${esc(p.pageBg)};color:${esc(p.text)}}`, body });
}

const NOT_FOUND_CSS = `body{align-items:center;justify-content:center;text-align:center;background:#151515;color:#fff;padding:0 1.25rem}h1{margin:0 0 .5rem}p{margin:0;color:#a3a3a3}`;
export function leanNotFound(host: string, message = "It may have been removed or turned off."): Response {
  return htmlResponse(documentHtml({ host, css: NOT_FOUND_CSS, body: `<main><h1>This link isn&apos;t available</h1><p>${esc(message)}</p></main>` }), 404);
}

/** The creator's profile page (a deep link's "Template"). */
export function leanLandingPage(p: Omit<LandingRenderInput, "preview" | "now" | "popupFor"> & { host: string; lang?: string; autoOpen?: string }): string {
  // autoOpen: inside a social app, open Step 2 in the phone's browser immediately, before Step 1 even draws
  // (Step 1 and its button stay as the fallback if the app refuses).
  return documentHtml({ lang: p.lang, host: p.host, css: LANDING_CSS, body: landingHtml(p) + `<script>${LANDING_JS}${LANDING_SHEETS_JS}</script>`, goNow: p.autoOpen });
}
