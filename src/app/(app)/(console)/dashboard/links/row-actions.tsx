"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BarChart3, Copy, CopyPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { QrCodeButton } from "@/components/qr-code-button";
import { deleteSmartLinkAction, duplicateSmartLinkAction, toggleSmartLinkAction } from "./actions";

export function LinkRowActions({ id, slug, url, editHref, enabled }: { id: string; slug: string; url: string; editHref: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1">
      <Switch
        checked={enabled}
        disabled={pending}
        aria-label={enabled ? "Pause link" : "Activate link"}
        onCheckedChange={(v) =>
          start(async () => {
            const res = await toggleSmartLinkAction(id, v);
            if (!res.ok) toast.error(res.error);
            router.refresh();
          })
        }
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Copy link"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        }}
      >
        <Copy />
      </Button>
      <QrCodeButton url={url} filename={`qr-${slug}`} />
      <Link href={`/dashboard/analytics?source=${id}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Link analytics">
        <BarChart3 />
      </Link>
      <Link href={editHref} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Edit link">
        <Pencil />
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Duplicate link"
        title="Duplicate"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await duplicateSmartLinkAction(id);
            if (!res.ok) return void toast.error(res.error);
            toast.success(`Duplicated as /${res.slug}`);
            router.refresh();
          })
        }
      >
        <CopyPlus />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete link"
        disabled={pending}
        onClick={() => {
          toast("Delete this link? It stops working right away.", {
            action: {
              label: "Delete",
              onClick: () =>
                start(async () => {
                  await deleteSmartLinkAction(id);
                  toast.success("Link deleted");
                  router.refresh();
                }),
            },
          });
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
