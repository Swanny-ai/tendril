"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headset, Loader2, Send, Sparkles, X } from "lucide-react";

type Role = "user" | "ai" | "agent";
type Message = { id: string; body: string; role: Role; createdAt: string };
type View = { messages: Message[]; mode: "ai" | "agent"; agentSeenAt: string | null };

// A floating "Need help?" button (bottom-right of every dashboard page). An AI assistant answers
// common questions; when it can't help — or the creator asks — it hands off to a real person, who
// replies from the admin dashboard. Shows a typing indicator and "Seen" receipts.
export function SupportWidget({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"ai" | "agent">("ai");
  const [agentSeenAt, setAgentSeenAt] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const apply = useCallback((v: View) => {
    setMessages(v.messages);
    setMode(v.mode);
    setAgentSeenAt(v.agentSeenAt);
  }, []);

  // Load the conversation the first time the panel is opened (also marks replies as seen).
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/support");
        if (!r.ok) throw new Error();
        const v = (await r.json()) as View;
        if (cancelled) return;
        apply(v);
        setUnread(0);
        setLoaded(true);
      } catch {
        if (!cancelled) setError("Couldn't load your messages. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded, apply]);

  // While a real person is handling it, quietly poll for their replies.
  useEffect(() => {
    if (!open || !loaded || mode !== "agent") return;
    const id = setInterval(async () => {
      if (busyRef.current) return;
      try {
        const r = await fetch("/api/support");
        if (r.ok) apply((await r.json()) as View);
      } catch {
        /* ignore a dropped poll */
      }
    }, 12_000);
    return () => clearInterval(id);
  }, [open, loaded, mode, apply]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typing, open, loading]);

  async function post(payload: { body: string } | { action: "escalate" }, withTyping: boolean) {
    busyRef.current = true;
    setSending(true);
    setError(null);
    if (withTyping) setTyping(true);
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = (await r.json().catch(() => ({}))) as Partial<View> & { error?: string };
      if (!r.ok || !d.messages) {
        setError(d.error ?? "Something went wrong. Please try again.");
        return false;
      }
      apply(d as View);
      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      return false;
    } finally {
      setTyping(false);
      setSending(false);
      busyRef.current = false;
    }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    // Show the creator's message right away, then let the AI "type".
    const optimistic: Message = { id: `tmp-${Date.now()}`, body, role: "user", createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setText("");
    await post({ body }, mode === "ai");
  }

  // The "Seen" / "Delivered" line under the creator's last message.
  const lastUserAt = [...messages].reverse().find((m) => m.role === "user")?.createdAt ?? null;
  const supportRepliedAfter = lastUserAt ? messages.some((m) => m.role !== "user" && m.createdAt > lastUserAt) : false;
  const seen = supportRepliedAfter || (!!lastUserAt && !!agentSeenAt && agentSeenAt >= lastUserAt);
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close help" : "Need help?"}
        className="fixed right-4 bottom-4 z-[60] grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:right-6 md:bottom-6"
      >
        {open ? <X className="size-6" /> : <Headset className="size-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[var(--persimmon)] px-1 text-xs font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed right-4 bottom-20 z-[60] flex h-[34rem] max-h-[calc(100svh-7rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl md:right-6 md:bottom-24">
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <span className="grid size-9 place-items-center rounded-full bg-white/20">
              <Headset className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Support</p>
              <p className="text-xs text-primary-foreground/80">{mode === "agent" ? "A real person is on it." : "AI assistant · replies instantly"}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto rounded-md p-1 hover:bg-white/15">
              <X className="size-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="grid h-full place-items-center text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
                <p>Hi! 👋 Ask me anything about ViewLink — plans, custom domains, your links. I&apos;ll help right away, or bring in a real person if you need one.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "ai" ? (
                      <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold opacity-70">
                        <Sparkles className="size-3" /> Assistant
                      </p>
                    ) : m.role === "agent" ? (
                      <p className="mb-0.5 text-xs font-semibold opacity-70">Support</p>
                    ) : null}
                    {m.body}
                  </div>
                </div>
              ))
            )}

            {typing ? (
              <div className="flex items-start">
                <div className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2.5" aria-label="Assistant is typing">
                  <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                </div>
              </div>
            ) : null}

            {!typing && lastIsUser ? <p className="self-end pt-0.5 pr-1 text-[11px] text-muted-foreground">{seen ? "Seen" : "Delivered"}</p> : null}
          </div>

          {error ? <p className="px-4 pb-1 text-xs text-[var(--persimmon-text)]">{error}</p> : null}

          {mode === "ai" && messages.length > 0 ? (
            <button
              type="button"
              onClick={() => post({ action: "escalate" }, false)}
              disabled={sending}
              className="mx-4 mb-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              Talk to a real person
            </button>
          ) : null}

          <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Type your message…"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: delay }} />;
}
