// Simple Stack: a calm, light link page. Soft rounded buttons, image cards and media.
import { cardImage } from "@/lib/blocks";
import type { RenderBlock } from "../public-page";
import { Countdown } from "./countdown";
import { Avatar, Badge, displayName, Embed, isCard, LinkShell, NameHeading, SensitiveTag, SocialIcons, splitBlocks, type LayoutProps } from "./shared";

export function SimpleStack({ page, preview }: LayoutProps) {
  const { socials, rest } = splitBlocks(page.blocks);

  const block = (b: RenderBlock) => {
    if (b.type === "HEADER") return <h2 key={b.id} className="mt-2 text-center text-xs font-semibold tracking-[.18em] text-[#6b6775] uppercase">{b.title}</h2>;
    if (b.type === "TEXT") return <p key={b.id} className="text-center text-[15px] leading-relaxed whitespace-pre-line text-[#3b3846]">{b.data.text}</p>;
    if (b.type === "EMBED") return <Embed key={b.id} block={b} preview={preview} className="overflow-hidden rounded-2xl shadow-[0_6px_20px_-8px_rgba(20,20,40,.25)]" captionClass="text-[#3b3846]" />;
    if (b.type === "COUNTDOWN")
      return (
        <div key={b.id} className="rounded-2xl bg-white p-4 shadow-[0_6px_20px_-10px_rgba(20,20,40,.3)]">
          <Countdown until={b.data.until} title={b.title} look={{ box: { background: "#f3f1fb", color: "#1c1a24" }, label: { color: "#6b6775" }, title: { color: "#5b3fd1" } }} />
        </div>
      );
    if (b.type !== "LINK") return null;
    if (isCard(b))
      return (
        <LinkShell key={b.id} block={b} preview={preview} className="block overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-10px_rgba(20,20,40,.35)] transition-transform hover:-translate-y-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage(b) ?? undefined} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
          <span className="flex items-center justify-center gap-2 px-4 py-3 text-[15px] font-semibold text-[#1c1a24]">
            {b.title || b.url} {b.contentWarning ? <SensitiveTag /> : null}
          </span>
        </LinkShell>
      );
    return (
      <LinkShell key={b.id} block={b} preview={preview} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-[15px] font-semibold text-[#1c1a24] shadow-[0_6px_20px_-10px_rgba(20,20,40,.35)] transition-transform hover:-translate-y-0.5">
        <span className="truncate">{b.title || b.url}</span> {b.contentWarning ? <SensitiveTag /> : null}
      </LinkShell>
    );
  };

  return (
    <div className="min-h-full w-full flex-1 bg-[#f4f3f8] font-[family-name:var(--font-sans)] text-[#1c1a24]">
      <div className="h-36 w-full bg-[radial-gradient(80%_120%_at_20%_0%,#ffe9a8_0%,transparent_60%),radial-gradient(80%_120%_at_90%_10%,#c9bdfb_0%,transparent_60%),#efeaf9]" />
      <div className="mx-auto -mt-16 flex w-full max-w-[480px] flex-col items-center px-5 pb-10">
        <Avatar page={page} size={104} ring="#ffffff" className="shadow-lg" />
        <NameHeading preview={preview} className="mt-3 text-center text-2xl font-bold">
          {displayName(page)}
        </NameHeading>
        {page.tagline ? <p className="mt-0.5 text-sm font-medium text-[#5b3fd1]">{page.tagline}</p> : null}
        {page.bio ? <p className="mt-2 max-w-[40ch] text-center text-[15px] leading-relaxed whitespace-pre-line text-[#55505f]">{page.bio}</p> : null}
        <div className="mt-4">
          <SocialIcons socials={socials} preview={preview} look="color" />
        </div>
        <div className="mt-6 flex w-full flex-col gap-3">{rest.map(block)}</div>
        <Badge show={page.showBadge} preview={preview} color="#6b6775" />
      </div>
    </div>
  );
}
