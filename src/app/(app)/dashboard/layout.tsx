import { Logo } from "@/components/brand/logo";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { listPages } from "@/lib/current-page";
import { requirePage } from "@/lib/session";
import { DashboardNav } from "./nav";
import { PageLinkBar } from "./page-link-bar";
import { PageSwitcher } from "./page-switcher";
import { UserMenu } from "./user-menu";
import { VerifyBanner } from "./verify-banner";

export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, page } = await requirePage();
  const [plan, user, pages] = await Promise.all([
    getPlan(userId),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, emailVerified: true } }),
    listPages(userId),
  ]);
  const publicUrl = `${appUrl}/${page.username}`;

  return (
    <div className="flex min-h-svh flex-1">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <Logo href="/dashboard" className="mb-6 px-2" />
        <DashboardNav />
        <div className="mt-auto rounded-xl border bg-card p-3 text-sm">
          <p className="font-medium">{plan === "PRO" ? "Pro plan" : "Free plan"}</p>
          <p className="text-muted-foreground">{plan === "PRO" ? "Thanks for supporting us." : "Unlock themes, analytics and more."}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Logo href="/dashboard" />
          </div>
          <PageSwitcher pages={pages} currentId={page.id} />
          <div className="hidden min-w-0 sm:block">
            <PageLinkBar url={publicUrl} />
          </div>
          <div className="ml-auto">
            <UserMenu username={page.username} />
          </div>
        </header>
        {!user.emailVerified ? <VerifyBanner email={user.email} /> : null}
        <div className="border-b px-2 md:hidden">
          <DashboardNav horizontal />
        </div>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
