// The 18+ warning screen as plain HTML + a small stylesheet (no React, no Tailwind), so public
// warning pages can be served as one tiny document. The React <WarningScreen> renders this too,
// which keeps the dashboard preview and the live page identical.
import { brand } from "@/config/brand";
import { applyWarningColors, type WarningColors } from "./colors";
import type { WarningTemplate } from "./templates";

export type WarningScreenProps = {
  template: WarningTemplate;
  /** Creator color overrides on top of the template (Pro). */
  colors?: WarningColors | null;
  title: string;
  message: string;
  button: string;
  leave: string;
  destinationLabel?: string;
  destinationHost?: string;
  ownerName?: string;
  continueHref: string;
  leaveHref: string;
  showBadge: boolean;
  preview?: boolean;
  lang?: string;
};

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// The app's fonts when available (dashboard), otherwise fast system fonts (public pages).
const FONT: Record<WarningTemplate["font"], string> = {
  sans: "var(--font-sans, system-ui), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  display: "var(--font-display, system-ui), var(--font-sans, system-ui), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "var(--font-serif, Georgia), Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  roboto: "var(--font-roboto, Roboto), Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

export const WARNING_CSS = `.w-root{display:flex;min-height:100%;width:100%;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1.25rem;box-sizing:border-box;-webkit-font-smoothing:antialiased}.w-root.c{padding:3rem 0}.w-root *{box-sizing:border-box}:where(.w-root) h1,:where(.w-root) p{margin:0}
.w-card{width:100%;max-width:28rem;padding:2.25rem 1.75rem;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.w-split{width:100%;max-width:28rem;overflow:hidden;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)}.w-band{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:2rem}.w-18{font-size:2.25rem;line-height:2.5rem;font-weight:700;letter-spacing:-.025em;color:#fff}.w-sb{padding:1.75rem 1.75rem 2rem}
.w-plain{width:100%;max-width:28rem;text-align:center}.w-big{font-size:96px;line-height:1;font-weight:900;letter-spacing:-.05em}.w-mt6{margin-top:1.5rem}
.w-compact{width:100%;max-width:400px;padding:1.25rem;animation:w-up .4s ease-out}.w-cbox{padding:2.5rem 2rem;text-align:center}
.w-ic{display:flex;align-items:center;justify-content:center;border-radius:9999px;margin:0 auto}.w-i14{width:3.5rem;height:3.5rem}.w-i16{width:4rem;height:4rem}.w-mb6{margin-bottom:1.5rem}.w-mb7{margin-bottom:1.75rem}
.w-title{font-size:1.5rem;line-height:1.25;font-weight:600;font-family:inherit}.w-title.c{font-size:22px;font-weight:700;margin-bottom:.75rem}
.w-msg{margin-top:.75rem;font-size:15px;line-height:1.625}.w-msg.c{margin:0 auto 2rem;max-width:280px;line-height:1.6}
.w-dest{margin-top:.75rem;font-size:.875rem;line-height:1.25rem}.w-dest b{font-weight:500}.w-owner{margin-bottom:.25rem;font-size:.875rem;font-weight:500}
.w-act{margin-top:1.75rem;display:flex;width:100%;flex-direction:column;align-items:center;gap:.75rem}.w-act.c{margin-top:0}
.w-btn{display:flex;min-height:3rem;width:100%;max-width:20rem;align-items:center;justify-content:center;padding:.75rem 1.5rem;font-size:15px;line-height:1.4;font-weight:600;text-align:center;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.05);transition:transform .15s,filter .15s;cursor:pointer}.w-btn.full{max-width:none}.w-btn.c{padding:1rem 2rem;font-size:1rem;font-weight:500}.w-btn.up{text-transform:uppercase}.w-btn:hover{filter:brightness(.95)}.w-btn:active{transform:scale(.98)}
.w-leave{padding:.5rem 1rem;font-size:.875rem;font-weight:500;text-decoration:none;text-underline-offset:4px;cursor:pointer}.w-leave:hover{text-decoration:underline}
.w-badge{margin-top:2.5rem;font-size:.75rem;line-height:1rem}
@keyframes w-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`;

function icon(t: WarningTemplate, size = 28) {
  const c = esc(t.iconColor);
  return t.icon === "lock"
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/></svg>`
    : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="M9.5 12h5M12 9.5v5" transform="rotate(45 12 12)"/></svg>`;
}

/** The warning screen's markup (use with WARNING_CSS). */
export function warningHtml(p: WarningScreenProps): string {
  const t = applyWarningColors(p.template, p.colors);
  const tag = p.preview ? "span" : "a";
  const heading = p.preview ? "p" : "h1";
  const c = t.compact ? " c" : "";
  const radius = t.buttonRadius ?? (t.radius === 0 ? 0 : Math.min(t.radius, 999));
  const btnStyle = `background:${esc(t.buttonBg)};color:${esc(t.buttonText)};border-radius:${radius}px${t.compact ? `;box-shadow:0 2px 8px ${esc(t.buttonSolid)}33` : ""}`;
  const href = (h: string) => (p.preview ? "" : ` href="${esc(h)}" rel="nofollow"`);

  const btnClass = ["w-btn", t.buttonFullWidth ? "full" : "", t.compact ? "c" : "", t.buttonUppercase ? "up" : ""].filter(Boolean).join(" ");
  const actions =
    `<div class="w-act${c}"><${tag}${href(p.continueHref)} class="${btnClass}" style="${btnStyle}" data-testid="warning-continue">${esc(p.button)}</${tag}>` +
    (t.hideLeave ? "" : `<${tag}${href(p.leaveHref)} class="w-leave" style="color:${esc(t.muted)}">${esc(p.leave)}</${tag}>`) +
    `</div>`;
  const destination =
    !t.hideDestination && p.destinationHost && p.destinationLabel
      ? `<p class="w-dest" style="color:${esc(t.muted)}">${esc(p.destinationLabel)} <b style="color:${esc(t.text)}">${esc(p.destinationHost)}</b></p>`
      : "";
  const owner = p.ownerName ? `<p class="w-owner" style="color:${esc(t.muted)}">${esc(p.ownerName)}</p>` : "";
  const body =
    owner +
    `<${heading} class="w-title${c}">${esc(p.title)}</${heading}>` +
    `<p class="w-msg${c}" style="color:${esc(t.muted)}">${esc(p.message)}</p>` +
    destination +
    actions;

  let content: string;
  if (t.layout === "split") {
    content =
      `<div class="w-split" style="background:${esc(t.cardBg)};border:1px solid ${esc(t.cardBorder)};border-radius:${t.radius}px">` +
      `<div class="w-band" style="background:${esc(t.accent)}"><span class="w-ic w-i14" style="background:${esc(t.iconBg)}">${icon(t)}</span><span class="w-18">18+</span></div>` +
      `<div class="w-sb">${body}</div></div>`;
  } else if (t.layout === "bigtype") {
    content = `<div class="w-plain"><p class="w-big" style="color:${esc(t.accent)}" aria-hidden="true">18+</p><div class="w-mt6">${body}</div></div>`;
  } else if (t.layout === "fullbleed") {
    content = `<div class="w-plain"><span class="w-ic w-i16 w-mb6" style="background:${esc(t.iconBg)}">${icon(t, 32)}</span>${body}</div>`;
  } else if (t.compact) {
    const shadow = t.cardShadow ? `;box-shadow:${esc(t.cardShadow)}` : "";
    content =
      `<div class="w-compact"><div class="w-cbox" style="background:${esc(t.cardBg)};border:1px solid ${esc(t.cardBorder)};border-radius:${t.radius}px${shadow}">` +
      `<span class="w-ic w-i16 w-mb7" style="background:${esc(t.iconBg)}">${icon(t)}</span>${body}</div></div>`;
  } else {
    const shadow = t.cardShadow ?? (t.key === "ember" ? `0 0 0 1px ${t.cardBorder}, 0 0 40px -10px ${t.cardBorder}` : "");
    content =
      `<div class="w-card" style="background:${esc(t.cardBg)};border:1.5px solid ${esc(t.cardBorder)};border-radius:${t.radius}px${shadow ? `;box-shadow:${esc(shadow)}` : ""}">` +
      `<span class="w-ic w-i14 w-mb6" style="background:${esc(t.iconBg)}">${icon(t)}</span>${body}</div>`;
  }

  const badge = p.showBadge ? `<p class="w-badge" style="color:${esc(t.muted)}">Made with ${esc(brand.name)}</p>` : "";
  const lang = p.lang ? ` lang="${esc(p.lang)}"` : "";
  return `<div${lang} class="w-root${c}" style="background:${esc(t.pageBg)};color:${esc(t.text)};font-family:${esc(FONT[t.font])}">${content}${badge}</div>`;
}
