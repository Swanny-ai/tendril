// The sign-up questions (/onboarding): who the person is, what they want ViewLink for and where
// their audience is. Shared by the page (client) and the save action (server). Pure, no imports.

export const ROLES = [
  { key: "creator", title: "Content Creator", hint: "Grow and monetize your audience" },
  { key: "business", title: "Business / Brand", hint: "Reach more customers" },
  { key: "agency", title: "Agency / Manager", hint: "Run links for the creators you manage" },
  { key: "personal", title: "Personal", hint: "Share your links" },
] as const;

export const GOALS = [
  { key: "bio", title: "Link in Bio", hint: "All your links on one page" },
  { key: "deeplinks", title: "Deeplinks", hint: "Open your links in Safari & Chrome, not inside Instagram" },
  { key: "twosteps", title: "Two-Steps pages", hint: "Your own page before your link" },
  { key: "age", title: "18+ warning page", hint: "Ask visitors to confirm they're adults" },
  { key: "domain", title: "Custom domain", hint: "Links on your own .com or .me" },
  { key: "analytics", title: "Analytics", hint: "See who clicks, from where, and when" },
] as const;

export const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "snapchat", label: "Snapchat" },
  { key: "threads", label: "Threads" },
  { key: "facebook", label: "Facebook" },
  { key: "telegram", label: "Telegram" },
  { key: "onlyfans", label: "OnlyFans" },
  { key: "fanvue", label: "Fanvue" },
] as const;

export type RoleKey = (typeof ROLES)[number]["key"];
export type GoalKey = (typeof GOALS)[number]["key"];
export type PlatformKey = (typeof PLATFORMS)[number]["key"];

export type OnboardingAnswers = {
  role: RoleKey | null;
  goals: GoalKey[];
  /** Platform → handle ("" when they picked the platform without typing a handle). */
  platforms: Partial<Record<PlatformKey, string>>;
};

const has = <T extends { key: string }>(list: readonly T[], k: unknown): k is T["key"] => typeof k === "string" && list.some((x) => x.key === k);

/** Only known keys, short trimmed handles: safe to store as-is. */
export function cleanAnswers(raw: unknown): OnboardingAnswers {
  const v = (raw ?? {}) as Record<string, unknown>;
  const goals = Array.isArray(v.goals) ? [...new Set(v.goals.filter((g) => has(GOALS, g)))] : [];
  const platforms: OnboardingAnswers["platforms"] = {};
  if (v.platforms && typeof v.platforms === "object") {
    for (const [k, h] of Object.entries(v.platforms as Record<string, unknown>)) {
      if (has(PLATFORMS, k)) platforms[k] = typeof h === "string" ? h.trim().replace(/^@+/, "").slice(0, 60) : "";
    }
  }
  return { role: has(ROLES, v.role) ? v.role : null, goals: goals as GoalKey[], platforms };
}
