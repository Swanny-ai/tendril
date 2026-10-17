// Building blocks shared by the template layouts. No hooks: safe in Server Components.
import type { CSSProperties, ReactNode } from "react";
import { Play } from "lucide-react";
import { brand } from "@/config/brand";
import { cardImage, embedSource, youtubeThumbnail } from "@/lib/blocks";
import type { RenderBlock, RenderPage } from "../public-page";
import { socialColor, SocialGlyph, socialMeta } from "../social";
import { VerifiedBadge } from "../verified-badge";

export type LayoutProps = { page: RenderPage; preview: boolean };

/** The page's first social-icons block is shown in the header; everything else flows below. */
export function splitBlocks(blocks: RenderBlock[]) {
  const i = blocks.findIndex((b) => b.type === "SOCIAL_ROW");
  return { socials: i >= 0 ? (blocks[i].data.socials ?? []) : [], rest: blocks.filter((_, j) => j !== i) };
}

/** The @username a template shows, or null when the creator hid it. */
export function handleOf(page: RenderPage): string | null {
  return page.handle === undefined ? page.username : page.handle;
}

export function displayName(page: RenderPage) {
  return page.displayName || `@${page.username}`;
}

/** Cover photo, or the template's sample art when the creator hasn't added one yet. */
export function heroImage(page: RenderPage, layout: string) {
  return page.heroUrl || `/templates/${layout}.jpg`;
}

export function NameHeading({ preview, className, style, children, verified }: { preview: boolean; className?: string; style?: CSSProperties; children: ReactNode; verified?: boolean }) {
  const content = (
    <>
      {children}
      {verified ? (
        <>
          {" "}
          <VerifiedBadge size={22} />
        </>
      ) : null}
    </>
  );
  return preview ? (
    <p className={className} style={style}>
      {content}
    </p>
  ) : (
    <h1 className={className} style={style}>
      {content}
    </h1>
  );
}

export function Avatar({ page, size, ring, className }: { page: RenderPage; size: number; ring?: string; className?: string }) {
  const name = displayName(page);
  const style: CSSProperties = { width: size, height: size, ...(ring ? { boxShadow: `0 0 0 3px ${ring}` } : {}) };
  return page.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={page.avatarUrl} alt="" width={size} height={size} className={`rounded-full object-cover ${className ?? ""}`} style={style} />
  ) : (
    <div aria-hidden className={`grid place-items-center rounded-full bg-gradient-to-br from-[#ffd2a8] via-[#f2643d] to-[#5b3fd1] font-semibold text-white ${className ?? ""}`} style={{ ...style, fontSize: size / 2.6 }}>
      {name.replace(/^@/, "").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function SocialIcons({ socials, preview, look }: { socials: { network: string; handle: string }[]; preview: boolean; look: "color" | "glass" | "dark" | "plain" }) {
  if (!socials.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label="Social profiles">
      {socials.map((s, i) => {
        const m = socialMeta(s.network);
        const style: CSSProperties =
          look === "color"
            ? { background: socialColor(s.network), color: "#fff" }
            : look === "glass"
              ? { background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.28)", backdropFilter: "blur(8px)" }
              : look === "dark"
                ? { background: "#1d1d21", color: "#fff", border: "1px solid rgba(255,255,255,.12)" }
                : { color: "#fff" };
        const inner = (
          <span className="grid size-9 place-items-center rounded-full" style={style}>
            <SocialGlyph network={s.network} size={17} />
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

/** A link: a real /go/ link on the live page, an inert box in previews. */
export function LinkShell({ block, preview, className, style, children }: { block: RenderBlock; preview: boolean; className?: string; style?: CSSProperties; children: ReactNode }) {
  if (preview) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <a href={`/go/${block.id}`} rel="nofollow" className={className} style={style} data-warning={block.contentWarning ? "" : undefined} data-warning-text={block.contentWarning ? (block.contentWarningText ?? undefined) : undefined}>
      {children}
    </a>
  );
}

export function SensitiveTag() {
  return (
    <span className="shrink-0 rounded-full border border-current px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase opacity-80" title="Opens a content warning first">
      18+
    </span>
  );
}

export const isCard = (b: RenderBlock) => cardImage(b) !== null;

/** YouTube/Spotify player. In previews it shows a lightweight stand-in instead of loading the player. */
export function Embed({ block, preview, className, captionClass }: { block: RenderBlock; preview: boolean; className?: string; captionClass?: string }) {
  const e = embedSource(block.url);
  if (!e) return null;
  return (
    <figure className="w-full">
      {preview ? (
        <div
          className={`relative grid w-full place-items-center bg-gradient-to-br from-[#2b2540] to-[#0f0d18] bg-cover bg-center ${className ?? ""}`}
          style={{ aspectRatio: e.provider === "spotify" ? "5 / 2" : "16 / 9", backgroundImage: youtubeThumbnail(block.url) ? `url(${youtubeThumbnail(block.url)})` : undefined }}
        >
          <span className="grid size-12 place-items-center rounded-full bg-white/90 text-black">
            <Play className="size-5 translate-x-px" fill="currentColor" />
          </span>
          <span className="absolute bottom-2 left-3 text-[11px] font-medium text-white/80">{e.provider === "youtube" ? "YouTube" : "Spotify"}</span>
        </div>
      ) : (
        <iframe
          src={e.src}
          title={block.title || (e.provider === "youtube" ? "YouTube video" : "Spotify player")}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className={`w-full border-0 ${className ?? ""}`}
          style={{ aspectRatio: e.aspect === "auto" ? undefined : e.aspect, height: e.aspect === "auto" ? 152 : undefined }}
        />
      )}
      {block.title ? <figcaption className={`mt-2 text-center text-sm ${captionClass ?? ""}`}>{block.title}</figcaption> : null}
    </figure>
  );
}

export function Badge({ show, preview, color }: { show: boolean; preview: boolean; color: string }) {
  if (!show) return null;
  return (
    <a href={preview ? undefined : "/?ref=badge"} className="mt-10 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium" style={{ color, border: `1px solid ${color}55` }}>
      Made with {brand.name}
    </a>
  );
}
