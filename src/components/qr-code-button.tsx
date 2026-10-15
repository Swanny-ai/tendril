"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COLORS = { dark: "#1c1a24", light: "#ffffff" };

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

/**
 * QR code for any link: preview in a popover, download as a print-ready PNG (1024 px) or a
 * scalable SVG, and copy the link. The code is generated in the browser, nothing is uploaded.
 */
export function QrCodeButton({ url, filename, label }: { url: string; filename: string; label?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const display = url.replace(/^https?:\/\//, "");

  return (
    <Popover
      onOpenChange={async (open) => {
        if (open && !preview) setPreview(await QRCode.toDataURL(url, { margin: 1, width: 400, errorCorrectionLevel: "M", color: COLORS }));
      }}
    >
      <PopoverTrigger
        render={
          label ? (
            <Button variant="outline" size="sm" aria-label={`QR code for ${display}`} />
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label={`QR code for ${display}`} />
          )
        }
      >
        <QrCode />
        {label ?? null}
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3 p-3">
        <div className="rounded-lg border bg-white p-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`QR code for ${display}`} width={224} height={224} className="h-auto w-full" />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded bg-muted" />
          )}
        </div>
        <p className="truncate text-center text-xs text-muted-foreground" title={url}>
          {display}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => download(await QRCode.toDataURL(url, { margin: 2, width: 1024, errorCorrectionLevel: "M", color: COLORS }), `${filename}.png`)}
          >
            <Download /> PNG
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: COLORS });
              const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
              download(href, `${filename}.svg`);
              setTimeout(() => URL.revokeObjectURL(href), 1000);
            }}
          >
            <Download /> SVG
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied");
          }}
        >
          <Copy /> Copy link
        </Button>
      </PopoverContent>
    </Popover>
  );
}
