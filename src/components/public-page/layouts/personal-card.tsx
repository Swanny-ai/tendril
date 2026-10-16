// Personal Card: one striking 3D card with a holographic sheen. Photo, name and title on
// the card, a glass bar with the handle and a call-to-action, other links below.
import type { RenderBlock } from "../public-page";
import { Countdown } from "./countdown";
import { Badge, displayName, Embed, heroImage, LinkShell, NameHeading, SensitiveTag, SocialIcons, splitBlocks, type LayoutProps } from "./shared";
import { TiltCard } from "./tilt-card";

export function PersonalCard({ page, preview }: LayoutProps) {
  const { socials, rest } = splitBlocks(page.blocks);
  const photo = heroImage(page, "personal-card");
  const firstLink = rest.find((b) => b.type === "LINK");
  const others = rest.filter((b) => b !== firstLink);

  const block = (b: RenderBlock) => {
    if (b.type === "HEADER") return <h2 key={b.id} className="mt-2 text-center text-[11px] font-bold tracking-[.25em] text-white/60 uppercase">{b.title}</h2>;
    if (b.type === "TEXT") return <p key={b.id} className="text-center text-sm leading-relaxed whitespace-pre-line text-white/80">{b.data.text}</p>;
    if (b.type === "EMBED") return <Embed key={b.id} block={b} preview={preview} className="overflow-hidden rounded-2xl" captionClass="text-white/80" />;
    if (b.type === "COUNTDOWN")
      return <Countdown key={b.id} until={b.data.until} title={b.title} look={{ box: { background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.15)" }, label: { color: "rgba(255,255,255,.55)" }, title: { color: "#fff" } }} />;
    if (b.type !== "LINK") return null;
    return (
      <LinkShell key={b.id} block={b} preview={preview} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20">
        <span className="truncate">{b.title || b.url}</span> {b.contentWarning ? <SensitiveTag /> : null}
      </LinkShell>
    );
  };

  return (
    <div className="relative min-h-full w-full flex-1 overflow-hidden bg-[#09080b] font-[family-name:var(--font-sans)] text-white">
      {/* Soft colour glow behind the card, taken from the photo itself. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,transparent,rgba(9,8,11,.85))]" />
      <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center px-6 pt-10 pb-10">
        <TiltCard still={preview} className="w-full overflow-hidden rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]">
          <div className="relative aspect-[3/4] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />
            <div className="absolute inset-x-0 top-0 flex flex-col items-center px-4 pt-6 text-center">
              <NameHeading preview={preview} className="text-2xl font-extrabold tracking-tight drop-shadow-lg">
                {displayName(page)}
              </NameHeading>
              {page.tagline ? <p className="text-xs font-medium text-white/80">{page.tagline}</p> : null}
            </div>
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/35 px-3.5 py-2.5 backdrop-blur-md">
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold">@{page.username}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                  <span className="size-1.5 rounded-full bg-[#4ade80]" aria-hidden /> Available
                </p>
              </div>
              {firstLink ? (
                <LinkShell block={firstLink} preview={preview} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/90 px-3.5 py-2 text-xs font-bold text-black transition hover:bg-white">
                  {firstLink.title || "Get in touch"} {firstLink.contentWarning ? <SensitiveTag /> : null}
                </LinkShell>
              ) : null}
            </div>
          </div>
        </TiltCard>
        {page.bio ? <p className="mt-5 max-w-[38ch] text-center text-sm leading-relaxed whitespace-pre-line text-white/80">{page.bio}</p> : null}
        <div className="mt-4">
          <SocialIcons socials={socials} preview={preview} look="glass" />
        </div>
        {others.length ? <div className="mt-5 flex w-full flex-col gap-3">{others.map(block)}</div> : null}
        <Badge show={page.showBadge} preview={preview} color="#ffffff" />
      </div>
    </div>
  );
}
