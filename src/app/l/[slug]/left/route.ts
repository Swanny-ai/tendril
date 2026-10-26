import type { NextRequest } from "next/server";
import { leanNotFound } from "@/lib/lean-link-pages";
import { accessDenied, leftStep } from "@/lib/smart-link-steps";
import { getSmartLink } from "@/lib/smart-links";

// After "Take me back" on an 18+ page.
export async function GET(request: NextRequest, ctx: RouteContext<"/l/[slug]/left">) {
  const { slug } = await ctx.params;
  const link = await getSmartLink(slug);
  const h = new Headers(request.headers);
  if (!link) return leanNotFound(h.get("host") ?? "");
  return accessDenied(h, link) ?? leftStep(h, link);
}
