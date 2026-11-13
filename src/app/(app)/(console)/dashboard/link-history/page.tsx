import type { Metadata } from "next";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { pageUrl } from "@/lib/link-targets";
import { requireAccount } from "@/lib/session";
import { LinkHistoryScan } from "./scan";

export const instant = false;
export const metadata: Metadata = { title: "IG Link History" };

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase();

/**
 * IG Link History: reads an Instagram data download in the browser and lists every outside link it
 * holds (bio website now and before, posts, stories), marking the ones that are this account's.
 */
export default async function LinkHistoryPage() {
  const { userId } = await requireAccount();
  const [links, pages, domains] = await Promise.all([
    db.smartLink.findMany({ where: { userId }, select: { slug: true, label: true, atRoot: true, domain: { select: { hostname: true } } } }),
    db.page.findMany({ where: { userId }, select: { username: true, displayName: true, atRoot: true, domain: { select: { hostname: true } } } }),
    db.domain.findMany({ where: { userId }, select: { hostname: true } }),
  ]);
  const mine = [
    ...links.map((l) => ({ address: bare(smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot)), name: l.label || l.slug })),
    ...pages.map((p) => ({ address: bare(pageUrl(p, p.domain, appUrl)), name: p.displayName || `@${p.username}` })),
  ];
  return <LinkHistoryScan mine={mine} ourHosts={[new URL(appUrl).hostname.replace(/^www\./, ""), ...domains.map((d) => d.hostname)]} />;
}
