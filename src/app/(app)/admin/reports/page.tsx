import type { Metadata } from "next";
import Link from "next/link";
import { Check, PowerOff } from "lucide-react";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { smartLinkUrl } from "@/lib/domains";
import { ActionButton } from "../action-button";
import { dismissReportAction, takeDownReportedLinkAction } from "../actions";
import { Header, Pill, Table, ago } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Reports" };

export default async function AdminReports() {
  await requireAdmin();
  const reports = await db.linkReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { link: { select: { id: true, slug: true, enabled: true, atRoot: true, destinationUrl: true, domain: { select: { hostname: true } }, user: { select: { id: true, email: true } } } } },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Header title="Reports" intro="What visitors reported with the Report button on Two-Steps pages. Dismiss a report, or turn the link off (which clears its reports)." />
      <Table head={["Link", "Owner", "Reason", "Details", "When", ""]} empty={!reports.length}>
        {reports.map((r) => {
          const url = smartLinkUrl(r.link.slug, r.link.domain, appUrl, r.link.atRoot);
          return (
            <tr key={r.id} className="align-top">
              <td className="max-w-52">
                <a href={url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
                  {url.replace(/^https?:\/\//, "")}
                </a>
                <span className="block truncate text-xs text-muted-foreground">{r.link.destinationUrl}</span>
                {!r.link.enabled ? <Pill tone="warn">Already off</Pill> : null}
              </td>
              <td className="max-w-44 truncate text-xs">
                <Link href={`/admin/users/${r.link.user.id}`} className="hover:underline">
                  {r.link.user.email}
                </Link>
              </td>
              <td>
                <Pill tone="warn">{r.reason}</Pill>
              </td>
              <td className="max-w-72 text-xs break-words whitespace-pre-wrap text-muted-foreground">{r.details || "—"}</td>
              <td className="text-xs whitespace-nowrap text-muted-foreground">{ago(r.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <ActionButton action={dismissReportAction} fields={{ id: r.id }}>
                    <Check /> Dismiss
                  </ActionButton>
                  <ActionButton action={takeDownReportedLinkAction} fields={{ id: r.link.id }} variant="destructive" confirm={`Turn off ${r.link.slug} and clear its reports?`}>
                    <PowerOff /> Turn link off
                  </ActionButton>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
