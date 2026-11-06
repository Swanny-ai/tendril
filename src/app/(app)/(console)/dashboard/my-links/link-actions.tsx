"use client";

import Link from "next/link";
import { BarChart3, Copy, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";

/** Copy, open, edit and analytics buttons for one row of My links. */
export function MyLinkActions({ url, editHref, analyticsHref }: { url: string; editHref: string; analyticsHref: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
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
