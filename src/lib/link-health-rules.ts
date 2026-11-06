// Link Health: the pure parts (shared by the checker, the page and the tests).
// Every check is real: we load the link from our server the way each app or browser asks for it,
// and test the destinations. Countries come from the link's own rules (we don't load it from abroad).

import type { PlanName } from "@/lib/plan-rules";

export const HEALTH_CHECKS_PER_DAY: Record<PlanName, number> = { FREE: 10, PRO: 50, BUSINESS: 200 };

/** Marks our own checks, so they never count as visits in analytics. */
export const HEALTH_UA_TAG = "ViewLinkHealth/1.0";
export const isHealthCheck = (ua: string) => ua.includes("ViewLinkHealth/");

export type Client = {
  key: string;
  label: string;
  /** Which logo to show. */
  icon: "instagram" | "facebook" | "tiktok" | "safari" | "chrome" | "desktop";
  /** An app's built-in browser: we expect the link to send visitors on to their real browser. */
  inApp: boolean;
  /** We expect the link to hand visitors on to their real browser here (Instagram, Facebook). TikTok works fine inside the app. */
  escape: boolean;
  ua: string;
};

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko)";

export const CLIENTS: Client[] = [
  { key: "ig-ios", label: "Instagram · iPhone", icon: "instagram", inApp: true, escape: true, ua: `${IOS} Mobile/15E148 Instagram 360.0.0.0 (iPhone15,2; iOS 18_1; en_US)` },
  { key: "ig-android", label: "Instagram · Android", icon: "instagram", inApp: true, escape: true, ua: `${ANDROID} Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 Instagram 360.0.0.0 Android` },
  { key: "fb-ios", label: "Facebook · iPhone", icon: "facebook", inApp: true, escape: true, ua: `${IOS} Mobile/15E148 [FBAN/FBIOS;FBAV/490.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.1]` },
  { key: "fb-android", label: "Facebook · Android", icon: "facebook", inApp: true, escape: true, ua: `${ANDROID} Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0;]` },
  { key: "tiktok", label: "TikTok", icon: "tiktok", inApp: true, escape: false, ua: `${IOS} Mobile/15E148 musical_ly_37.0.0 BytedanceWebview/d8a21c6` },
  { key: "safari", label: "Safari", icon: "safari", inApp: false, escape: false, ua: `${IOS} Version/18.1 Mobile/15E148 Safari/604.1` },
  { key: "chrome", label: "Chrome · Android", icon: "chrome", inApp: false, escape: false, ua: `${ANDROID} Chrome/130.0.0.0 Mobile Safari/537.36` },
  { key: "desktop", label: "Desktop", icon: "desktop", inApp: false, escape: false, ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" },
];

/** Countries shown on every report (the link's rules decide each one). */
export const REPORT_COUNTRIES = ["US", "GB", "CA", "AU", "DE", "FR"] as const;

export type Outcome = "ok" | "warn" | "fail";

export type ClientResult = {
  key: string;
  outcome: Outcome;
  /** HTTP status of the last response we got (0 = no answer). */
  status: number;
  ms: number;
  /** In-app only: the page hands visitors to their real browser. */
  escapes?: boolean;
  note?: string;
};

export type DestinationResult = { url: string; host: string; outcome: Outcome; status: number; ms: number; note: string };

export type HealthResult = {
  kind: "link" | "page";
  live: { outcome: Outcome; note: string };
  clients: ClientResult[];
  inApp: { outcome: Outcome; note: string };
  countries: { code: string; ok: boolean }[];
  /** More blocked countries than the ones listed. */
  otherBlocked: number;
  rules: string[];
  destinations: DestinationResult[];
  /** Fastest full load (ms) in a normal browser, or null when nothing loaded. */
  speedMs: number | null;
};

export type HealthStatus = "healthy" | "warning" | "down";

/** Did this page (or redirect) send an in-app visitor on to their real browser? */
export function escapesInApp(body: string, location: string | null): boolean {
  const s = `${location ?? ""}\n${body}`;
  return /instagram:\/\/extbrowser|barcelona:\/\/extbrowser|x-safari-https?:\/\/|intent:\/\/|\/api\/open-hop/.test(s);
}

/** A destination's answer, in plain words. 401/403/429 mostly mean the site turns away robots, not people. */
export function destinationOutcome(status: number): { outcome: Outcome; note: string } {
  if (status === 0) return { outcome: "fail", note: "No answer" };
  if (status < 400) return { outcome: "ok", note: "Works" };
  if (status === 401 || status === 403 || status === 429) return { outcome: "warn", note: "Answers, but blocks automated checks" };
  if (status === 404 || status === 410) return { outcome: "fail", note: "Page not found" };
  if (status >= 500) return { outcome: "fail", note: "Site error" };
  return { outcome: "warn", note: `Answered ${status}` };
}

/** Overall verdict: down when nobody can open it, warning when something needs a look. */
export function overallStatus(r: HealthResult): HealthStatus {
  if (r.live.outcome === "fail" || r.clients.every((c) => c.outcome === "fail")) return "down";
  const parts = [r.inApp.outcome, ...r.clients.map((c) => c.outcome), ...r.destinations.map((d) => d.outcome)];
  return parts.includes("fail") ? "warning" : "healthy";
}

/** IPs a check must never reach (private networks, loopback, link-local, metadata). */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/i, "");
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(v4);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const x = ip.toLowerCase();
  return x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb");
}
