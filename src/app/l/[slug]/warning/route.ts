import type { NextRequest } from "next/server";
import { leanNotFound } from "@/lib/lean-link-pages";
import { isLinkEntry } from "@/lib/link-paths";
import { accessDenied, warningStep } from "@/lib/smart-link-steps";
import { getSmartLink } from "@/lib/smart-links";

// The 18+ page of a deep link, as one lean HTML document (lib/lean-link-pages).
export async function GET(request: NextRequest, ctx: RouteContext<"/l/[slug]/warning">) {
  const { slug } = await ctx.params;
  const link = await getSmartLink(slug);
  const h = new Headers(request.headers);
  if (!link || !link.adultWarning) return leanNotFound(h.get("host") ?? "");
  const denied = accessDenied(h, link);
  if (denied) return denied;
  // On a custom domain this page can be the first thing a visitor sees, so it counts the visit too.
  return warningStep(h, link, slug, isLinkEntry(h));
}
