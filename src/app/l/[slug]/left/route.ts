import type { NextRequest } from "next/server";
import { appHost } from "@/config/brand";
import { leanNotFound } from "@/lib/lean-link-pages";
import { linkHost, linkOpensHere } from "@/lib/link-paths";
import { accessDenied, leftStep } from "@/lib/smart-link-steps";
import { getSmartLink } from "@/lib/smart-links";

// After "Take me back" on an 18+ page.
export async function GET(request: NextRequest, ctx: RouteContext<"/l/[slug]/left">) {
  const { slug } = await ctx.params;
  const h = new Headers(request.headers);
  const link = await getSmartLink(slug, linkHost(h, appHost));
  if (!link || !linkOpensHere(link, h, appHost)) return leanNotFound(h.get("host") ?? "");
  return accessDenied(h, link) ?? leftStep(h, link);
}
