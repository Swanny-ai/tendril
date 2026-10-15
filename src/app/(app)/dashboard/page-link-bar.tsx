"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function PageLinkBar({ url }: { url: string }) {
  const [qr, setQr] = useState<string | null>(null);
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
      <Popover
        onOpenChange={async (open) => {
          if (open && !qr) setQr(await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#1c1a24", light: "#ffffff" } }));
        }}
      >
        <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Show QR code" />}>
          <QrCode />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR code for ${display}`} width={200} height={200} />
          ) : (
            <div className="size-[200px] animate-pulse rounded bg-muted" />
          )}
          {qr ? (
            <a href={qr} download="tendril-qr.png" className="mt-2 block text-center text-sm text-primary hover:underline">
              Download PNG
            </a>
          ) : null}
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon-sm" aria-label="Open page" nativeButton={false} render={<a href={url} target="_blank" rel="noreferrer" />}>
        <ExternalLink />
      </Button>
    </div>
  );
}
