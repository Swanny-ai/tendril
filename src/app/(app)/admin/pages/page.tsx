import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { pageUrl } from "@/lib/link-targets";
import { PageRowActions } from "../row-actions";
import { FilterTabs, Header, Pager, Pill, SearchBox, Table, ago, daysAgo, fmt, listParams } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Bio pages" };

export default async function AdminPages(props: PageProps<"/admin/pages">) {
  await requireAdmin();
  const { q, page, skip, one } = await listParams(props.searchParams);
  const status = one("status");
  const where: Prisma.PageWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { username: { contains: q.toLowerCase().replace(/^@/, "") } },
              { displayName: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
      status === "live" ? { published: true } : status === "offline" ? { published: false } : status === "badge" ? { verifiedAt: { not: null } } : {},
    ],
  };
  const [total, pages, all, live, badge] = await Promise.all([
    db.page.count({ where }),
    db.page.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: 50,
      include: { user: { select: { id: true, email: true } }, domain: { select: { hostname: true } }, _count: { select: { blocks: true } } },
    }),
    db.page.count(),
    db.page.count({ where: { published: true } }),
    db.page.count({ where: { verifiedAt: { not: null } } }),
  ]);
  const views = await db.pageView.groupBy({
    by: ["pageId"],
    where: { pageId: { in: pages.map((p) => p.id) }, ts: { gte: daysAgo(30) }, isBot: false },
    _count: { _all: true },
  });
  const viewsOf = (id: string) => views.find((v) => v.pageId === id)?._count._all ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Header title="Bio pages" intro="Every bio page. Take one offline, give the verified badge, or delete it." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="@name, display name or owner email" q={q} extra={{ status }} />
        <FilterTabs
          path="/admin/pages"
          name="status"
          value={status}
          params={{ q }}
          options={[
            { value: "", label: "All", count: all },
            { value: "live", label: "Live", count: live },
            { value: "offline", label: "Offline", count: all - live },
            { value: "badge", label: "Verified badge", count: badge },
          ]}
        />
      </div>
      <Table head={["Page", "Owner", "Template", "Blocks", "Views (30 d)", "Status", "Made", ""]} empty={!pages.length}>
        {pages.map((p) => {
          const url = pageUrl(p, p.domain, appUrl);
          return (
            <tr key={p.id} className="hover:bg-muted/40">
              <td className="max-w-60">
                <a href={url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
                  {url.replace(/^https?:\/\//, "")}
                </a>
                <span className="block truncate text-xs text-muted-foreground">{p.displayName || "No name"}</span>
              </td>
              <td className="max-w-48 truncate text-xs">
                <Link href={`/admin/users/${p.user.id}`} className="hover:underline">
                  {p.user.email}
                </Link>
              </td>
              <td className="text-xs">{p.layout}</td>
              <td className="tabular-nums">{p._count.blocks}</td>
              <td className="tabular-nums">{fmt(viewsOf(p.id))}</td>
              <td>
                <div className="flex gap-1">
                  {p.published ? <Pill tone="good">Live</Pill> : <Pill tone="warn">Offline</Pill>}
                  {p.verifiedAt ? <Pill tone="info">Badge</Pill> : null}
                </div>
              </td>
              <td className="text-xs whitespace-nowrap text-muted-foreground">{ago(p.createdAt)}</td>
              <td>
                <PageRowActions page={p} />
              </td>
            </tr>
          );
        })}
      </Table>
      <Pager path="/admin/pages" page={page} total={total} params={{ q, status }} />
    </div>
  );
}
