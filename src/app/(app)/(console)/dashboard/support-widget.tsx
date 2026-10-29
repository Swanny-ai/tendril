"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Headset,
  House,
  LifeBuoy,
  Loader2,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { BOT_TOPICS } from "@/lib/support-bot";

// The help messenger: a launcher in the bottom-right of every dashboard page that opens a panel
// with Home, Messages (the creator's tickets, open and resolved) and Help (instant answers).
// A scripted assistant answers first and hands off to a real person, who replies from /admin.
// Live by polling: a ticket every 3s, the lists every 5s, the launcher badge every 15s.

type Role = "user" | "ai" | "agent" | "event";
type Status = "open" | "resolved";
type Message = { id: string; body: string; role: Role; createdAt: string };
type Ticket = { id: string; subject: string; status: Status; mode: "ai" | "agent"; resolvedBy: "user" | "agent" | null; createdAt: string };
type TicketView = { ticket: Ticket; messages: Message[]; agentSeenAt: string | null; agentTyping: boolean };
type Summary = { id: string; subject: string; status: Status; mode: "ai" | "agent"; lastBody: string; lastRole: Role; lastMessageAt: string; unread: number };

type Tab = "home" | "messages" | "help";
type Screen = { kind: "tabs" } | { kind: "ticket"; id: string | null } | { kind: "article"; topicId: string };

const TICKET_POLL_MS = 3000;
const LIST_POLL_MS = 5000;
const CLOSED_POLL_MS = 15_000;
const TYPING_PING_MS = 3000;

