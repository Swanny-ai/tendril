// Modern Card: a full-width photo hero that fades into the name, details and stacked links.
import { cardImage } from "@/lib/blocks";
import type { RenderBlock } from "../public-page";
import { Countdown } from "./countdown";
import { Badge, displayName, Embed, heroImage, isCard, LinkShell, NameHeading, SensitiveTag, SocialIcons, splitBlocks, type LayoutProps } from "./shared";

export function ModernCard({ page, preview }: LayoutProps) {
  const { socials, rest } = splitBlocks(page.blocks);

  const block = (b: RenderBlock) => {
    if (b.type === "HEADER") return <h2 key={b.id} className="mt-2 text-center text-xs font-bold tracking-[.2em] text-white/60 uppercase">{b.title}</h2>;
    if (b.type === "TEXT") return <p key={b.id} className="text-center text-sm leading-relaxed whitespace-pre-line text-white/80">{b.data.text}</p>;
    if (b.type === "EMBED") return <Embed key={b.id} block={b} preview={preview} className="overflow-hidden rounded-xl" captionClass="text-white/80" />;
    if (b.type === "COUNTDOWN")
      return <Countdown key={b.id} until={b.data.until} title={b.title} look={{ box: { background: "#1b1b20", color: "#fff", border: "1px solid rgba(255,255,255,.1)" }, label: { color: "rgba(255,255,255,.55)" }, title: { color: "#fff" } }} />;
    if (b.type !== "LINK") return null;
    if (isCard(b))
      return (
        <LinkShell key={b.id} block={b} preview={preview} className="group relative block overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage(b) ?? undefined} alt="" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
          <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pt-8 pb-3 text-sm font-semibold text-white">
            <span className="truncate">{b.title || b.url}</span> {b.contentWarning ? <SensitiveTag /> : null}
          </span>
        </LinkShell>
      );
    return (
      <LinkShell key={b.id} block={b} preview={preview} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-xs font-extrabold tracking-wide text-black uppercase transition hover:bg-white/90">
        <span className="truncate">{b.title || b.url}</span> {b.contentWarning ? <SensitiveTag /> : null}
      </LinkShell>
    );
  };

  return (
    <div className="min-h-full w-full flex-1 bg-[#0a0a0d] font-[family-name:var(--font-sans)] text-white">
      <div className="mx-auto w-full max-w-[480px]">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage(page, "modern-card")} alt="" className="aspect-[4/5] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0d]" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-2">
            <NameHeading preview={preview} className="text-center text-3xl font-extrabold tracking-tight drop-shadow-lg">
              {displayName(page)}
            </NameHeading>
            {page.tagline ? <p className="mt-1 text-sm font-medium text-white/75">{page.tagline}</p> : null}
          </div>
        </div>
        <div className="flex flex-col items-center px-5 pb-10">
          <div className="mt-2">
            <SocialIcons socials={socials} preview={preview} look="plain" />
          </div>
          {page.bio ? <p className="mt-2 max-w-[40ch] text-center text-sm leading-relaxed whitespace-pre-line text-white/70">{page.bio}</p> : null}
          <div className="mt-5 flex w-full flex-col gap-3">{rest.map(block)}</div>
          <Badge show={page.showBadge} preview={preview} color="#a1a1aa" />
        </div>
      </div>
    </div>
  );
}
