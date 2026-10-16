import { describe, expect, it } from "vitest";
import { isStarterPage, STARTER_BLOCKS } from "@/lib/starter-blocks";

describe("isStarterPage", () => {
  const starter = STARTER_BLOCKS.map((b) => ({ type: b.type, title: b.title, url: b.url }));
  it("is true for empty pages and untouched starter blocks", () => {
    expect(isStarterPage([])).toBe(true);
    expect(isStarterPage(starter)).toBe(true);
  });
  it("is false once the creator changed anything", () => {
    expect(isStarterPage([starter[0], { ...starter[1], url: "https://my.site" }])).toBe(false);
    expect(isStarterPage([starter[0]])).toBe(false);
    expect(isStarterPage([...starter, { type: "LINK", title: "Shop", url: "https://shop.example" }])).toBe(false);
  });
});
