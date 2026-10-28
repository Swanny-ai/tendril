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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Header title="Support" intro="Messages creators sent from the help button on their dashboard. Open a conversation to read it and reply." />
      <Table head={["Creator", "Last message", "When", ""]} empty={!threads.length}>
        {threads.map((t) => {
          const who = t.name || t.email || "Creator";
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
                  {t.lastFromAdmin ? "You: " : ""}
                  {t.lastBody}
                </span>
              </td>
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
