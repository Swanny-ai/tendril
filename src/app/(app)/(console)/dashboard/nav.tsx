"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, BarChart3, CreditCard, Gift, Globe, HeartPulse, LayoutDashboard, LayoutTemplate, Link2, List, ScanSearch, Settings, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Loader2; also?: string[] };

// Grouped by what each page is for. The first group has no heading: it's the home of the dashboard.
const groups: { label?: string; items: Item[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      // Every link in one list: bio pages, Two-Steps and Deeplinks.
      { href: "/dashboard/my-links", label: "My links", icon: List },
    ],
  },
  {
    label: "Create",
    items: [
      // Classic deep links: short link, open in browser, optional 18+ page.
      { href: "/dashboard/deeplinks", label: "Deeplinks", icon: Link2 },
      // Template pages (deep links that open a designed page). Deep links are edited at /edit/<link>
      // (but /edit/template/ belongs to Templates).
      { href: "/dashboard/links", label: "Two-Steps", icon: Unlink, also: ["/edit/"] },
      // Bio pages: the list and the template gallery; editing a page also counts as this section.
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate, also: ["/dashboard/editor", "/edit/template/"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      // Checks each link opens in the apps and browsers and leads somewhere that works.
      { href: "/dashboard/link-health", label: "Link Health", icon: HeartPulse },
      // Every outside link in an Instagram data download, read in the browser.
      { href: "/dashboard/link-history", label: "IG Link History", icon: ScanSearch },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/domains", label: "Custom domains", icon: Globe },
      { href: "/dashboard/billing", label: "Pricing", icon: CreditCard },
      { href: "/dashboard/affiliate", label: "Affiliate", icon: Gift },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, { href, also }: Item) {
  if (href === "/dashboard") return pathname === href;
  return [href, ...(also ?? [])].some((h) => pathname.startsWith(h)) && !(href === "/dashboard/links" && pathname.startsWith("/edit/template/"));
}

export function DashboardNav({ horizontal = false }: { horizontal?: boolean }) {
  const pathname = usePathname();
  const item = (it: Item) => {
    const active = isActive(pathname, it);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
          horizontal ? "py-2" : "py-1.5",
          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <NavIcon icon={it.icon} />
        {it.label}
      </Link>
    );
  };

  // Phones: one scrolling row, with a thin divider between the groups.
  if (horizontal) {
    return (
      <nav className="flex items-center gap-1 overflow-x-auto py-2" aria-label="Dashboard">
        {groups.map((g, i) => [i > 0 ? <span key={`sep-${i}`} aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" /> : null, ...g.items.map(item)])}
      </nav>
    );
  }

  return (
    <nav className="-mx-1 mb-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1" aria-label="Dashboard">
      {groups.map((g, i) => (
        <div key={g.label ?? i} role="group" aria-label={g.label ?? "Home"} className="flex flex-col gap-0.5">
          {g.label ? <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">{g.label}</p> : null}
          {g.items.map(item)}
        </div>
      ))}
    </nav>
  );
}

/** The item's icon, swapped for a spinner while its page loads, so every click shows a response. */
function NavIcon({ icon: Icon }: { icon: typeof Loader2 }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-4 animate-spin" aria-label="Loading" /> : <Icon className="size-4" />;
}
