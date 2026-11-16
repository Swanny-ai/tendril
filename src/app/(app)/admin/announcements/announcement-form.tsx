"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendAnnouncementAction } from "../actions";

const EMPTY = { title: "", body: "", linkLabel: "", linkUrl: "" };

/** Write an announcement, see how the popup will look, and send it to everyone. */
export function AnnouncementForm({ users }: { users: number }) {
  const [v, setV] = useState(EMPTY);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  const send = () => {
    if (!window.confirm(`Send "${v.title}" to all ${users} users? It pops up on their dashboard.`)) return;
    const form = new FormData();
    for (const [k, val] of Object.entries(v)) form.set(k, val);
    start(async () => {
      const res = await sendAnnouncementAction(form);
      if (res.error) toast.error(res.error);
      else {
        toast.success(res.ok ?? "Sent.");
        setV(EMPTY);
        router.refresh();
      }
    });
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Megaphone className="size-4 text-primary" aria-hidden /> New announcement
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="a-title">Title</Label>
        <Input id="a-title" maxLength={80} placeholder="e.g. New: Two-Steps with an 18+ warning" value={v.title} onChange={set("title")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="a-body">Message</Label>
        <Textarea id="a-body" rows={4} maxLength={600} placeholder="What's new, in a few lines." value={v.body} onChange={set("body")} />
        <p className="text-right text-xs text-muted-foreground tabular-nums">{v.body.length}/600</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="a-label">Button text (optional)</Label>
          <Input id="a-label" maxLength={30} placeholder="Try it" value={v.linkLabel} onChange={set("linkLabel")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-url">Button link (optional)</Label>
          <Input id="a-url" maxLength={500} placeholder="/dashboard/links or https://…" value={v.linkUrl} onChange={set("linkUrl")} />
        </div>
      </div>

      {/* How it looks on the creator's dashboard. */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <div className="grid place-items-center rounded-xl bg-black/40 p-5">
          <AnnouncementCard title={v.title || "Your title"} body={v.body || "Your message shows here."} linkLabel={v.linkUrl ? v.linkLabel || "Learn more" : null} />
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={send} disabled={pending || !v.title.trim() || !v.body.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />} Send to all users
      </Button>
    </section>
  );
}

/** The popup's look (shared with the preview). */
function AnnouncementCard({ title, body, linkLabel }: { title: string; body: string; linkLabel: string | null }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-2xl">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
        <Megaphone className="size-6" aria-hidden />
      </span>
      <p className="mt-3 text-[11px] font-semibold tracking-wider text-primary uppercase">Announcement</p>
      <p className="mt-1 text-lg font-semibold break-words">{title}</p>
      <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{body}</p>
      <div className="mt-5 grid gap-2">
        {linkLabel ? <span className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{linkLabel}</span> : null}
        <span className="py-1.5 text-sm text-muted-foreground">Got it</span>
      </div>
    </div>
  );
}
