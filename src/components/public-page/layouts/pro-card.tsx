// Pro Card: a dark, professional multi-link page. Photo header with a spaced-out name,
// then image links arranged as a featured card and a two-column gallery.
import type { ReactNode } from "react";
import type { RenderBlock } from "../public-page";
import { Countdown } from "./countdown";
import { Badge, displayName, Embed, heroImage, isCard, LinkShell, NameHeading, SensitiveTag, SocialIcons, splitBlocks, type LayoutProps } from "./shared";

function ImageTile({ b, preview, tall }: { b: RenderBlock; preview: boolean; tall: boolean }) {
  return (
    <LinkShell block={b} preview={preview} className="group relative block overflow-hidden rounded-xl bg-[#18181b]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.data.imageUrl} alt="" className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] ${tall ? "aspect-[4/3]" : "aspect-square"}`} loading="lazy" />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/85 to-transparent px-3 pt-8 pb-2.5 text-center text-xs font-semibold text-white">
        <span className="line-clamp-2">{b.title || b.url}</span> {b.contentWarning ? <SensitiveTag /> : null}
      </span>
    </LinkShell>
  );
}

export function ProCard({ page, preview }: LayoutProps) {
  const { socials, rest } = splitBlocks(page.blocks);

  // Consecutive image links become a featured card (when there's an odd one out) plus a 2-column grid.
  const out: ReactNode[] = [];
  for (let i = 0; i < rest.length; ) {
    const b = rest[i];
    if (isCard(b)) {
      const run: RenderBlock[] = [];
      while (i < rest.length && isCard(rest[i])) run.push(rest[i++]);
      const featured = run.length % 2 === 1 ? run.shift()! : null;
      if (featured) out.push(<ImageTile key={featured.id} b={featured} preview={preview} tall />);
      if (run.length)
        out.push(
          <div key={`grid-${run[0].id}`} className="grid grid-cols-2 gap-3">
            {run.map((x) => (
              <ImageTile key={x.id} b={x} preview={preview} tall={false} />
            ))}
          </div>,
        );
      continue;
    }
    i++;
    if (b.type === "HEADER") out.push(<h2 key={b.id} className="mt-2 text-center text-[11px] font-bold tracking-[.3em] text-white/55 uppercase">{b.title}</h2>);
    else if (b.type === "TEXT") out.push(<p key={b.id} className="text-center text-sm leading-relaxed whitespace-pre-line text-white/75">{b.data.text}</p>);
    else if (b.type === "EMBED") out.push(<Embed key={b.id} block={b} preview={preview} className="overflow-hidden rounded-xl" captionClass="text-white/75" />);
    else if (b.type === "COUNTDOWN")
      out.push(<Countdown key={b.id} until={b.data.until} title={b.title} look={{ box: { background: "#18181b", color: "#fff", border: "1px solid rgba(255,255,255,.1)" }, label: { color: "rgba(255,255,255,.5)" }, title: { color: "#fff" } }} />);
    else if (b.type === "LINK")
      out.push(
        <LinkShell key={b.id} block={b} preview={preview} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#18181b] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-[#202024]">
          <span className="truncate">{b.title || b.url}</span> {b.contentWarning ? <SensitiveTag /> : null}
        </LinkShell>,
      );
  }

  return (
    <div className="min-h-full w-full flex-1 bg-[#0c0c0e] font-[family-name:var(--font-sans)] text-white">
      <div className="mx-auto w-full max-w-[480px]">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage(page, "pro-card")} alt="" className="aspect-[5/6] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0c0c0e]" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-1">
            <NameHeading preview={preview} className="text-center text-2xl font-black tracking-[.35em] uppercase drop-shadow-lg">
              {displayName(page)}
            </NameHeading>
            <p className="mt-1 text-xs text-white/70">@{page.username}</p>
            {page.tagline ? <p className="mt-0.5 text-xs text-white/60">{page.tagline}</p> : null}
          </div>
        </div>
        <div className="flex flex-col items-center px-4 pb-10">
          <div className="mt-3">
            <SocialIcons socials={socials} preview={preview} look="dark" />
          </div>
          {page.bio ? <p className="mt-3 max-w-[40ch] text-center text-sm leading-relaxed whitespace-pre-line text-white/70">{page.bio}</p> : null}
          <div className="mt-5 flex w-full flex-col gap-3">{out}</div>
          <Badge show={page.showBadge} preview={preview} color="#a1a1aa" />
        </div>
      </div>
    </div>
  );
}
