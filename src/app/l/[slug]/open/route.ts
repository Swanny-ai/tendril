import type { NextRequest } from "next/server";
import { appHost } from "@/config/brand";
import { leanNotFound } from "@/lib/lean-link-pages";
import { isLinkEntry, linkHost, linkOpensHere } from "@/lib/link-paths";
import { accessDenied, openStep } from "@/lib/smart-link-steps";
import { getSmartLink } from "@/lib/smart-links";

// Step 2 of the deep link flow: visitors inside a social app's browser tap through to their
// phone's default browser. One lean HTML document (lib/lean-link-pages).
export async function GET(request: NextRequest, ctx: RouteContext<"/l/[slug]/open">) {
  const { slug } = await ctx.params;
  const h = new Headers(request.headers);
  const link = await getSmartLink(slug, linkHost(h, appHost));
  if (!link || !link.openInBrowser || !linkOpensHere(link, h, appHost)) return leanNotFound(h.get("host") ?? "");
  const denied = accessDenied(h, link);
  if (denied) return denied;
  return openStep(h, link, slug, isLinkEntry(h));
}
