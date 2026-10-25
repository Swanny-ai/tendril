import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PLAN_LABEL, planFromSubscription } from "@/lib/plan-rules";
import { FilterTabs, Header, Pager, Pill, SearchBox, Table, ago, fmt, listParams } from "../ui";

export const instant = false;
export const metadata: Metadata = { title: "Users" };

/** Accounts on Pro right now (same rules as planFromSubscription). */
const proWhere = (): Prisma.UserWhereInput => ({
  subscription: {
    plan: { in: ["PRO", "BUSINESS"] },
    OR: [{ status: { in: ["active", "trialing", "past_due"] } }, { status: "prepaid", currentPeriodEnd: { gt: new Date() } }],
  },
});

export default async function AdminUsers(props: PageProps<"/admin/users">) {
  await requireAdmin();
  const PRO = proWhere();
  const { q, page, skip, one } = await listParams(props.searchParams);
  const plan = one("plan");
  const where: Prisma.UserWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { id: q },
              { pages: { some: { username: { contains: q.toLowerCase().replace(/^@/, "") } } } },
              { smartLinks: { some: { slug: { contains: q.toLowerCase() } } } },
            ],
          }
        : {},
      plan === "pro" ? PRO : plan === "free" ? { NOT: PRO } : plan === "unconfirmed" ? { emailVerified: null } : {},
    ],
  };
  const [total, users, all, pros, unconfirmed] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        passwordHash: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true, stripeSubscriptionId: true, paddleSubscriptionId: true } },
        referredBy: { select: { email: true } },
        pages: { select: { username: true }, orderBy: { createdAt: "asc" }, take: 1 },
        _count: { select: { pages: true, smartLinks: true, domains: true, accounts: true } },
      },
    }),
    db.user.count(),
    db.user.count({ where: PRO }),
    db.user.count({ where: { emailVerified: null } }),
  ]);
  const params = { q, plan };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Header title="Users" intro="Every account. Open one to change its plan, sign it out, turn off its pages or delete it." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Email, name, @page or link name" q={q} extra={{ plan }} />
        <FilterTabs
          path="/admin/users"
          name="plan"
          value={plan}
          params={{ q }}
          options={[
            { value: "", label: "All", count: all },
            { value: "pro", label: "Paid", count: pros },
            { value: "free", label: "Free", count: all - pros },
            { value: "unconfirmed", label: "Email not confirmed", count: unconfirmed },
          ]}
        />
      </div>
      <Table head={["Account", "Plan", "Pages", "Links", "Domains", "Sign-in", "Referred by", "Joined"]} empty={!users.length}>
        {users.map((u) => {
          const current = planFromSubscription(u.subscription);
          const isPro = current !== "FREE";
          return (
            <tr key={u.id} className="hover:bg-muted/40">
              <td className="max-w-72">
                <Link href={`/admin/users/${u.id}`} className="block truncate font-medium hover:underline">
                  {u.email}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">
                  {u.pages[0] ? `@${u.pages[0].username}` : (u.name ?? "No page yet")}
                  {!u.emailVerified ? " · email not confirmed" : ""}
                </span>
              </td>
              <td>
                {isPro ? (
                  <Pill tone="good">{PLAN_LABEL[current]} · {u.subscription?.stripeSubscriptionId || u.subscription?.paddleSubscriptionId ? "card" : u.subscription?.status === "prepaid" ? "crypto" : "given"}</Pill>
                ) : (
                  <Pill>Free</Pill>
                )}
              </td>
              <td className="tabular-nums">{fmt(u._count.pages)}</td>
              <td className="tabular-nums">{fmt(u._count.smartLinks)}</td>
              <td className="tabular-nums">{fmt(u._count.domains)}</td>
              <td className="text-xs text-muted-foreground">{[u.passwordHash ? "Password" : null, u._count.accounts ? "Google" : null].filter(Boolean).join(" + ") || "—"}</td>
              <td className="max-w-40 truncate text-xs text-muted-foreground">{u.referredBy?.email ?? "—"}</td>
              <td className="text-xs whitespace-nowrap text-muted-foreground">{ago(u.createdAt)}</td>
            </tr>
          );
        })}
      </Table>
      <Pager path="/admin/users" page={page} total={total} params={params} />
    </div>
  );
}
