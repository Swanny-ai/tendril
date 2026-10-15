import { describe, expect, it } from "vitest";
import { contrastRatio, resolveTheme, sanitizeOverrides, THEME_PRESETS } from "@/themes/presets";

const solid = (v: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : null);

describe("theme presets", () => {
  it("have unique keys and at least 4 free presets", () => {
    expect(new Set(THEME_PRESETS.map((t) => t.key)).size).toBe(THEME_PRESETS.length);
    expect(THEME_PRESETS.filter((t) => !t.pro).length).toBeGreaterThanOrEqual(4);
  });
  it.each(THEME_PRESETS.map((t) => [t.key, t] as const))("%s meets WCAG AA for solid text/background pairs", (_k, t) => {
    const bg = solid(t.tokens.background);
    if (bg) expect(contrastRatio(t.tokens.text, bg)).toBeGreaterThanOrEqual(4.5);
    const btnBg = solid(t.tokens.buttonBg);
    if (btnBg) expect(contrastRatio(t.tokens.buttonText, btnBg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("resolveTheme", () => {
  it("falls back to the first preset for unknown keys", () => {
    expect(resolveTheme("nope", null, false)).toEqual(THEME_PRESETS[0].tokens);
  });
  it("does not allow pro presets or overrides on free", () => {
    const pro = THEME_PRESETS.find((t) => t.pro)!;
    expect(resolveTheme(pro.key, { text: "#ff0000" }, false)).toEqual(THEME_PRESETS[0].tokens);
  });
  it("applies sanitized overrides on pro", () => {
    expect(resolveTheme("paper", { text: "#ff0000" }, true).text).toBe("#ff0000");
  });
});

describe("sanitizeOverrides", () => {
  it("drops non-hex colors and unknown fonts", () => {
    expect(sanitizeOverrides({ text: "red; background:url(x)", background: "#ABCDEF", font: "comic" })).toEqual({ background: "#ABCDEF" });
  });
});
