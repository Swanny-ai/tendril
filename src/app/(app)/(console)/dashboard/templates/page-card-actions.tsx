"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { BarChart3, Link2, Loader2, PencilRuler, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LinkTargetPicker, type DomainOption } from "../link-target-picker";
import { deletePageAction, editPageAction, updatePageLinkAction } from "../pages-actions";

/** Edit, change link and delete buttons for one of the creator's bio pages. */
export function PageCardActions({
  page,
  appHost,
  domains,
  canDelete,
}: {
  page: { id: string; username: string; domainId: string | null; atRoot: boolean };
  appHost: string;
  domains: DomainOption[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState({ domainId: page.domainId, atRoot: page.atRoot });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <form action={editPageAction.bind(null, page.id)}>
        <Button type="submit" size="sm" aria-label={`Edit /${page.username}`}>
          <PencilRuler /> Edit
        </Button>
      </form>

      <NextLink href={`/dashboard/analytics?source=${page.id}`} className={buttonVariants({ size: "sm", variant: "outline" })} aria-label={`Analytics for /${page.username}`}>
        <BarChart3 /> Analytics
      </NextLink>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setTarget({ domainId: page.domainId, atRoot: page.atRoot });
            setError(null);
          }
        }}
      >
        <DialogTrigger render={<Button size="sm" variant="outline" aria-label={`Change the link of /${page.username}`} />}>
          <Link2 /> Link
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link for /{page.username}</DialogTitle>
            <DialogDescription>Choose the domain, and whether the page opens at its root or at /{page.username}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`target-${page.id}`}>Domain &amp; Path</Label>
            <LinkTargetPicker id={`target-${page.id}`} appHost={appHost} domains={domains} {...target} onChange={setTarget} />
            <p className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>
              {error ??
                (target.atRoot
                  ? `Opens at https://${domains.find((d) => d.id === target.domainId)?.hostname}/`
                  : `Opens at ${domains.find((d) => d.id === target.domainId)?.hostname ?? appHost}/${page.username}`)}
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await updatePageLinkAction(page.id, target);
                  if (!res.ok) return void setError(res.error);
                  setOpen(false);
                  toast.success("Link updated");
                  router.refresh();
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : null} Save link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canDelete ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-label={`Delete /${page.username}`}
          onClick={() =>
            toast(`Delete /${page.username}? Its blocks and stats go too. This can't be undone.`, {
              duration: 10000,
              action: {
                label: "Delete",
                onClick: () =>
                  start(async () => {
                    const res = await deletePageAction(page.id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(`Deleted /${page.username}`);
                    router.refresh();
                  }),
              },
            })
          }
        >
          <Trash2 /> Delete
        </Button>
      ) : null}
    </div>
  );
}
