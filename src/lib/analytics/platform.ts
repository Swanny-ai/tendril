// Groups the stored `browser` value (see lib/ua.ts: "<app>-webview" for social apps'
// in-app browsers, else the lowercased browser name) into the platform people came from.

const PLATFORMS: [test: RegExp, label: string][] = [
  [/^instagram-webview$/, "Instagram"],
  [/^tiktok-webview$/, "TikTok"],
  [/^facebook-webview$/, "Facebook"],
  [/^snapchat-webview$/, "Snapchat"],
  [/^linkedin-webview$/, "LinkedIn"],
  [/^twitter-webview$/, "X"],
  [/safari/, "Safari"],
  [/chrom/, "Chrome"],
  [/firefox/, "Firefox"],
  [/edge/, "Edge"],
  [/samsung/, "Samsung Internet"],
];

export function platformLabel(browser: string | null | undefined): string {
  const b = (browser ?? "").toLowerCase();
  return PLATFORMS.find(([re]) => re.test(b))?.[1] ?? "Other";
}

/** Merges per-browser counts into per-platform counts, biggest first ("Other" last). */
export function platformCounts(rows: { browser: string | null; count: number }[]): { label: string; count: number }[] {
  const by = new Map<string, number>();
  for (const r of rows) {
    const label = platformLabel(r.browser);
    by.set(label, (by.get(label) ?? 0) + r.count);
  }
  return [...by]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => Number(a.label === "Other") - Number(b.label === "Other") || b.count - a.count);
}
