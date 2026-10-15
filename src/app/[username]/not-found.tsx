import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-3xl font-semibold">No page here yet</h1>
        <p className="mt-2 text-muted-foreground">This name is free on {brand.name}. It could be yours.</p>
      </div>
      <Link href="/signup" className={buttonVariants({ size: "lg" })}>
        Claim it for free
      </Link>
    </main>
  );
}
