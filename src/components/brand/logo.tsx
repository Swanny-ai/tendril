import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Original mark: a gradient tile with a bold "V" made of two rounded strokes that overlap at the
 * point, like two links joining. Every copy draws the same gradient, so a shared id is safe.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
      <defs>
        <linearGradient id="vl-tile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6d4fe0" />
          <stop offset="0.55" stopColor="#8b4fd6" />
          <stop offset="1" stopColor="#f2643d" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9.5" fill="url(#vl-tile)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="none" stroke="#fff" strokeOpacity="0.18" />
      <path d="M10 9.5 16 22.5" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M22 9.5 16 22.5" stroke="#fff" strokeOpacity="0.62" strokeWidth="4.6" strokeLinecap="round" />
    </svg>
  );
}

/** Mark plus wordmark: "View" in the text color, "Link" in the brand gradient. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  const split = brand.name.match(/^(.*?)(Link)$/);
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight", className)}>
      <LogoMark />
      {split ? (
        <span>
          {split[1]}
          <span className="bg-gradient-to-r from-[#6d4fe0] to-[#f2643d] bg-clip-text text-transparent">{split[2]}</span>
        </span>
      ) : (
        <span>{brand.name}</span>
      )}
    </Link>
  );
}
