import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { deleteAnnouncementAction, setAnnouncementActiveAction } from "../actions";
import { ActionButton } from "../action-button";
import { Header, Pill, ago, fmt } from "../ui";
import { AnnouncementForm } from "./announcement-form";

export const instant = false;
export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncements() {
  await requireAdmin();
  const [list, users] = await Promise.all([db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 }), db.user.count()]);
  // People who closed the popup of the newest one (or a newer one).
  const newest = list.find((a) => a.active);
  const seen = newest ? await db.user.count({ where: { announcementSeenAt: { gte: newest.createdAt } } }) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Header
        title="Announcements"
        intro={`Send a message to all ${fmt(users)} users. It pops up once on their dashboard and stays in the Home tab of their help messenger.`}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <AnnouncementForm users={users} />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Sent</h2>
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              <Megaphone className="size-6" aria-hidden />
              Nothing sent yet.
            </div>
          ) : (
            list.map((a) => (
              <article key={a.id} className="space-y-2 rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-semibold break-words">{a.title}</p>
                  {a.active ? <Pill tone="good">Live</Pill> : <Pill>Off</Pill>}
                </div>
                <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">{a.body}</p>
                {a.linkUrl ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Button: <span className="text-foreground">{a.linkLabel}</span> → {a.linkUrl}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Sent {ago(a.createdAt)}
                  {a.id === newest?.id ? ` · seen by ${fmt(seen)} of ${fmt(users)}` : ""}
                </p>
                <div className="flex gap-2">
                  <ActionButton action={setAnnouncementActiveAction} fields={{ id: a.id, active: a.active ? "0" : "1" }}>
                    {a.active ? "Turn off" : "Turn on"}
                  </ActionButton>
                  <ActionButton action={deleteAnnouncementAction} fields={{ id: a.id }} variant="ghost" confirm="Delete this announcement for everyone?">
                    Delete
                  </ActionButton>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
