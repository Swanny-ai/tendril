import { Logo } from "@/components/brand/logo";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { PLAN_LABEL } from "@/lib/plan-rules";
import { isAdmin } from "@/lib/admin";
import { requireAccount } from "@/lib/session";
import { DashboardNav } from "./dashboard/nav";
import { UserMenu } from "./dashboard/user-menu";
import { VerifyBanner } from "./dashboard/verify-banner";
import { TrialBanner, TrialPopup } from "./dashboard/trial-notices";
import { trialInfo } from "@/lib/trial";
import { canSendEmail } from "@/lib/mailer";

// Shared by /dashboard/... and the editing screens at /edit/..., so moving between them keeps
// one sidebar and header (two copies of this layout would briefly render both).
export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, page } = await requireAccount();
  const [plan, user, admin, sub] = await Promise.all([
    getPlan(userId),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, emailVerified: true } }),
    isAdmin(userId),
    db.subscription.findUnique({ where: { userId }, select: { status: true, currentPeriodEnd: true } }),
  ]);
  const trial = { ...trialInfo(sub), userId };

  return (
    <div className="flex min-h-svh flex-1">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <Logo href="/dashboard" className="mb-6 px-2" />
        <DashboardNav />
        <div className="mt-auto flex items-end gap-2">
          <div className="min-w-0 flex-1 rounded-xl border bg-card p-3 text-sm">
            <p className="font-medium">{trial.onTrial ? "Pro trial" : `${PLAN_LABEL[plan]} plan`}</p>
            <p className="text-muted-foreground">
              {trial.onTrial
                ? `${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left`
                : plan !== "FREE"
                  ? "Thanks for supporting us."
                  : "Unlock themes, analytics and more."}
            </p>
          </div>
          <UserMenu label={page ? `@${page.username}` : user.email} admin={admin} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones only: the sidebar (logo, account menu) is hidden there. */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:hidden">
          <Logo href="/dashboard" />
          <div className="ml-auto">
            <UserMenu label={page ? `@${page.username}` : user.email} admin={admin} />
          </div>
        </header>
        {/* Only ask for confirmation when the site can actually send the email. */}
        {!user.emailVerified && canSendEmail() ? <VerifyBanner email={user.email} /> : null}
        <TrialBanner {...trial} />
        <TrialPopup {...trial} />
        <div className="border-b px-2 md:hidden">
          <DashboardNav horizontal />
        </div>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
