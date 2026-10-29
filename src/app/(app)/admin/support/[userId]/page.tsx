import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getAdminThreadView } from "@/lib/support";
import { LiveThread } from "../live-thread";
import { MarkRead } from "../reply-form";

export const instant = false;
export const metadata: Metadata = { title: "Conversation" };

export default async function AdminSupportThread({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;
  const [user, view] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    getAdminThreadView(userId),
  ]);
  if (!user) notFound();
  const who = user.name || user.email || "Creator";
  const initial = {
    messages: view.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    userTyping: view.userTyping,
    userSeenAt: view.userSeenAt?.toISOString() ?? null,
  };

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

      <LiveThread userId={userId} who={who} initial={initial} />
    </div>
  );
}
