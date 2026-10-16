"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, BarChart3, CreditCard, Globe, LayoutDashboard, LayoutTemplate, Link2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  // Bio pages: the list and the template gallery; editing a page also counts as this section.
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate, also: ["/dashboard/editor"] },
  { href: "/dashboard/links", label: "Deep links", icon: Link2 },
  { href: "/dashboard/domains", label: "Custom domains", icon: Globe },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ horizontal = false }: { horizontal?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn(horizontal ? "flex gap-1 overflow-x-auto py-2" : "flex flex-col gap-1")} aria-label="Dashboard">
      {items.map(({ href, label, icon: Icon, also }) => {
        const active = href === "/dashboard" ? pathname === href : [href, ...(also ?? [])].some((h) => pathname.startsWith(h));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <NavIcon icon={Icon} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The item's icon, swapped for a spinner while its page loads, so every click shows a response. */
function NavIcon({ icon: Icon }: { icon: typeof Loader2 }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-4 animate-spin" aria-label="Loading" /> : <Icon className="size-4" />;
}