export function SupportWidget({ initialUnread, firstName }: { initialUnread: number; firstName: string | null }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>({ kind: "tabs" });
  const [tickets, setTickets] = useState<Summary[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [view, setView] = useState<TicketView | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const lastPingRef = useRef(0);

  const ticketId = screen.kind === "ticket" ? screen.id : null;

  const loadList = useCallback(async () => {
    const d = await getJson<{ unread: number; tickets: Summary[] }>("/api/support");
    if (d) {
      setTickets(d.tickets);
      setUnread(d.unread);
    }
  }, []);

  const loadTicket = useCallback(async (id: string) => {
    const d = await getJson<TicketView>(`/api/support/${id}`);
    if (d) setView(d);
  }, []);

  // Live updates while open (what's on screen) and the launcher badge while closed. Paused in a hidden tab.
  useEffect(() => {
    const tick = async () => {
      if (busyRef.current || document.hidden) return;
      if (!open) {
        const d = await getJson<{ unread: number }>("/api/support?peek=1");
        if (d) setUnread(d.unread);
      } else if (ticketId) await loadTicket(ticketId);
      else await loadList();
    };
    if (open) void tick();
    const id = setInterval(tick, !open ? CLOSED_POLL_MS : ticketId ? TICKET_POLL_MS : LIST_POLL_MS);
    return () => clearInterval(id);
  }, [open, ticketId, loadList, loadTicket]);

  // Keep the newest message in view.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [view?.messages.length, view?.agentTyping, botTyping, screen]);

  const openTicket = (id: string | null) => {
    setError(null);
    setView(null);
    setText("");
    setScreen({ kind: "ticket", id });
  };
  const back = () => {
    setScreen({ kind: "tabs" });
    setView(null);
    setError(null);
    void loadList();
  };

  /** Sends to the open ticket (or starts one); the assistant's dots show while it "types". */
  async function act(payload: { body: string } | { action: "escalate" | "resolve" | "reopen" }) {
    if (busyRef.current) return;
    busyRef.current = true;
    setSending(true);
    setError(null);
    const isMessage = "body" in payload;
    // The assistant answers new tickets and open ones it's still handling.
    const assistantAnswers = isMessage && (!view || (view.ticket.mode === "ai" && view.ticket.status === "open"));
    if (isMessage) setView(view ? { ...view, messages: [...view.messages, pendingMessage(payload.body)] } : draftView(payload.body));
    if (assistantAnswers) setBotTyping(true);
    try {
      const url = ticketId ? `/api/support/${ticketId}` : "/api/support";
      const [res] = await Promise.all([postJson<TicketView>(url, payload), wait(assistantAnswers ? 900 : 0)]);
      if ("error" in res) setError(res.error);
      else {
        setView(res);
        if (!ticketId) setScreen({ kind: "ticket", id: res.ticket.id });
      }
    } finally {
      setBotTyping(false);
      setSending(false);
      busyRef.current = false;
    }
  }

  async function send(e?: React.FormEvent, preset?: string) {
    e?.preventDefault();
    const body = (preset ?? text).trim();
    if (!body || sending) return;
    if (!preset) setText("");
    await act({ body });
  }

  function pingTyping() {
    if (!ticketId || view?.ticket.mode !== "agent" || !due(lastPingRef, TYPING_PING_MS)) return;
    void fetch(`/api/support/${ticketId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "typing" }) }).catch(() => {});
  }

  const recent = (tickets ?? []).find((t) => t.status === "open") ?? null;
  const q = query.trim().toLowerCase();
  const topics = BOT_TOPICS.filter((t) => !q || `${t.label} ${t.answer} ${t.keywords.join(" ")}`.toLowerCase().includes(q));
  const showTopics = !view || (view.ticket.status === "open" && view.ticket.mode === "ai" && !botTyping && view.messages.at(-1)?.role === "ai");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close help" : "Need help?"}
        className="fixed right-4 bottom-4 z-[60] grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:right-6 md:bottom-6"
      >
        {open ? <ChevronDown className="size-7" /> : <MessageCircle className="size-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[var(--persimmon)] px-1 text-xs font-semibold text-white ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed right-4 bottom-20 z-[60] flex h-[40rem] max-h-[calc(100svh-6.5rem)] w-[calc(100vw-2rem)] max-w-[24rem] flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl md:right-6 md:bottom-24">
          {screen.kind === "tabs" ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === "home" ? (
                  <HomeTab
                    firstName={firstName}
                    recent={recent}
                    onNew={() => openTicket(null)}
                    onOpenTicket={openTicket}
                    onArticle={(topicId) => setScreen({ kind: "article", topicId })}
                    onAllHelp={() => setTab("help")}
                  />
                ) : tab === "messages" ? (
                  <MessagesTab tickets={tickets} onOpen={openTicket} onNew={() => openTicket(null)} />
                ) : (
                  <div className="p-4">
                    <h2 className="mb-3 text-center text-base font-semibold">Help</h2>
                    <label className="relative mb-3 block">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for help"
                        aria-label="Search for help"
                        className="h-10 w-full rounded-xl border bg-muted/50 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                    <TopicList topics={topics} onPick={(topicId) => setScreen({ kind: "article", topicId })} />
                    {!topics.length ? <p className="py-6 text-center text-sm text-muted-foreground">No answers match. Send us a message instead.</p> : null}
                  </div>
                )}
              </div>
              <nav className="grid grid-cols-3 border-t bg-card" aria-label="Help sections">
                <TabButton icon={House} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
                <TabButton icon={MessageCircle} label="Messages" active={tab === "messages"} onClick={() => setTab("messages")} badge={unread} />
                <TabButton icon={LifeBuoy} label="Help" active={tab === "help"} onClick={() => setTab("help")} />
              </nav>
            </>
          ) : screen.kind === "article" ? (
            <ArticleScreen topicId={screen.topicId} onBack={back} onMessage={() => openTicket(null)} />
          ) : (
            <>
              <TicketHeader view={view} onBack={back} busy={sending} onResolve={() => act({ action: "resolve" })} onReopen={() => act({ action: "reopen" })} />
              <div ref={listRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
                {ticketId && !view ? (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                ) : !view ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                    <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                      <Sparkles className="size-6" />
                    </span>
                    <p className="text-sm text-muted-foreground">Ask a question or pick a topic. Our assistant answers right away, and a real person can take over anytime.</p>
                  </div>
                ) : (
                  <Thread view={view} botTyping={botTyping} />
                )}
              </div>

              {error ? <p className="px-4 pb-1 text-xs text-[var(--persimmon-text)]">{error}</p> : null}

              {showTopics ? (
                <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                  {BOT_TOPICS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={sending}
                      onClick={() => void send(undefined, t.label)}
                      className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {view?.ticket.id && view.ticket.status === "open" && view.ticket.mode === "ai" ? (
                <button
                  type="button"
                  onClick={() => act({ action: "escalate" })}
                  disabled={sending}
                  className="mx-4 mb-2 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <Headset className="size-3.5" /> Talk to a real person
                </button>
              ) : null}

              {view?.ticket.status === "resolved" ? (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 text-muted-foreground">Resolved. Reply below to reopen it.</span>
                  <button type="button" onClick={() => openTicket(null)} className="font-semibold text-primary hover:underline">
                    New conversation
                  </button>
                </div>
              ) : null}

              <form onSubmit={send} className="flex items-end gap-2 border-t bg-card p-3">
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    pingTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Write a message…"
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  aria-label="Send"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

// ---------- Tabs ----------

function HomeTab({
  firstName,
  recent,
  onNew,
  onOpenTicket,
  onArticle,
  onAllHelp,
}: {
  firstName: string | null;
  recent: Summary | null;
  onNew: () => void;
  onOpenTicket: (id: string) => void;
  onArticle: (topicId: string) => void;
  onAllHelp: () => void;
}) {
  return (
    <div className="pb-4">
      <div className="bg-gradient-to-br from-primary via-primary/80 to-primary/40 px-5 pt-6 pb-16 text-primary-foreground">
        <div className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <span className="text-sm font-semibold opacity-90">ViewLink Support</span>
        </div>
        <p className="mt-6 text-2xl font-semibold opacity-80">Hi{firstName ? ` ${firstName}` : ""} 👋</p>
        <p className="text-2xl font-bold">How can we help?</p>
      </div>
      <div className="-mt-10 space-y-3 px-4">
        {recent ? (
          <button type="button" onClick={() => onOpenTicket(recent.id)} className="block w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/50">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Recent message</p>
            <div className="flex items-center gap-3">
              <Avatar role={recent.lastRole} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{recent.lastBody || recent.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {recent.mode === "agent" ? "Support" : "Assistant"} · {ago(recent.lastMessageAt)}
                </p>
              </div>
              {recent.unread ? <span className="size-2.5 rounded-full bg-[var(--persimmon)]" aria-label="New reply" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </div>
          </button>
        ) : null}
        <button type="button" onClick={onNew} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/50">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Send us a message</p>
            <p className="text-xs text-muted-foreground">Instant answers from our assistant · a real person when you need one</p>
          </div>
          <Send className="size-5 text-primary" />
        </button>
        <div className="rounded-2xl border bg-card p-2 shadow-sm">
          <button type="button" onClick={onAllHelp} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-muted">
            <Search className="size-4 text-muted-foreground" /> <span className="flex-1">Search for help</span>
          </button>
          <TopicList topics={BOT_TOPICS.slice(0, 4)} onPick={onArticle} />
        </div>
      </div>
    </div>
  );
}

function MessagesTab({ tickets, onOpen, onNew }: { tickets: Summary[] | null; onOpen: (id: string) => void; onNew: () => void }) {
  return (
    <div className="flex min-h-full flex-col">
      <h2 className="border-b py-3 text-center text-base font-semibold">Messages</h2>
      {tickets === null ? (
        <div className="grid flex-1 place-items-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : !tickets.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <MessageCircle className="size-8 text-muted-foreground" />
          <p className="font-semibold">No messages</p>
          <p className="text-sm text-muted-foreground">Your conversations with us will show up here.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y">
          {tickets.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60">
                <Avatar role={t.lastRole} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`min-w-0 flex-1 truncate text-sm ${t.unread ? "font-semibold" : "font-medium"}`}>{t.subject || "Conversation"}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{ago(t.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {t.lastRole === "user" ? "You: " : ""}
                      {t.lastBody}
                    </p>
                    {t.status === "resolved" ? (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Resolved</span>
                    ) : t.unread ? (
                      <span className="size-2 shrink-0 rounded-full bg-[var(--persimmon)]" aria-label="New reply" />
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="sticky bottom-0 flex justify-center bg-gradient-to-t from-background via-background to-transparent p-4">
        <button type="button" onClick={onNew} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-110">
          Send us a message <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

function TopicList({ topics, onPick }: { topics: typeof BOT_TOPICS; onPick: (id: string) => void }) {
  return (
    <ul>
      {topics.map((t) => (
        <li key={t.id}>
          <button type="button" onClick={() => onPick(t.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-sm hover:bg-muted">
            <span className="flex-1">{t.label}</span>
            <ChevronRight className="size-4 text-primary" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function TabButton({ icon: Icon, label, active, onClick, badge = 0 }: { icon: typeof House; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      {label}
      {badge > 0 ? (
        <span className="absolute top-1.5 left-1/2 ml-2 grid min-w-4 place-items-center rounded-full bg-[var(--persimmon)] px-1 text-[10px] font-semibold text-white">{badge > 9 ? "9+" : badge}</span>
      ) : null}
    </button>
  );
}

// ---------- Screens ----------

function ArticleScreen({ topicId, onBack, onMessage }: { topicId: string; onBack: () => void; onMessage: () => void }) {
  const topic = BOT_TOPICS.find((t) => t.id === topicId);
  return (
    <>
      <div className="flex items-center gap-2 border-b px-3 py-3">
        <button type="button" onClick={onBack} aria-label="Back" className="rounded-lg p-1.5 hover:bg-muted">
          <ArrowLeft className="size-5" />
        </button>
        <p className="text-sm font-semibold">Help</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <h2 className="text-xl font-bold">{topic?.label}</h2>
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{topic?.answer}</p>
      </div>
      <div className="border-t bg-card p-4 text-center">
        <p className="mb-2 text-sm font-medium">Still need help?</p>
        <button type="button" onClick={onMessage} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
          Send us a message <Send className="size-4" />
        </button>
      </div>
    </>
  );
}

function TicketHeader({ view, onBack, busy, onResolve, onReopen }: { view: TicketView | null; onBack: () => void; busy: boolean; onResolve: () => void; onReopen: () => void }) {
  const t = view?.ticket.id ? view.ticket : null;
  const subtitle = !t ? "Our assistant replies instantly" : t.status === "resolved" ? "Resolved" : t.mode === "agent" ? "A real person is on it" : "Assistant · replies instantly";
  return (
    <div className="flex items-center gap-2 border-b bg-card px-3 py-2.5">
      <button type="button" onClick={onBack} aria-label="Back" className="rounded-lg p-1.5 hover:bg-muted">
        <ArrowLeft className="size-5" />
      </button>
      <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
        {t?.mode === "agent" ? <Headset className="size-5" /> : <LogoMark className="size-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{t?.subject || "ViewLink Support"}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {t ? (
        <button
          type="button"
          disabled={busy}
          onClick={t.status === "open" ? onResolve : onReopen}
          title={t.status === "open" ? "Mark as resolved" : "Reopen"}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {t.status === "open" ? <CheckCircle2 className="size-4" /> : <RotateCcw className="size-4" />}
          {t.status === "open" ? "Resolve" : "Reopen"}
        </button>
      ) : null}
    </div>
  );
}

function Thread({ view, botTyping }: { view: TicketView; botTyping: boolean }) {
  const { messages, agentSeenAt, agentTyping } = view;
  const lastUserAt = [...messages].reverse().find((m) => m.role === "user")?.createdAt ?? null;
  const repliedAfter = !!lastUserAt && messages.some((m) => (m.role === "ai" || m.role === "agent") && m.createdAt > lastUserAt);
  const seen = repliedAfter || (!!lastUserAt && !!agentSeenAt && agentSeenAt >= lastUserAt);
  const lastIsUser = messages.at(-1)?.role === "user";
  const typing = botTyping || agentTyping;
  return (
    <>
      {messages.map((m) =>
        m.role === "event" ? (
          <p key={m.id} className="py-2 text-center text-[11px] text-muted-foreground">
            {m.body} · {ago(m.createdAt)}
          </p>
        ) : (
          <div key={m.id} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role !== "user" ? <Avatar role={m.role} small /> : null}
            <div
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground"
              }`}
            >
              {m.body}
            </div>
          </div>
        ),
      )}
      {typing ? (
        <div className="flex items-end gap-2">
          <Avatar role={botTyping ? "ai" : "agent"} small />
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-3 py-2.5" aria-label={botTyping ? "Assistant is typing" : "Support is typing"}>
            <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
          </div>
        </div>
      ) : null}
      {!typing && lastIsUser ? <p className="pt-0.5 pr-1 text-right text-[11px] text-muted-foreground">{seen ? "Seen" : "Delivered"}</p> : null}
    </>
  );
}

