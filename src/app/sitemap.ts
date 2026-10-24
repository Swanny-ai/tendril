import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";

// The home page, sign-up/sign-in and every published bio page (refreshed every hour).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  const pages = await db.page.findMany({
    where: { published: true },
    select: { username: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 45_000,
  });
  return [
    { url: appUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/signup`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    ...pages.map((p) => ({ url: `${appUrl}/${p.username}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
