import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getAdminTicketView } from "@/lib/support";
import { ActionButton } from "../../action-button";
import { setSupportStatusAction } from "../../actions";
import { Pill, ago } from "../../ui";
import { LiveThread } from "../live-thread";
import { MarkRead } from "../reply-form";

export const instant = false;
export const metadata: Metadata = { title: "Ticket" };

export default async function AdminSupportTicket({ params }: { params: Promise<{ ticketId: string }> }) {
  await requireAdmin();
  const { ticketId } = await params;
  const view = await getAdminTicketView(ticketId);
  if (!view) notFound();
  const { ticket } = view;
  const [user, others] = await Promise.all([
    db.user.findUnique({ where: { id: ticket.userId }, select: { id: true, name: true, email: true } }),
    db.supportTicket.count({ where: { userId: ticket.userId, id: { not: ticketId } } }),
  ]);
  const who = user?.name || user?.email || "Creator";
  const initial = {
    status: ticket.status,
    messages: view.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    userTyping: view.userTyping,
    userSeenAt: view.userSeenAt?.toISOString() ?? null,
  };
  const resolved = ticket.status === "resolved";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <MarkRead ticketId={ticketId} />
      <div className="flex flex-wrap items-center gap-3">
        <Link href={resolved ? "/admin/support?status=resolved" : "/admin/support"} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All tickets
        </Link>
        {user ? (
          <Link href={`/admin/users/${user.id}`} className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            View account <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{who}</h1>
            {resolved ? <Pill tone="good">Resolved</Pill> : ticket.mode === "agent" ? <Pill tone="warn">Needs you</Pill> : <Pill tone="info">Assistant</Pill>}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {user?.email} · opened {ago(ticket.createdAt)}
            {others ? ` · ${others} other ticket${others === 1 ? "" : "s"}` : ""}
          </p>
          {ticket.subject ? <p className="mt-1 text-sm">“{ticket.subject}”</p> : null}
        </div>
        <ActionButton action={setSupportStatusAction} fields={{ ticketId, status: resolved ? "open" : "resolved" }} variant={resolved ? "outline" : "default"}>
          {resolved ? <RotateCcw /> : <CheckCircle2 />} {resolved ? "Reopen" : "Mark as resolved"}
        </ActionButton>
      </div>

      <LiveThread key={ticket.status} ticketId={ticketId} who={who} initial={initial} />
    </div>
  );
}
