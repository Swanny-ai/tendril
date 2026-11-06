import { describe, expect, it } from "vitest";
import { isbot } from "isbot";
import { detectInAppBrowser } from "@/lib/in-app";
import {
  CLIENTS,
  destinationOutcome,
  escapesInApp,
  HEALTH_UA_TAG,
  isHealthCheck,
  isPrivateAddress,
  overallStatus,
  type HealthResult,
} from "@/lib/link-health-rules";

const base: HealthResult = {
  kind: "link",
  live: { outcome: "ok", note: "" },
  clients: CLIENTS.map((c) => ({ key: c.key, outcome: "ok", status: 200, ms: 100 })),
  inApp: { outcome: "ok", note: "" },
  countries: [],
  otherBlocked: 0,
  rules: [],
  destinations: [{ url: "https://x.com", host: "x.com", outcome: "ok", status: 200, ms: 1, note: "" }],
  speedMs: 100,
};

describe("Link Health rules", () => {
  it("our check user agents look like the real apps, and are tagged", () => {
    for (const c of CLIENTS) {
      const ua = `${c.ua} ${HEALTH_UA_TAG}`;
      expect(isHealthCheck(ua)).toBe(true);
      expect(isbot(ua)).toBe(false); // so the link pages answer them like a person
      expect(!!detectInAppBrowser(ua)).toBe(c.inApp);
    }
  });

  it("spots the hand-off to the real browser, not the script that looks for it", () => {
    expect(escapesInApp('<a href="instagram://extbrowser/?url=https%3A">', null)).toBe(true);
    expect(escapesInApp("", "intent://viewlink.me/x#Intent;end")).toBe(true);
    expect(escapesInApp('<a href="x-safari-https://viewlink.me/x">', null)).toBe(true);
    expect(escapesInApp('var S=\'a[href^="intent:"],a[href^="x-safari-"]\'', null)).toBe(false);
  });

  it("reads destination answers", () => {
    expect(destinationOutcome(200).outcome).toBe("ok");
    expect(destinationOutcome(403).outcome).toBe("warn");
    expect(destinationOutcome(404).outcome).toBe("fail");
    expect(destinationOutcome(0).outcome).toBe("fail");
  });

  it("gives one verdict", () => {
    expect(overallStatus(base)).toBe("healthy");
    expect(overallStatus({ ...base, inApp: { outcome: "warn", note: "" } })).toBe("healthy");
    expect(overallStatus({ ...base, destinations: [{ ...base.destinations[0], outcome: "fail" }] })).toBe("warning");
    expect(overallStatus({ ...base, live: { outcome: "fail", note: "" } })).toBe("down");
    expect(overallStatus({ ...base, clients: base.clients.map((c) => ({ ...c, outcome: "fail" as const })) })).toBe("down");
  });

  it("never reaches private networks", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1", "100.64.0.1"])
      expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "104.16.1.1", "2606:4700::1111"]) expect(isPrivateAddress(ip)).toBe(false);
  });
});
