import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Shown to Free users: Customize template (template pages) is part of Pro. */
export function TemplateUpsell({ compact = false }: { compact?: boolean }) {
  if (compact)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
        <Lock className="size-4 text-primary" aria-hidden />
        <p className="min-w-0 flex-1">
          Customize template is part of Pro. Visitors see this link without its page until you upgrade.
        </p>
        <Link href="/dashboard/billing" className={buttonVariants({ size: "sm" })}>
          Upgrade to Pro
        </Link>
      </div>
    );
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <p className="text-lg font-semibold">Customize template is a Pro feature</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Build your own link page: a big cover photo, verified badge, photo links, countdown, fonts and animations. Share one link anywhere.
        </p>
        <Link href="/dashboard/billing" className={buttonVariants()}>
          <Lock /> Upgrade to Pro
        </Link>
      </CardContent>
    </Card>
  );
}
