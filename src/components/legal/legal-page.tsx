import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

// Shared frame for the Terms, Privacy and Refund pages: header, page switcher, readable text, footer.

export const LEGAL_PAGES = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
] as const;

export const LEGAL_UPDATED = "October 25, 2026";

export function LegalPage({ current, title, intro, children }: { current: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Logo href="/" />
          <Link href="/signup" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Create your page
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <nav aria-label="Legal" className="mb-8 flex flex-wrap gap-1 rounded-xl border bg-muted p-1 text-sm">
          {LEGAL_PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={p.href === current ? "page" : undefined}
              className={cn("rounded-lg px-3 py-1.5 font-medium", p.href === current ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
        <p className="mt-6 text-base leading-relaxed">{intro}</p>
        <div
          className={cn(
            "mt-8 space-y-4 text-[15px] leading-relaxed text-foreground/90",
            "[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground",
            "[&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground",
            "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
            "[&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline",
          )}
        >
          {children}
        </div>
        <p className="mt-12 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Questions? Email us at{" "}
          <a href={`mailto:${brand.supportEmail}`} className="text-primary hover:underline">
            {brand.supportEmail}
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Footer with the legal links, shared by the home page and the legal pages. */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 text-sm text-muted-foreground">
        <Logo className="text-base" />
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          {LEGAL_PAGES.map((p) => (
            <Link key={p.href} href={p.href} className="hover:text-foreground">
              {p.label}
            </Link>
          ))}
          <a href={`mailto:${brand.supportEmail}`} className="hover:text-foreground">
            Contact
          </a>
        </nav>
        <p>© {brand.name}. Made for people who make things.</p>
      </div>
    </footer>
  );
}
