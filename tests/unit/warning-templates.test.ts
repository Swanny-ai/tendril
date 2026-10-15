import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/themes/presets";
import { pickLang, templateCopy, WARNING_COPY } from "@/warning-templates/copy";
import { getWarningTemplate, isWarningTemplateKey, WARNING_TEMPLATES } from "@/warning-templates/templates";

describe("warning templates", () => {
  it("has 13 templates with unique keys", () => {
    expect(WARNING_TEMPLATES).toHaveLength(13);
    expect(new Set(WARNING_TEMPLATES.map((t) => t.key)).size).toBe(13);
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
    expect(getWarningTemplate("nope").key).toBe("dusk");
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
