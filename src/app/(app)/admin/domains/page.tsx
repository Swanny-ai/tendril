import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "../action-button";
import { deleteDomainAdminAction } from "../actions";
import { Header, Pager, Pill, SearchBox, Table, day, listParams } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Domains" };

export default async function AdminDomains(props: PageProps<"/admin/domains">) {
  await requireAdmin();
  const { q, page, skip } = await listParams(props.searchParams);
  const where = q ? { OR: [{ hostname: { contains: q.toLowerCase() } }, { user: { email: { contains: q, mode: "insensitive" as const } } }] } : {};
  const [total, domains] = await Promise.all([
    db.domain.count({ where }),
    db.domain.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: 50,
      include: { user: { select: { id: true, email: true } }, _count: { select: { smartLinks: true, pages: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Header title="Custom domains" intro="Every domain creators connected. Removing one also removes it from the hosting." />
      <SearchBox placeholder="Domain or owner email" q={q} />
      <Table head={["Domain", "Owner", "Status", "Uses", "Added", ""]} empty={!domains.length}>
        {domains.map((d) => (
          <tr key={d.id} className="hover:bg-muted/40">
            <td>
              <a href={`https://${d.hostname}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {d.hostname}
              </a>
            </td>
            <td className="max-w-48 truncate text-xs">
              <Link href={`/admin/users/${d.user.id}`} className="hover:underline">
                {d.user.email}
              </Link>
            </td>
            <td>{d.verifiedAt ? <Pill tone="good">Connected</Pill> : <Pill tone="warn">Waiting for DNS</Pill>}</td>
            <td className="text-xs text-muted-foreground">
              {d._count.pages} pages · {d._count.smartLinks} links
            </td>
            <td className="text-xs text-muted-foreground">{day(d.createdAt)}</td>
            <td>
              <div className="flex justify-end">
                <ActionButton action={deleteDomainAdminAction} fields={{ id: d.id }} variant="destructive" confirm={`Remove ${d.hostname}? Its links and pages go back to the ViewLink address.`}>
                  <Trash2 /> Remove
                </ActionButton>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <Pager path="/admin/domains" page={page} total={total} params={{ q }} />
    </div>
  );
}
