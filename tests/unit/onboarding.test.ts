import { describe, expect, it } from "vitest";
import { cleanAnswers } from "@/lib/onboarding";

describe("sign-up answers", () => {
  it("keeps known choices and trims handles", () => {
    expect(cleanAnswers({ role: "creator", goals: ["bio", "deeplinks", "bio"], platforms: { instagram: " @maria ", tiktok: "" } })).toEqual({
      role: "creator",
      goals: ["bio", "deeplinks"],
      platforms: { instagram: "maria", tiktok: "" },
    });
  });
  it("drops anything unknown", () => {
    expect(cleanAnswers({ role: "hacker", goals: ["nope", 3], platforms: { myspace: "x" } })).toEqual({ role: null, goals: [], platforms: {} });
    expect(cleanAnswers(null)).toEqual({ role: null, goals: [], platforms: {} });
  });
  it("caps handle length", () => {
    expect(cleanAnswers({ platforms: { x: "a".repeat(200) } }).platforms.x).toHaveLength(60);
  });
});
