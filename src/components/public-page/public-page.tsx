// Shared renderer for the public profile page AND the editor's live preview.
// Pure presentational component: no hooks, safe in Server and Client Components.
import type { CSSProperties } from "react";
import { brand } from "@/config/brand";
import { cardImage, type BlockData, type BlockKind } from "@/lib/blocks";
import type { ThemeTokens } from "@/themes/presets";
import { Countdown } from "./layouts/countdown";
import { ModernCard } from "./layouts/modern-card";
import { PersonalCard } from "./layouts/personal-card";
import { ProCard } from "./layouts/pro-card";
import { Embed } from "./layouts/shared";
import { SimpleStack } from "./layouts/simple-stack";
import { Spotlight } from "./layouts/spotlight";
import { SocialGlyph, socialMeta } from "./social";
import { VerifiedBadge } from "./verified-badge";

export type RenderBlock = {
  id: string;
  type: BlockKind;
  title: string;
  url: string | null;
  data: BlockData;
  contentWarning: boolean;
};

export type RenderPage = {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  showBadge: boolean;
  theme: ThemeTokens;
  blocks: RenderBlock[];
  /** Template layout (see components/public-page/layouts). Defaults to "classic". */
  layout?: string;
  heroUrl?: string | null;
  tagline?: string;
  /** Show the blue verified check (page verified by the site owner, badge not hidden). */
  verified?: boolean;
};

const FONT_STACK: Record<ThemeTokens["font"], string> = {
  sans: "var(--font-sans), system-ui, sans-serif",
  display: "var(--font-display), var(--font-sans), system-ui, sans-serif",
  serif: "var(--font-serif), Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

function buttonStyle(t: ThemeTokens): CSSProperties {
  const base: CSSProperties = { borderRadius: t.radius, color: t.buttonText, borderWidth: 1.5, borderStyle: "solid" };
  if (t.buttonStyle === "outline") return { ...base, background: t.buttonBg, borderColor: t.buttonBorder };
  if (t.buttonStyle === "soft") return { ...base, background: t.buttonBg, borderColor: t.buttonBorder, backdropFilter: "blur(6px)" };
  return { ...base, background: t.buttonBg, borderColor: t.buttonBorder };
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join("") || "•"
  );
}

const LAYOUT_COMPONENTS = {
  "simple-stack": SimpleStack,
  "modern-card": ModernCard,
  spotlight: Spotlight,
  "pro-card": ProCard,
  "personal-card": PersonalCard,
} as const;

export function PublicPage({ page, preview = false }: { page: RenderPage; preview?: boolean }) {
  const Layout = page.layout ? LAYOUT_COMPONENTS[page.layout as keyof typeof LAYOUT_COMPONENTS] : undefined;
  if (Layout) return <Layout page={page} preview={preview} />;
  return <ClassicPage page={page} preview={preview} />;
}

