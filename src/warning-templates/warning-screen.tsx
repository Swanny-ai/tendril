// Renders an 18+ warning page in any template. Pure presentational component (no hooks):
// used by the public warning routes and by the dashboard's live preview.
import type { CSSProperties } from "react";
import { Roboto } from "next/font/google";
import { brand } from "@/config/brand";
import type { WarningTemplate } from "./templates";

const roboto = Roboto({ weight: ["400", "500", "700"], subsets: ["latin"], display: "swap", variable: "--font-roboto" });

const FONT: Record<WarningTemplate["font"], string> = {
  sans: "var(--font-sans), system-ui, sans-serif",
  display: "var(--font-display), var(--font-sans), system-ui, sans-serif",
  serif: "var(--font-serif), Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  roboto: "var(--font-roboto), -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

export type WarningScreenProps = {
  template: WarningTemplate;
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

function ShieldIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="M9.5 12h5M12 9.5v5" transform="rotate(45 12 12)" />
    </svg>
  );
}

function LockIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </svg>
  );
}

function Icon({ t, size }: { t: WarningTemplate; size?: number }) {
  return t.icon === "lock" ? <LockIcon color={t.iconColor} size={size} /> : <ShieldIcon color={t.iconColor} size={size} />;
}

export function WarningScreen(p: WarningScreenProps) {
  const t = p.template;
  const Tag = p.preview ? "span" : "a";
  const Heading = p.preview ? "p" : "h1";
  const buttonStyle: CSSProperties = {
    background: t.buttonBg,
    color: t.buttonText,
    borderRadius: t.buttonRadius ?? (t.radius === 0 ? 0 : Math.min(t.radius, 999)),
    boxShadow: t.compact ? `0 2px 8px ${t.buttonSolid}33` : undefined,
  };

  const actions = (
    <div className={t.compact ? "flex w-full flex-col items-center gap-3" : "mt-7 flex w-full flex-col items-center gap-3"}>
      <Tag
        {...(p.preview ? {} : { href: p.continueHref, rel: "nofollow" })}
        className={[
          "flex min-h-12 w-full items-center justify-center transition-[transform,filter] active:scale-[0.98] hover:brightness-95",
          t.buttonFullWidth ? "" : "max-w-xs",
          t.compact ? "px-8 py-4 text-base font-medium" : "px-6 py-3 text-[15px] font-semibold shadow-sm",
          t.buttonUppercase ? "uppercase" : "",
        ].join(" ")}
        style={buttonStyle}
        data-testid="warning-continue"
      >
        {p.button}
      </Tag>
      {t.hideLeave ? null : (
        <Tag {...(p.preview ? {} : { href: p.leaveHref, rel: "nofollow" })} className="px-4 py-2 text-sm font-medium underline-offset-4 hover:underline" style={{ color: t.muted }}>
          {p.leave}
        </Tag>
      )}
    </div>
  );

  const destination =
    !t.hideDestination && p.destinationHost && p.destinationLabel ? (
      <p className="mt-3 text-sm" style={{ color: t.muted }}>
        {p.destinationLabel} <span className="font-medium" style={{ color: t.text }}>{p.destinationHost}</span>
      </p>
    ) : null;

  const owner = p.ownerName ? (
    <p className="mb-1 text-sm font-medium" style={{ color: t.muted }}>
      {p.ownerName}
    </p>
  ) : null;

  const badge = p.showBadge ? (
    <p className="mt-10 text-xs" style={{ color: t.muted }}>
      Made with {brand.name}
    </p>
  ) : null;

  const body = t.compact ? (
    <>
      {owner}
      <Heading className="mb-3 text-[22px] leading-tight font-bold" style={{ fontFamily: "inherit" }}>
        {p.title}
      </Heading>
      <p className="mx-auto mb-8 max-w-[280px] text-[15px] leading-[1.6]" style={{ color: t.muted }}>
        {p.message}
      </p>
      {destination}
      {actions}
    </>
  ) : (
    <>
      {owner}
      <Heading className="text-2xl leading-tight font-semibold" style={{ fontFamily: "inherit" }}>
        {p.title}
      </Heading>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: t.muted }}>
        {p.message}
      </p>
      {destination}
      {actions}
    </>
  );

  let content: React.ReactNode;
  if (t.layout === "split") {
    content = (
      <div className="w-full max-w-md overflow-hidden text-center shadow-xl" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: t.radius }}>
        <div className="flex flex-col items-center gap-2 px-8 py-8" style={{ background: t.accent }}>
          <span className="flex size-14 items-center justify-center rounded-full" style={{ background: t.iconBg }}>
            <Icon t={t} />
          </span>
          <span className="text-4xl font-bold tracking-tight text-white">18+</span>
        </div>
        <div className="px-7 pt-7 pb-8">{body}</div>
      </div>
    );
  } else if (t.layout === "bigtype") {
    content = (
      <div className="w-full max-w-md text-center">
        <p className="text-[96px] leading-none font-black tracking-tighter" style={{ color: t.accent }} aria-hidden>
          18+
        </p>
        <div className="mt-6">{body}</div>
      </div>
    );
  } else if (t.layout === "fullbleed") {
    content = (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full" style={{ background: t.iconBg }}>
          <Icon t={t} size={32} />
        </span>
        {body}
      </div>
    );
  } else if (t.compact) {
    content = (
      <div className="w-full max-w-[400px] p-5 [animation:tendril-fade-up_0.4s_ease-out]">
        <div className="px-8 py-10 text-center" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: t.radius, boxShadow: t.cardShadow }}>
          <span className="mx-auto mb-7 flex size-16 items-center justify-center rounded-full" style={{ background: t.iconBg }}>
            <Icon t={t} size={28} />
          </span>
          {body}
        </div>
      </div>
    );
  } else {
    content = (
      <div
        className="w-full max-w-md px-7 py-9 text-center shadow-2xl backdrop-blur-md"
        style={{
          background: t.cardBg,
          border: `1.5px solid ${t.cardBorder}`,
          borderRadius: t.radius,
          boxShadow: t.cardShadow ?? (t.key === "ember" ? `0 0 0 1px ${t.cardBorder}, 0 0 40px -10px ${t.cardBorder}` : undefined),
        }}
      >
        <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full" style={{ background: t.iconBg }}>
          <Icon t={t} />
        </span>
        {body}
      </div>
    );
  }

  return (
    <div
      lang={p.lang}
      className={`${roboto.variable} flex min-h-full w-full flex-col items-center justify-center ${t.compact ? "px-0 py-12" : "px-5 py-12"}`}
      style={{ background: t.pageBg, color: t.text, fontFamily: FONT[t.font] }}
    >
      {content}
      {badge}
    </div>
  );
}
