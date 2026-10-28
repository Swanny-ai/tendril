import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
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
  const [user, messages] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    getThread(userId),
  ]);
  if (!user) notFound();
  const who = user.name || user.email || "Creator";

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
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.fromAdmin ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap ${
                    m.fromAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.body}
                </div>
                <p className={`mt-1 text-[11px] text-muted-foreground ${m.fromAdmin ? "text-right" : "text-left"}`}>
                  {m.fromAdmin ? "You" : who} · {ago(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <ReplyForm userId={userId} />
    </div>
  );
}
