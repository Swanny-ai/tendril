import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Original mark: a "V" drawn as one stroke, with a dot for the link it leads to. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" fill="var(--plum)" />
      <path d="M8.5 10.5 15 22.5l6.5-12" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="9.5" r="2.3" fill="var(--persimmon)" />
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
