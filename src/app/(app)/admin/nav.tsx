"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CreditCard, Flag, Gift, Globe, Headset, LayoutDashboard, LayoutTemplate, Link2, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/pages", label: "Bio pages", icon: LayoutTemplate },
  { href: "/admin/links", label: "Links", icon: Link2 },
  { href: "/admin/support", label: "Support", icon: Headset },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/domains", label: "Domains", icon: Globe },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/affiliates", label: "Affiliates", icon: Gift },
  { href: "/admin/activity", label: "Traffic", icon: Activity },
];

export function AdminNav({ badges, horizontal = false }: { badges: Record<string, number>; horizontal?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn(horizontal ? "flex gap-1 overflow-x-auto py-2" : "flex flex-col gap-1")} aria-label="Admin">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        const badge = badges[href] ?? 0;
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
            {badge ? <span className="ml-auto rounded-full bg-[var(--persimmon)] px-1.5 text-[11px] font-semibold text-white tabular-nums">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function NavIcon({ icon: Icon }: { icon: typeof Loader2 }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-4 animate-spin" aria-label="Loading" /> : <Icon className="size-4" />;
}
