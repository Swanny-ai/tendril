import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Original mark: a curling tendril drawn as a single stroke. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" fill="var(--plum)" />
      <path
        d="M9 23c0-6 4-10 9-10 3 0 5 2 5 4.5S21 21 19 21s-3-1.2-3-2.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="23" cy="9.5" r="2.2" fill="var(--persimmon)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-heading text-lg font-semibold", className)}>
      <LogoMark />
      <span>{brand.name}</span>
    </Link>
  );
}
