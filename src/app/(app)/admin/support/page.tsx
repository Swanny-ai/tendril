import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { adminTicketCounts, adminTickets } from "@/lib/support";
import { FilterTabs, Header, Pill, Table, ago } from "../ui";
import { AutoRefresh } from "./auto-refresh";

export const instant = false;
export const metadata: Metadata = { title: "Support" };

export default async function AdminSupport({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const status = (await searchParams).status === "resolved" ? "resolved" : "open";
  const [tickets, counts] = await Promise.all([adminTickets(status), adminTicketCounts()]);
  const waiting = tickets.filter((t) => t.unread > 0).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <AutoRefresh />
      <Header
        title="Support"
        intro="Tickets from the help button on creators' dashboards. The assistant answers common questions first and hands off to you when it can't. Resolved tickets stay here as history."
      >
        <FilterTabs
          path="/admin/support"
          name="status"
          value={status === "open" ? "" : "resolved"}
          options={[
            { value: "", label: "Open", count: counts.open },
            { value: "resolved", label: "Resolved", count: counts.resolved },
          ]}
        />
      </Header>
      {status === "open" && waiting > 0 ? (
        <p className="text-sm font-medium text-[var(--persimmon)]">
          {waiting} ticket{waiting === 1 ? "" : "s"} waiting on a reply.
        </p>
      ) : null}
      <Table head={["Creator", "Ticket", "Handled by", "Last activity", ""]} empty={!tickets.length}>
        {tickets.map((t) => {
          const who = t.name || t.email || "Creator";
          const prefix = t.lastRole === "agent" ? "You: " : t.lastRole === "ai" ? "Assistant: " : "";
          return (
            <tr key={t.id} className="align-top">
              <td className="max-w-48">
                <Link href={`/admin/support/${t.id}`} className="block truncate font-medium hover:underline">
                  {who}
                </Link>
                {t.email ? <span className="block truncate text-xs text-muted-foreground">{t.email}</span> : null}
              </td>
              <td className="max-w-72">
                <Link href={`/admin/support/${t.id}`} className="block truncate text-sm font-medium hover:underline">
                  {t.subject || "Conversation"}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">
                  {prefix}
                  {t.lastBody}
                </span>
              </td>
              <td>{t.status === "resolved" ? <Pill tone="good">Resolved</Pill> : t.mode === "agent" ? <Pill tone="warn">Needs you</Pill> : <Pill tone="info">Assistant</Pill>}</td>
              <td className="text-xs whitespace-nowrap text-muted-foreground">{ago(t.lastMessageAt)}</td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  {t.unread > 0 ? <Pill tone="warn">{t.unread} new</Pill> : null}
                  <Link href={`/admin/support/${t.id}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
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
