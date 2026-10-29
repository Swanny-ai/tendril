"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { ReplyForm } from "./reply-form";

type Role = "user" | "ai" | "agent" | "event";
export type LiveMessage = { id: string; body: string; role: Role; createdAt: string };
export type LiveView = { status: "open" | "resolved"; messages: LiveMessage[]; userTyping: boolean; userSeenAt: string | null };
type ApiView = { ticket: { status: "open" | "resolved" }; messages: LiveMessage[]; userTyping: boolean; userSeenAt: string | null };

const POLL_MS = 3000;
const TYPING_PING_MS = 3000;

/**
 * One support ticket on the owner's side, kept live by polling: the creator's new messages, their
 * "typing…", status changes, and "Seen" on your last reply appear without a refresh.
 */
export function LiveThread({ ticketId, who, initial }: { ticketId: string; who: string; initial: LiveView }) {
  const [view, setView] = useState<LiveView>(initial);
  const listRef = useRef<HTMLDivElement>(null);
  const lastPingRef = useRef(0);
  const seenRef = useRef({ count: initial.messages.length, status: initial.status });
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/support/${ticketId}`);
      if (!r.ok) return;
      const d = (await r.json()) as ApiView;
      setView({ status: d.ticket.status, messages: d.messages, userTyping: d.userTyping, userSeenAt: d.userSeenAt });
      // New messages (now read) or a status change: update the header buttons and nav badge too.
      if (d.messages.length !== seenRef.current.count || d.ticket.status !== seenRef.current.status) {
        seenRef.current = { count: d.messages.length, status: d.ticket.status };
        router.refresh();
      }
    } catch {
      /* ignore a dropped poll */
    }
  }, [ticketId, router]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Keep the newest message in view.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [view.messages.length, view.userTyping]);

  const pingTyping = () => {
    if (!due(lastPingRef, TYPING_PING_MS)) return;
    void fetch(`/api/admin/support/${ticketId}`, { method: "POST" }).catch(() => {});
  };

  const { messages, userTyping, userSeenAt, status } = view;
  const lastAgent = [...messages].reverse().find((m) => m.role === "agent");

  return (
    <>
      <div ref={listRef} className="max-h-[60svh] space-y-3 overflow-y-auto rounded-xl border bg-card p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((m) => {
            if (m.role === "event") {
              return (
                <p key={m.id} className="text-center text-[11px] text-muted-foreground">
                  {m.body} · {timeOf(m.createdAt)}
                </p>
              );
            }
            const mine = m.role === "agent";
            const label = m.role === "agent" ? "You" : m.role === "ai" ? "Assistant" : who;
            const isLast = mine && m.id === lastAgent?.id;
            const seen = isLast && !!userSeenAt && userSeenAt >= m.createdAt;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap ${
                      m.role === "agent" ? "bg-primary text-primary-foreground" : m.role === "ai" ? "bg-sky-500/10 text-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.body}
                  </div>
                  <p className={`mt-1 flex items-center gap-1 text-[11px] text-muted-foreground ${mine ? "justify-end" : "justify-start"}`}>
                    {m.role === "ai" ? <Sparkles className="size-3" /> : null}
                    {label} · {timeOf(m.createdAt)}
                    {isLast ? (seen ? " · Seen" : " · Delivered") : null}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {userTyping ? (
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2.5" aria-label={`${who} is typing`}>
              <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </div>
            <p className="pl-1 text-[11px] text-muted-foreground">{who} is typing…</p>
          </div>
        ) : null}
      </div>

      {status === "resolved" ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" /> This ticket is resolved. Replying reopens it.
        </p>
      ) : null}

      <ReplyForm ticketId={ticketId} onTyping={pingTyping} onSent={refresh} />
    </>
  );
}

function due(ref: { current: number }, ms: number): boolean {
  const now = Date.now();
  if (now - ref.current < ms) return false;
  ref.current = now;
  return true;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: delay }} />;
}
