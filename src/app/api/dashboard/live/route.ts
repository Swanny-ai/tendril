import { NextResponse } from "next/server";
import { dashboardOwner } from "@/lib/analytics/dashboard-owner";
import { getLiveStats, getSources } from "@/lib/analytics/global";
import { clientIp } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const owner = await dashboardOwner();
  if (!owner) return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  if (!rateLimit(`live:${owner.userId}:${clientIp(request.headers)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: NO_STORE });
  }
  const sources = await getSources(owner.userId, owner);
  const live = await getLiveStats(owner, sources, owner.withGeo);
  return NextResponse.json(live, { headers: NO_STORE });
}
