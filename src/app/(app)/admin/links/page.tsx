import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { smartLinkUrl } from "@/lib/domains";
import { LinkRowActions } from "../row-actions";
import { FilterTabs, Header, Pager, Pill, SearchBox, Table, ago, daysAgo, fmt, listParams } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Links" };

const TWO_STEPS: Prisma.SmartLinkWhereInput = { landingPage: { path: ["enabled"], equals: true } };

export default async function AdminLinks(props: PageProps<"/admin/links">) {
  await requireAdmin();
  const { q, page, skip, one } = await listParams(props.searchParams);
  const type = one("type");
  const where: Prisma.SmartLinkWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { slug: { contains: q.toLowerCase() } },
              { destinationUrl: { contains: q, mode: "insensitive" } },
              { label: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
      type === "two-steps" ? TWO_STEPS : type === "deeplinks" ? { NOT: TWO_STEPS } : type === "off" ? { enabled: false } : type === "reported" ? { reports: { some: {} } } : {},
    ],
  };
  const [total, links, all, twoSteps, off, reported] = await Promise.all([
    db.smartLink.count({ where }),
    db.smartLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: 50,
      select: {
        id: true,
        slug: true,
        enabled: true,
        atRoot: true,
        destinationUrl: true,
        createdAt: true,
        landingPage: true,
        adultWarning: true,
        domain: { select: { hostname: true } },
        user: { select: { id: true, email: true } },
        _count: { select: { reports: true } },
      },
    }),
    db.smartLink.count(),
    db.smartLink.count({ where: TWO_STEPS }),
    db.smartLink.count({ where: { enabled: false } }),
    db.smartLink.count({ where: { reports: { some: {} } } }),
  ]);
  const stats = await db.smartLinkEvent.groupBy({
    by: ["linkId", "kind"],
    where: { linkId: { in: links.map((l) => l.id) }, ts: { gte: daysAgo(30) }, isBot: false, kind: { in: ["hit", "step2", "tap"] } },
    _count: { _all: true },
  });
  const count = (id: string, kind: string) => stats.find((s) => s.linkId === id && s.kind === kind)?._count._all ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Header title="Links" intro="Every Two-Steps link and deeplink. Turn one off or delete it." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Link name, destination or owner email" q={q} extra={{ type }} />
        <FilterTabs
          path="/admin/links"
          name="type"
          value={type}
          params={{ q }}
          options={[
            { value: "", label: "All", count: all },
            { value: "two-steps", label: "Two-Steps", count: twoSteps },
            { value: "deeplinks", label: "Deeplinks", count: all - twoSteps },
            { value: "off", label: "Off", count: off },
            { value: "reported", label: "Reported", count: reported },
          ]}
        />
      </div>
      <Table head={["Link", "Owner", "Type", "Goes to", "Visits (30 d)", "Status", "Made", ""]} empty={!links.length}>
        {links.map((l) => {
          const url = smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot);
          const two = !!(l.landingPage as { enabled?: boolean } | null)?.enabled;
          return (
            <tr key={l.id} className="hover:bg-muted/40">
              <td className="max-w-56">
                <a href={url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
                  {url.replace(/^https?:\/\//, "")}
                </a>
              </td>
              <td className="max-w-44 truncate text-xs">
                <Link href={`/admin/users/${l.user.id}`} className="hover:underline">
                  {l.user.email}
                </Link>
              </td>
              <td className="text-xs whitespace-nowrap">{two ? "Two-Steps" : l.adultWarning ? "Deeplink · 18+" : "Deeplink"}</td>
              <td className="max-w-52 truncate text-xs text-muted-foreground">{l.destinationUrl}</td>
              <td className="text-xs whitespace-nowrap tabular-nums">
                {fmt(count(l.id, "hit"))}
                {two ? <span className="text-muted-foreground"> · {fmt(count(l.id, "step2"))} step 2 · {fmt(count(l.id, "tap"))} taps</span> : null}
              </td>
              <td>
                <div className="flex gap-1">
                  {l.enabled ? <Pill tone="good">On</Pill> : <Pill tone="warn">Off</Pill>}
                  {l._count.reports ? (
                    <Link href="/admin/reports">
                      <Pill tone="warn">{l._count.reports} reports</Pill>
                    </Link>
                  ) : null}
                </div>
              </td>
              <td className="text-xs whitespace-nowrap text-muted-foreground">{ago(l.createdAt)}</td>
              <td>
                <LinkRowActions link={l} />
              </td>
            </tr>
          );
        })}
      </Table>
      <Pager path="/admin/links" page={page} total={total} params={{ q, type }} />
    </div>
  );
}
