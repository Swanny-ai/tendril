import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The mark: the owner's "VR" monogram (a V flowing into an R with a play button in its bowl),
 * redrawn as vector strokes in black on a solid green tile (no gradient ids, so copies hidden
 * with CSS can't break the visible one).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="95 95 1760 1760" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect x="95" y="95" width="1760" height="1760" rx="380" fill="#49f264" />
      <path
        d="M343 830 L627 1290 L925 712 C995 610 1095 588 1220 588 L1300 588 C1460 588 1578 720 1578 890 C1578 1075 1420 1160 1190 1205 L1470 1472"
        fill="none"
        stroke="#0a0a0a"
        strokeWidth="156"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1150 830 L1150 1015 L1318 922 Z" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="44" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark plus wordmark: "View" in the text color, "Link" in brand green. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  const split = brand.name.match(/^(.*?)(Link)$/);
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight", className)}>
      <LogoMark />
      {split ? (
        <span>
          {split[1]}
          <span className="text-[#49f264]">{split[2]}</span>
        </span>
      ) : (
        <span>{brand.name}</span>
      )}
    </Link>
  );
}
