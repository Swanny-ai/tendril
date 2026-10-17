"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePageAction } from "../pages-actions";

/** Delete the page being edited (only offered when the account has more than one). */
export function DeletePage({ pageId, username }: { pageId: string; username: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4">
      <div>
        <p className="font-medium">Delete /{username}</p>
        <p className="text-sm text-muted-foreground">Removes this page, its blocks and its stats. Your other pages stay.</p>
      </div>
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() =>
          toast(`Delete /${username}? This can't be undone.`, {
            action: {
              label: "Delete",
              onClick: () =>
                start(async () => {
                  const res = await deletePageAction(pageId);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(`Deleted /${username}`);
                  router.refresh();
                }),
            },
          })
        }
      >
        <Trash2 /> Delete page
      </Button>
    </div>
  );
}
