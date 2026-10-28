"use client";

import { useEffect, useRef, useState } from "react";
import { Headset, Loader2, Send, X } from "lucide-react";

type Message = { id: string; body: string; fromAdmin: boolean; createdAt: string };

// A floating "Need help?" button (bottom-right of every dashboard page). Signed-in creators
// write to the site owner and read replies here; the owner answers from /admin/support.
export function SupportWidget({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Load the conversation the first time the panel is opened (this also marks replies as seen).
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/support");
        if (!r.ok) throw new Error();
        const d = (await r.json()) as { messages: Message[] };
        if (cancelled) return;
        setMessages(d.messages);
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
  }, [open, loaded]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const d = (await r.json().catch(() => ({}))) as { messages?: Message[]; error?: string };
      if (!r.ok) {
        setError(d.error ?? "Couldn't send your message. Please try again.");
        return;
      }
      if (d.messages) setMessages(d.messages);
      setText("");
    } catch {
      setError("Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* The launcher button. */}
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
        <div className="fixed right-4 bottom-20 z-[60] flex h-[32rem] max-h-[calc(100svh-7rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl md:right-6 md:bottom-24">
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <span className="grid size-9 place-items-center rounded-full bg-white/20">
              <Headset className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Support</p>
              <p className="text-xs text-primary-foreground/80">We usually reply within a day.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto rounded-md p-1 hover:bg-white/15">
              <X className="size-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="grid h-full place-items-center text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
                <p>Hi! 👋 Need a hand or want to talk to a real person? Send us a message and we&apos;ll get back to you here.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.fromAdmin ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      m.fromAdmin ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {m.fromAdmin ? <p className="mb-0.5 text-xs font-semibold opacity-70">Support</p> : null}
                    {m.body}
                  </div>
                </div>
              ))
            )}
          </div>

          {error ? <p className="px-4 pb-1 text-xs text-[var(--persimmon-text)]">{error}</p> : null}

          <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e);
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
