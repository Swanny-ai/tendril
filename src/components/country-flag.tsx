import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// Flag images come from flag-icons (MIT), copied to public/flags by scripts/copy-flags.mjs.
// Images rather than emoji, because Windows has no flag emoji and shows letters instead.

const SIZES = { sm: "h-3.5 w-[18.67px]", md: "h-4 w-[21.33px]", lg: "h-5 w-[26.67px]" } as const;

export function CountryFlag({ code, size = "md", className }: { code: string | null | undefined; size?: keyof typeof SIZES; className?: string }) {
  const valid = !!code && /^[A-Z]{2}$/.test(code);
  if (!valid) {
    return (
      <span aria-hidden className={cn("inline-grid shrink-0 place-items-center rounded-[3px] bg-muted text-muted-foreground", SIZES[size], className)}>
        <Globe className="size-3" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs, nothing to optimise
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      width={size === "lg" ? 27 : size === "md" ? 21 : 19}
      height={size === "lg" ? 20 : size === "md" ? 16 : 14}
      className={cn("inline-block shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.12)]", SIZES[size], className)}
    />
  );
}
