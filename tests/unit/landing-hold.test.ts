import { describe, expect, it } from "vitest";
import { DEFAULT_LANDING, defaultIntroSection, landingHtml, newSection } from "@/lib/link-landing";

const step2Href = "https://tendril.example/l/vip?step=2";
const page = { ...DEFAULT_LANDING, enabled: true, introSections: [defaultIntroSection()] };
const render = (extra: Partial<Parameters<typeof landingHtml>[0]> = {}) =>
  landingHtml({ page, fallbackName: "Mila", showBadge: false, step: 1, step2Href, ...extra });

describe("Step 1's hold-to-open button", () => {
  it("only opens with a long press: it keeps Step 2's address and is marked hold-only", () => {
    const html = render({ step2Deep: "instagram://extbrowser/?url=x" });
    const button = html.match(/<a [^>]*class="lp-btn lp-link[^"]*"[^>]*>/)?.[0] ?? "";
    expect(button).toContain(`href="${step2Href}"`);
    expect(button).toContain("data-hold");
    // No tap behaviour: no app jump, no tap counting.
    expect(button).not.toContain("data-deep");
    expect(button).not.toContain("data-tap");
  });

  it("leaves a Step 1 button with its own link as a normal link", () => {
    const own = { ...page, introSections: [newSection("link", { title: "My site", url: "https://example.com" })] };
    const html = render({ page: own });
    expect(html).not.toContain("data-hold");
  });

  it("isn't hold-only on Step 2", () => {
    expect(render({ step: 2 })).not.toContain("data-hold");
  });
});
