import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/themes/presets";
import { pickLang, templateCopy, WARNING_COPY } from "@/warning-templates/copy";
import { applyWarningColors, parseWarningColors } from "@/warning-templates/colors";
import { getWarningTemplate, isWarningTemplateKey, WARNING_TEMPLATES } from "@/warning-templates/templates";
import { warningHtml } from "@/warning-templates/warning-html";

describe("warning templates", () => {
  it("has 12 templates with unique keys", () => {
    expect(WARNING_TEMPLATES).toHaveLength(12);
    expect(new Set(WARNING_TEMPLATES.map((t) => t.key)).size).toBe(12);
  });
  it("only Clear Blue is exempt from the contrast check (it matches a reference look)", () => {
    expect(WARNING_TEMPLATES.filter((t) => t.meetsContrast === false).map((t) => t.key)).toEqual(["clear-blue"]);
  });
  it.each(WARNING_TEMPLATES.filter((t) => t.meetsContrast !== false).map((t) => [t.key, t] as const))("%s meets WCAG AA for text and button", (_k, t) => {
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.buttonText, t.buttonSolid)).toBeGreaterThanOrEqual(4.5);
  });
  it("falls back to the default for unknown keys", () => {
    expect(getWarningTemplate("nope").key).toBe("clear-blue");
    expect(isWarningTemplateKey("sorbet")).toBe(true);
    expect(isWarningTemplateKey("nope")).toBe(false);
  });
});

describe("warning copy", () => {
  it("uses a template's own English wording, translations otherwise", () => {
    const blue = getWarningTemplate("clear-blue");
    expect(templateCopy(blue, "en").title).toBe("Age Restricted");
    expect(templateCopy(blue, "es").title).toBe("Solo para adultos");
    expect(templateCopy(getWarningTemplate("dusk"), "en").title).toBe("Adults only");
  });
  it("has every string in every language", () => {
    const keys = Object.keys(WARNING_COPY.en);
    for (const [lang, copy] of Object.entries(WARNING_COPY)) expect(Object.keys(copy), lang).toEqual(keys);
  });
  it.each([
    ["es-MX,es;q=0.9,en;q=0.8", "es"],
    ["de-DE", "de"],
    ["ja,en;q=0.5", "en"],
    ["zh-CN", "en"],
    ["fr;q=0.3,pt-BR;q=0.9", "pt"],
    ["", "en"],
    [null, "en"],
  ])("%s → %s", (header, lang) => expect(pickLang(header)).toBe(lang));
});

describe("warning colors", () => {
  it("keeps only known keys with valid hex values", () => {
    expect(parseWarningColors({ pageBg: "#ABC", buttonBg: "red", text: "#12345", evil: "#000000" })).toEqual({ pageBg: "#aabbcc" });
    expect(parseWarningColors({ buttonBg: "url(x)" })).toBeNull();
    expect(parseWarningColors(null)).toBeNull();
    expect(parseWarningColors(["#ffffff"])).toBeNull();
  });
  it("overrides the design's colors and leaves the rest alone", () => {
    const t = getWarningTemplate("dusk");
    const c = applyWarningColors(t, { pageBg: "#101010", text: "#eeeeee", buttonBg: "#ff0000", buttonText: "#000000", cardBg: "#202020" });
    expect(c).toMatchObject({ pageBg: "#101010", cardBg: "#202020", surface: "#202020", text: "#eeeeee", muted: "#eeeeeeb3", buttonBg: "#ff0000", buttonSolid: "#ff0000", buttonText: "#000000" });
    expect(c.radius).toBe(t.radius);
    expect(applyWarningColors(t, null)).toBe(t);
  });
  it("is applied by the shared renderer (preview = live page)", () => {
    const html = warningHtml({ template: getWarningTemplate("clear-blue"), colors: { buttonBg: "#ff0000" }, title: "T", message: "M", button: "B", leave: "L", continueHref: "/c", leaveHref: "/l", showBadge: false });
    expect(html).toContain("background:#ff0000");
    expect(html).not.toContain("#00aff0;color");
  });
});
