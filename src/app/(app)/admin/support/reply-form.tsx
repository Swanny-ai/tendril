"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { markSupportReadAction, replySupportAction } from "../actions";

/** Marks the creator's messages as read as soon as the owner opens the thread (clears the badge). */
export function MarkRead({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const form = new FormData();
    form.set("userId", userId);
    void markSupportReadAction(form).then(() => router.refresh());
  }, [userId, router]);
  return null;
}

/** The owner's reply box under a conversation. */
export function ReplyForm({ userId }: { userId: string }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const body = text.trim();
    if (!body || pending) return;
    const form = new FormData();
    form.set("userId", userId);
    form.set("body", body);
    start(async () => {
      const res = await replySupportAction(form);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.ok ?? "Reply sent.");
      setText("");
      router.refresh();
      ref.current?.focus();
    });
  };

  return (
    <div className="flex items-end gap-2 rounded-xl border bg-card p-3">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
        rows={2}
        maxLength={2000}
        placeholder="Write a reply… (Ctrl/⌘ + Enter to send)"
        className="max-h-40 min-h-16 flex-1 resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={send}
        disabled={pending || !text.trim()}
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
        aria-label="Send reply"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
      </button>
    </div>
  );
}
