import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getThread } from "@/lib/support";
import { ago } from "../../ui";
import { MarkRead, ReplyForm } from "../reply-form";

export const instant = false;
export const metadata: Metadata = { title: "Conversation" };

export default async function AdminSupportThread({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;
  const [user, messages, thread] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    getThread(userId),
    db.supportThread.findUnique({ where: { userId }, select: { userSeenAt: true } }),
  ]);
  if (!user) notFound();
  const who = user.name || user.email || "Creator";
  const lastAgent = [...messages].reverse().find((m) => m.role === "agent");
  const userSeenAt = thread?.userSeenAt ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <MarkRead userId={userId} />
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/support" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All conversations
        </Link>
        <div className="ml-auto">
          <Link href={`/admin/users/${user.id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            View account <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{who}</h1>
        {user.email ? <p className="text-sm text-muted-foreground">{user.email}</p> : null}
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const mine = m.role === "agent";
            const label = m.role === "agent" ? "You" : m.role === "ai" ? "Assistant" : who;
            const seen = mine && m.id === lastAgent?.id && !!userSeenAt && userSeenAt >= m.createdAt;
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
                    {label} · {ago(m.createdAt)}
                    {seen ? " · Seen" : null}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ReplyForm userId={userId} />
    </div>
  );
}
