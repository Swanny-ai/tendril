"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BarChart3, Copy, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toggleSmartLinkAction } from "../links/actions";
import { setPagePublishedAction } from "../pages-actions";

/** On/off switch, copy, open, analytics and edit buttons for one row of My links. */
export function MyLinkActions({
  id,
  kind,
  on,
  url,
  editHref,
  analyticsHref,
}: {
  id: string;
  /** "page": a bio page (on = live); otherwise a Deeplink or Two-Steps link (on = active). */
  kind: "page" | "link";
  on: boolean;
  url: string;
  editHref: string;
  analyticsHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const what = kind === "page" ? "page" : "link";
  return (
    <div className="flex items-center justify-end gap-1">
      <Switch
        checked={on}
        disabled={pending}
        aria-label={on ? `Turn this ${what} off` : `Turn this ${what} on`}
        title={on ? `Turn this ${what} off` : `Turn this ${what} on`}
        onCheckedChange={(v) =>
          start(async () => {
            const res = kind === "page" ? await setPagePublishedAction(id, v) : await toggleSmartLinkAction(id, v);
            if (!res.ok) toast.error(res.error);
            else toast.success(v ? `${kind === "page" ? "Page is live" : "Link is on"}` : `${kind === "page" ? "Page is offline" : "Link is off"}`);
            router.refresh();
          })
        }
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Copy link"
        title="Copy link"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        }}
      >
        <Copy />
      </Button>
      <a href={url} target="_blank" rel="noreferrer" aria-label="Open link" title="Open link" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
        <ExternalLink />
      </a>
      <Link href={analyticsHref} aria-label="Analytics" title="Analytics" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
        <BarChart3 />
      </Link>
      <Link href={editHref} aria-label="Edit" title="Edit" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
        <Pencil />
      </Link>
    </div>
  );
}