function Avatar({ role, small = false }: { role: Role; small?: boolean }) {
  const size = small ? "size-6" : "size-9";
  if (role === "agent")
    return (
      <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-primary text-primary-foreground`}>
        <Headset className={small ? "size-3.5" : "size-5"} />
      </span>
    );
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-muted`}>
      <LogoMark className={small ? "size-4" : "size-6"} />
    </span>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return <span className="inline-block size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: delay }} />;
}

// ---------- Helpers ----------

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

async function postJson<T>(url: string, payload: unknown): Promise<T | { error: string }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const d = (await r.json().catch(() => ({}))) as T & { error?: string };
    return r.ok ? d : { error: d.error ?? "Something went wrong. Please try again." };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** True (and restarts the clock) when at least `ms` passed since the last time it returned true. */
function due(ref: { current: number }, ms: number): boolean {
  const now = Date.now();
  if (now - ref.current < ms) return false;
  ref.current = now;
  return true;
}

/** The creator's message shown before the server confirms it. */
function pendingMessage(body: string): Message {
  return { id: `tmp-${Date.now()}`, body, role: "user", createdAt: new Date().toISOString() };
}

/** A not-yet-created ticket holding the first message while it's being sent. */
function draftView(body: string): TicketView {
  const now = new Date().toISOString();
  return {
    ticket: { id: "", subject: body.slice(0, 80), status: "open", mode: "ai", resolvedBy: null, createdAt: now },
    messages: [pendingMessage(body)],
    agentSeenAt: null,
    agentTyping: false,
  };
}

/** "now", "5m", "3h", "2d", or a date. */
function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
