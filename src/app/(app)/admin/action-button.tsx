"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AdminResult } from "./actions";

/**
 * One admin action as a button: sends `fields` to the server action and shows the result as a toast.
 * `confirm` asks first; `typeToConfirm` makes the admin type that text (sent as "confirm").
 */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  typeToConfirm,
  variant = "outline",
  size = "sm",
  redirectTo,
}: {
  /** Where to go after it worked (e.g. back to the list once the item is deleted). */
  redirectTo?: string;
  action: (form: FormData) => Promise<AdminResult>;
  fields: Record<string, string>;
  children: React.ReactNode;
  confirm?: string;
  typeToConfirm?: string;
  variant?: "default" | "outline" | "destructive" | "ghost" | "secondary";
  size?: "sm" | "default" | "xs" | "icon-sm";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = () => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    if (typeToConfirm) {
      const typed = window.prompt(`${confirm ?? "Are you sure?"}\n\nType ${typeToConfirm} to confirm.`);
      if (typed === null) return;
      form.set("confirm", typed);
    } else if (confirm && !window.confirm(confirm)) return;
    start(async () => {
      const res = await action(form);
      if (res.error) toast.error(res.error);
      else if (res.ok) {
        toast.success(res.ok);
        if (redirectTo) router.push(redirectTo);
      }
    });
  };
  return (
    <Button type="button" variant={variant} size={size} disabled={pending} onClick={run}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
