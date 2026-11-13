import { beforeEach, describe, expect, it, vi } from "vitest";

// "View as user": the dashboard follows the viewed account for page loads, refuses saves, and the
// pass only counts for the admin who started it, while they're still an admin, before it expires.

const jar = new Map<string, string>();
const head = new Map<string, string>();
let signedIn: string | null = "admin1";
const admins = new Set(["admin1", "admin2"]);

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k)! } : undefined),
    set: (k: string, v: string) => jar.set(k, v),
    delete: (k: string) => jar.delete(k),
  }),
  headers: async () => ({ get: (k: string) => head.get(k) ?? null }),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("@/lib/auth", () => ({ auth: async () => (signedIn ? { user: { id: signedIn } } : null) }));
vi.mock("@/lib/current-page", () => ({ getCurrentPage: async () => null }));
vi.mock("@/lib/admin-emails", () => ({ isAdmin: async (id: string) => admins.has(id) }));

process.env.AUTH_SECRET = "test-secret";
const { startViewAs } = await import("@/lib/view-as");
const { apiUserId, requireRealUserId, requireUserId } = await import("@/lib/session");

beforeEach(() => {
  jar.clear();
  head.clear();
  signedIn = "admin1";
  admins.clear();
  admins.add("admin1");
  admins.add("admin2");
  vi.useRealTimers();
});

describe("view as user", () => {
  it("is the signed-in account when not viewing", async () => {
    expect(await requireUserId()).toBe("admin1");
  });

  it("shows the viewed account on page loads, but the admin stays themselves for admin checks", async () => {
    await startViewAs("admin1", "user9");
    expect(await requireUserId()).toBe("user9");
    expect(await requireRealUserId()).toBe("admin1");
    expect(await apiUserId()).toBe("user9");
  });

  it("refuses saves (server actions) and write API calls while viewing", async () => {
    await startViewAs("admin1", "user9");
    head.set("next-action", "abc123");
    await expect(requireUserId()).rejects.toThrow(/Changes are turned off/);
    expect(await apiUserId({ write: true })).toBeNull();
  });

  it("only counts for the admin who started it", async () => {
    await startViewAs("admin1", "user9");
    signedIn = "admin2";
    expect(await requireUserId()).toBe("admin2");
  });

  it("stops counting once that account is no longer an admin", async () => {
    await startViewAs("admin1", "user9");
    admins.delete("admin1");
    expect(await requireUserId()).toBe("admin1");
  });

  it("ignores a changed or forged pass", async () => {
    await startViewAs("admin1", "user9");
    const [, admin, exp, sig] = jar.get("vl_view_as")!.split(".");
    jar.set("vl_view_as", `someoneelse.${admin}.${exp}.${sig}`);
    expect(await requireUserId()).toBe("admin1");
    jar.set("vl_view_as", "user9.admin1.99999999999.bogus");
    expect(await requireUserId()).toBe("admin1");
  });

  it("expires after an hour", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
    await startViewAs("admin1", "user9");
    vi.setSystemTime(new Date("2026-11-13T11:00:30Z"));
    expect(await requireUserId()).toBe("admin1");
  });

  it("sends signed-out visitors to the login page", async () => {
    signedIn = null;
    await expect(requireUserId()).rejects.toThrow("redirect:/login");
    expect(await apiUserId()).toBeNull();
  });
});
