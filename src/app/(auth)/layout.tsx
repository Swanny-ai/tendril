import { Logo } from "@/components/brand/logo";
import { Toaster } from "@/components/ui/sonner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--plum)_14%,transparent),transparent)]"
      />
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      <Toaster position="bottom-center" />
    </main>
  );
}
