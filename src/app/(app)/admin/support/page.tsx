import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { supportThreads } from "@/lib/support";
import { Header, Pill, Table, ago } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Support" };

export default async function AdminSupport() {
  await requireAdmin();
  const threads = await supportThreads();
  const waiting = threads.filter((t) => t.unread > 0).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Header
        title="Support"
        intro="Chats from the help button on creators' dashboards. The AI assistant answers common questions first and hands off to you when it can't — those show as waiting on you."
      />
      {waiting > 0 ? (
        <p className="text-sm font-medium text-[var(--persimmon)]">
          {waiting} conversation{waiting === 1 ? "" : "s"} waiting on a reply.
        </p>
      ) : null}
      <Table head={["Creator", "Last message", "Handled by", "When", ""]} empty={!threads.length}>
        {threads.map((t) => {
          const who = t.name || t.email || "Creator";
          const prefix = t.lastRole === "agent" ? "You: " : t.lastRole === "ai" ? "Assistant: " : "";
          return (
            <tr key={t.userId} className="align-top">
              <td className="max-w-52">
                <Link href={`/admin/support/${t.userId}`} className="block truncate font-medium hover:underline">
                  {who}
                </Link>
                {t.email ? <span className="block truncate text-xs text-muted-foreground">{t.email}</span> : null}
              </td>
              <td className="max-w-72">
                <span className="block truncate text-sm text-muted-foreground">
                  {prefix}
                  {t.lastBody}
                </span>
              </td>
              <td>{t.mode === "agent" ? <Pill tone="warn">Needs you</Pill> : <Pill tone="info">AI</Pill>}</td>
              <td className="text-xs whitespace-nowrap text-muted-foreground">{ago(t.lastAt)}</td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  {t.unread > 0 ? <Pill tone="warn">{t.unread} new</Pill> : null}
                  <Link href={`/admin/support/${t.userId}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
                    Open
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
