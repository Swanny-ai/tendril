"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AnnouncementView } from "@/lib/announcements";
import { markAnnouncementSeenAction } from "./announcement-actions";

/** The newest announcement the user hasn't seen, once, over the dashboard. Closing it marks it seen. */
export function AnnouncementPopup({ announcement: a }: { announcement: AnnouncementView | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!a) return;
    const t = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(t);
  }, [a]);

  if (!a || !show) return null;
  const close = () => {
    setShow(false);
    void markAnnouncementSeenAction().catch(() => {});
  };
  const external = !!a.linkUrl && !a.linkUrl.startsWith("/");
  return (
    <div className="fixed inset-0 z-[59] grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
      <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-2xl">
        <button type="button" onClick={close} className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
          <Megaphone className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-[11px] font-semibold tracking-wider text-primary uppercase">Announcement</p>
        <h2 id="announcement-title" className="mt-1 text-lg font-semibold break-words">
          {a.title}
        </h2>
        <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{a.body}</p>
        <div className="mt-5 grid gap-2">
          {a.linkUrl ? (
            <a
              href={a.linkUrl}
              onClick={close}
              className={buttonVariants({ size: "lg" })}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {a.linkLabel || "Learn more"}
            </a>
          ) : null}
          <Button variant="ghost" onClick={close}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