/** The original layout, styled by the page theme. */
function ClassicPage({ page, preview }: { page: RenderPage; preview: boolean }) {
  const t = page.theme;
  const btn = buttonStyle(t);
  const name = page.displayName || `@${page.username}`;

  return (
    <div
      className="flex min-h-full w-full justify-center px-5 pt-12 pb-10"
      style={{ background: t.background, color: t.text, fontFamily: FONT_STACK[t.font] }}
    >
      <div className="flex w-full max-w-[560px] flex-col items-center">
        {page.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.avatarUrl}
            alt=""
            width={96}
            height={96}
            className="size-24 rounded-full object-cover shadow-sm"
            style={{ outline: `3px solid ${t.buttonBorder}`, outlineOffset: 3 }}
          />
        ) : (
          <div
            aria-hidden
            className="flex size-24 items-center justify-center rounded-full text-3xl font-semibold"
            style={{ background: t.buttonBg, color: t.buttonText, border: `1.5px solid ${t.buttonBorder}` }}
          >
            {initials(name)}
          </div>
        )}
        {preview ? (
          <p className="mt-4 text-center text-2xl font-semibold">{name}{page.verified ? <> <VerifiedBadge size={22} /></> : null}</p>
        ) : (
          <h1 className="mt-4 text-center text-2xl font-semibold" style={{ fontFamily: "inherit" }}>
            {name}
            {page.verified ? <> <VerifiedBadge size={22} /></> : null}
          </h1>
        )}
        {page.bio ? (
          <p className="mt-2 max-w-[42ch] text-center text-[15px] leading-relaxed whitespace-pre-line" style={{ color: t.muted }}>
            {page.bio}
          </p>
        ) : null}

        <div className="mt-7 flex w-full flex-col gap-3">
          {page.blocks.map((b) => {
            if (b.type === "HEADER") {
              return (
                <h2 key={b.id} className="mt-3 text-center text-sm font-semibold tracking-wide uppercase" style={{ color: t.muted, fontFamily: "inherit" }}>
                  {b.title}
                </h2>
              );
            }
            if (b.type === "TEXT") {
              return (
                <p key={b.id} className="text-center text-[15px] leading-relaxed whitespace-pre-line" style={{ color: t.text }}>
                  {b.data.text}
                </p>
              );
            }
            if (b.type === "SOCIAL_ROW") {
              const socials = b.data.socials ?? [];
              if (!socials.length) return null;
              return (
                <ul key={b.id} className="flex flex-wrap justify-center gap-2.5" aria-label="Social profiles">
                  {socials.map((s, i) => {
                    const m = socialMeta(s.network);
                    const inner = (
                      <span
                        className="flex size-11 items-center justify-center text-[13px] font-bold"
                        style={{ ...btn, borderRadius: Math.min(t.radius, 14) === 0 ? 0 : 999 }}
                      >
                        <SocialGlyph network={s.network} size={18} />
                      </span>
                    );
                    return (
                      <li key={`${s.network}-${i}`}>
                        {preview ? (
                          <span title={m.label}>{inner}</span>
                        ) : (
                          <a href={m.href(s.handle)} target="_blank" rel="me noopener noreferrer" aria-label={m.label} title={m.label}>
                            {inner}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              );
            }
            if (b.type === "EMBED") {
              return <Embed key={b.id} block={b} preview={preview} className="overflow-hidden" captionClass="" />;
            }
            if (b.type === "COUNTDOWN") {
              return (
                <Countdown
                  key={b.id}
                  until={b.data.until}
                  title={b.title}
                  look={{ box: { ...btn, borderRadius: Math.min(t.radius, 12) }, label: { color: t.muted }, title: { color: t.text } }}
                />
              );
            }
            // LINK
            const content = (
              <>
                {cardImage(b) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cardImage(b)!} alt="" className="size-10 shrink-0 rounded-md object-cover" loading="lazy" />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-center">{b.title || b.url}</span>
                {b.contentWarning ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
                    style={{ border: `1px solid currentColor`, opacity: 0.8 }}
                    title="Opens a content warning first"
                  >
                    Sensitive
                  </span>
                ) : null}
              </>
            );
            const cls = "flex min-h-14 w-full items-center gap-2 px-5 py-3.5 text-[15px] font-medium transition-transform active:scale-[0.99]";
            return preview ? (
              <span key={b.id} className={cls} style={btn}>
                {content}
              </span>
            ) : (
              <a key={b.id} href={`/go/${b.id}`} className={`${cls} hover:-translate-y-0.5`} style={btn} rel="nofollow" data-warning={b.contentWarning ? "" : undefined}>
                {content}
              </a>
            );
          })}
        </div>

        {page.showBadge ? (
          <a
            href={preview ? undefined : "/?ref=badge"}
            className="mt-12 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{ color: t.muted, border: `1px solid ${t.muted}55` }}
          >
            Made with {brand.name}
          </a>
        ) : null}
      </div>
    </div>
  );
}
