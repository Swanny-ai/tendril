import type { NextRequest } from "next/server";
import { dashboardOwner } from "@/lib/analytics/dashboard-owner";
import { getGlobalStats, getSources } from "@/lib/analytics/global";
import { isValidTimeZone, resolveRange } from "@/lib/analytics/ranges";

const cell = (v: string | number) => {
  const s = String(v);
  // Quote everything and neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const row = (...xs: (string | number)[]) => xs.map(cell).join(",");

export async function GET(request: NextRequest) {
  const owner = await dashboardOwner();
  if (!owner) return new Response("Not signed in", { status: 401 });
  const q = request.nextUrl.searchParams;
  const tz = isValidTimeZone(q.get("tz")) ? q.get("tz")! : "UTC";
  const range = resolveRange({ range: q.get("range"), from: q.get("from"), to: q.get("to") }, tz, new Date(), owner.maxDays);
  const sources = await getSources(owner.userId);
  const stats = await getGlobalStats(owner, sources, range, tz, owner.withGeo);

  const lines = [
    row("Tendril global dashboard export"),
    row("Range", range.label, "From", range.from.toISOString(), "To", range.to.toISOString(), "Time zone", tz),
    "",
    row("Summary"),
    row("Total views", "Unique visitors", "Active links", "Avg views per active link", "Previous period views", "Growth %"),
    row(
      stats.totals.views,
      stats.totals.visitors,
      `${stats.totals.activeSources}/${stats.totals.totalSources}`,
      stats.totals.avgPerSource.toFixed(1),
      stats.totals.previousViews,
      stats.totals.growth === null ? "new" : (stats.totals.growth * 100).toFixed(1),
    ),
    "",
    row(range.bucket === "hour" ? "Hour" : "Day", "Views"),
    ...stats.series.map((s) => row(s.key, s.views)),
    "",
    row("Link", "Path", "Views"),
    ...stats.top.map((s) => row(s.label, s.path, s.views)),
  ];
  if (stats.countries) {
    lines.push("", row("Country code", "Country", "Views"), ...stats.countries.map((c) => row(c.code, c.name, c.views)));
  }

  const day = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tendril-dashboard-${range.key}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
