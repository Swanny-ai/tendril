import { NextResponse, type NextRequest } from "next/server";
import { clientIp, visitorHash } from "@/lib/analytics/visitor";
import { db } from "@/lib/db";
import { REPORT_REASONS } from "@/lib/link-landing";
import { rateLimit } from "@/lib/rate-limit";

// Visitors report a template page (the Report popup). Anonymous: only a daily visitor hash is kept.
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`report:${ip}`, 5, 60 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { slug?: unknown; reason?: unknown; details?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug.slice(0, 60) : "";
  const reason = typeof body?.reason === "string" && REPORT_REASONS.includes(body.reason) ? body.reason : null;
  if (!slug || !reason) return NextResponse.json({ ok: false }, { status: 400 });
  const link = await db.smartLink.findUnique({ where: { slug }, select: { id: true } });
  if (!link) return NextResponse.json({ ok: false }, { status: 404 });
  await db.linkReport.create({
    data: {
      linkId: link.id,
      reason,
      details: typeof body?.details === "string" ? body.details.trim().slice(0, 500) : "",
      visitorHash: await visitorHash(ip, request.headers.get("user-agent") ?? ""),
    },
  });
  return NextResponse.json({ ok: true });
}
