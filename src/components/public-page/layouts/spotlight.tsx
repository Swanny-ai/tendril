// Spotlight Card: an immersive full-screen photo background with glass buttons,
// a highlighted featured card and an optional countdown.
import { cardImage } from "@/lib/blocks";
import type { RenderBlock } from "../public-page";
import { Countdown } from "./countdown";
import { Avatar, Badge, displayName, Embed, heroImage, isCard, LinkShell, NameHeading, SensitiveTag, SocialIcons, splitBlocks, type LayoutProps } from "./shared";

const ACCENT = "#f472b6";

export function Spotlight({ page, preview }: LayoutProps) {
  const { socials, rest } = splitBlocks(page.blocks);
  const bg = heroImage(page, "spotlight");

  const block = (b: RenderBlock) => {
    if (b.type === "HEADER") return <h2 key={b.id} className="mt-2 text-center text-[11px] font-bold tracking-[.22em] text-white/70 uppercase">{b.title}</h2>;
    if (b.type === "TEXT") return <p key={b.id} className="text-center text-sm leading-relaxed whitespace-pre-line text-white/85 drop-shadow">{b.data.text}</p>;
    if (b.type === "EMBED") return <Embed key={b.id} block={b} preview={preview} className="overflow-hidden rounded-2xl border border-white/25" captionClass="text-white/85" />;
    if (b.type === "COUNTDOWN")
      return (
        <Countdown
          key={b.id}
          until={b.data.until}
          title={b.title}
          look={{ box: { background: "rgba(0,0,0,.45)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", backdropFilter: "blur(8px)" }, label: { color: "rgba(255,255,255,.6)" }, title: { color: "#fff" } }}
        />
      );
    if (b.type !== "LINK") return null;
    if (isCard(b))
      return (
        <LinkShell key={b.id} block={b} preview={preview} className="group relative block overflow-hidden rounded-2xl border-2 shadow-[0_10px_40px_-10px_rgba(244,114,182,.6)]" style={{ borderColor: ACCENT }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage(b) ?? undefined} alt="" className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-3 text-sm font-bold text-white">
            {b.title || b.url} {b.contentWarning ? <SensitiveTag /> : null}
          </span>
        </LinkShell>
      );
    return (
      <LinkShell
        key={b.id}
        block={b}
        preview={preview}
        className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-white/25"
      >
        <span className="truncate">{b.title || b.url}</span> {b.contentWarning ? <SensitiveTag /> : null}
      </LinkShell>
    );
  };

  return (
    <div className="relative min-h-full w-full flex-1 overflow-hidden font-[family-name:var(--font-sans)] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bg} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/80" />
      <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center px-5 pt-10 pb-10">
        <Avatar page={page} size={76} ring={ACCENT} />
        <NameHeading preview={preview} className="mt-3 text-center text-2xl font-bold drop-shadow-lg">
          {displayName(page)}
        </NameHeading>
        <p className="text-sm text-white/80">@{page.username}</p>
        {page.tagline ? <p className="mt-1 text-xs font-medium text-white/75">{page.tagline}</p> : null}
        {page.bio ? <p className="mt-2 max-w-[38ch] text-center text-sm leading-relaxed whitespace-pre-line text-white/85">{page.bio}</p> : null}
        <div className="mt-4">
          <SocialIcons socials={socials} preview={preview} look="glass" />
        </div>
        <div className="mt-6 flex w-full flex-col gap-3.5">{rest.map(block)}</div>
        <Badge show={page.showBadge} preview={preview} color="#ffffff" />
      </div>
    </div>
  );
}
