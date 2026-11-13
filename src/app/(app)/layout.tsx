import type { Metadata } from "next";
import { APP_THEME_SCRIPT, AppThemeScope } from "@/components/app-theme";
import { Toaster } from "@/components/ui/sonner";
import { requireUserId } from "@/lib/session";

export const instant = false;
// Signed-in screens (dashboard, editor, onboarding) are never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();
  return (
    <>
      {/* The saved Light/Dark choice, applied before the page paints. */}
      <script dangerouslySetInnerHTML={{ __html: APP_THEME_SCRIPT }} />
      <AppThemeScope />
      {children}
      <Toaster position="bottom-center" />
    </>
  );
}
