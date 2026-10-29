import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { adminUnreadTickets } from "@/lib/support";
import { AdminNav } from "./nav";

export const instant = false;
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };

// The site owner's dashboard: its own sidebar, separate from the creators' dashboard.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await requireAdmin();
  const [me, openReports, openPayouts, openSupport] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } }),
    db.linkReport.count(),
    db.payoutRequest.count({ where: { status: "requested" } }),
    adminUnreadTickets(),
  ]);
  const badges = { "/admin/reports": openReports, "/admin/affiliates": openPayouts, "/admin/support": openSupport };

  return (
    <div className="flex min-h-svh flex-1">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Logo href="/admin" />
          <span className="flex items-center gap-1 rounded-full bg-[var(--persimmon)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--persimmon)]">
            <ShieldCheck className="size-3" aria-hidden /> Admin
          </span>
        </div>
        <AdminNav badges={badges} />
        <div className="mt-auto space-y-2">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to my dashboard
          </Link>
          <p className="truncate px-3 text-xs text-muted-foreground">{me.email}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:hidden">
          <Logo href="/admin" />
          <span className="text-xs font-semibold text-[var(--persimmon)]">Admin</span>
          <Link href="/dashboard" className="ml-auto text-sm text-muted-foreground">
            My dashboard
          </Link>
        </header>
        <div className="border-b px-2 md:hidden">
          <AdminNav badges={badges} horizontal />
        </div>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
