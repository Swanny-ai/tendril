"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCodeButton } from "@/components/qr-code-button";

export function PageLinkBar({ url }: { url: string }) {
  const display = url.replace(/^https?:\/\//, "");

  return (
    <div className="flex min-w-0 items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3 text-sm">
      <span className="truncate font-medium" title={url}>
        {display}
      </span>
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
      <QrCodeButton url={url} filename="viewlink-page-qr" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Open page"
        nativeButton={false}
        render={<a href={url} target="_blank" rel="noreferrer" />}
      >
        <ExternalLink />
      </Button>
    </div>
  );
}
