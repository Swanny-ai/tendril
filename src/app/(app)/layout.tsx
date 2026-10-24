import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { requireUserId } from "@/lib/session";

export const instant = false;
// Signed-in screens (dashboard, editor, onboarding) are never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();
  return (
    <>
      {children}
      <Toaster position="bottom-center" />
    </>
  );
}
