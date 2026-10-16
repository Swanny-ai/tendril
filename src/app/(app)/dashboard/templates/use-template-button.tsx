"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyTemplateAction } from "./actions";

export function UseTemplateButton({ templateKey, name, active }: { templateKey: string; name: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      className="w-full"
      variant={active ? "outline" : "default"}
      disabled={pending}
      aria-label={active ? `${name} is your current template` : `Use the ${name} template`}
      onClick={() =>
        start(async () => {
          const res = await applyTemplateAction(templateKey);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(res.addedSamples ? `${name} applied with sample links. Make it yours in the editor.` : `${name} applied to your page.`);
          router.push("/dashboard/editor");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : active ? <Check /> : null}
      {active ? "Current template" : "Use template"}
    </Button>
  );
}
