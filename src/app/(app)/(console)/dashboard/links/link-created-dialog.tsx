"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { siFacebook, siTelegram, siWhatsapp, siX } from "simple-icons";
import { ArrowUpRight, Check, Copy, Download, HeartPulse, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const QR_COLORS = { dark: "#1c1a24", light: "#ffffff" };

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

function BrandIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
      <path d={path} />
    </svg>
  );
}

export type CreatedLink = {
  url: string;
  destination: string;
  twoSteps: boolean;
  adultWarning: boolean;
  openInBrowser: boolean;
  enabled: boolean;
};

/** Shown right after a link is created: its address, copy, QR code, sharing and a summary. */
export function LinkCreatedDialog({ link, onClose }: { link: CreatedLink; onClose: () => void }) {
  const { url } = link;
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const display = bare(url);
  const filename = `qr-${display.replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "")}`;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const encoded = encodeURIComponent(url);

  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(url, { margin: 1, width: 400, errorCorrectionLevel: "M", color: QR_COLORS }).then((data) => {
      if (live) setQr(data);
    });
    return () => {
      live = false;
    };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  const shareTargets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encoded}`, icon: <BrandIcon path={siWhatsapp.path} /> },
    { label: "Telegram", href: `https://t.me/share/url?url=${encoded}`, icon: <BrandIcon path={siTelegram.path} /> },
    { label: "X", href: `https://x.com/intent/post?url=${encoded}`, icon: <BrandIcon path={siX.path} /> },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`, icon: <BrandIcon path={siFacebook.path} /> },
    { label: "Email", href: `mailto:?body=${encoded}`, icon: <Mail className="size-4" aria-hidden /> },
  ];

  const details: [string, string][] = [
    ["Type", link.twoSteps ? "Two-Steps" : "Deeplink"],
    ["Status", link.enabled ? "Active" : "Paused"],
    ["Goes to", bare(link.destination)],
    ...(link.twoSteps ? [] : ([["18+ age check", link.adultWarning ? "On" : "Off"]] as [string, string][])),
    ["Open in phone browser", link.openInBrowser ? "On" : "Off"],
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto p-5 sm:max-w-md">
        <div className="flex items-center gap-3 pr-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Check className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-lg font-semibold">Your link is ready</DialogTitle>
            <DialogDescription>{link.enabled ? "It's live. Copy it or share it anywhere." : "It's saved but paused. Turn it on to share it."}</DialogDescription>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-1.5 pl-3">
          <a href={url} target="_blank" rel="noreferrer" title={url} className="min-w-0 flex-1 truncate font-medium hover:underline">
            {display}
          </a>
          <Button size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${display}`} className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
            <ArrowUpRight />
          </a>
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4">
          <div className="rounded-lg border bg-white p-1.5">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`QR code for ${display}`} width={100} height={100} className="h-auto w-full" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded bg-muted" />
            )}
          </div>
          <div className="space-y-2">
            <p className="font-medium">QR code</p>
            <p className="text-xs text-muted-foreground">Scan it to open your link, or download it for print.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => download(await QRCode.toDataURL(url, { margin: 2, width: 1024, errorCorrectionLevel: "M", color: QR_COLORS }), `${filename}.png`)}
              >
                <Download /> PNG
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: QR_COLORS });
                  const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
                  download(href, `${filename}.svg`);
                  setTimeout(() => URL.revokeObjectURL(href), 1000);
                }}
              >
                <Download /> SVG
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-medium">Share</p>
          <div className="flex flex-wrap gap-2">
            {canNativeShare ? (
              <Button size="sm" variant="outline" onClick={() => navigator.share({ url }).catch(() => undefined)}>
                <Share2 /> Share
              </Button>
            ) : null}
            {shareTargets.map((t) => (
              <a key={t.label} href={t.href} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t.icon} {t.label}
              </a>
            ))}
          </div>
        </div>

        <dl className="space-y-1.5 rounded-lg border p-3 text-xs">
          {details.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="truncate font-medium" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard/link-health" onClick={onClose} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <HeartPulse /> Check link health
          </Link>
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
