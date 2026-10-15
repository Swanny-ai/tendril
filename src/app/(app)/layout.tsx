import { Toaster } from "@/components/ui/sonner";
import { requireUserId } from "@/lib/session";

export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();
  return (
    <>
      {children}
      <Toaster position="bottom-center" />
    </>
  );
}
