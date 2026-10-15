import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DEMO, login } from "./helpers";

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${label} has serious accessibility issues`).toEqual([]);
}

test("public pages have no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await audit(page, "landing");
  await page.goto(`/${DEMO.username}`);
  await audit(page, "public page");
  const href = await page.getByRole("link", { name: /After-dark/ }).getAttribute("href");
  await page.goto(`${href}/warning`);
  await audit(page, "warning page");
  await page.goto("/login");
  await audit(page, "login");
  await page.goto("/forgot-password");
  await audit(page, "forgot password");
  await page.goto("/reset-password");
  await audit(page, "reset password (expired)");
  await page.goto("/no-such-creator-xyz");
  await audit(page, "404");
});

test("dashboard pages have no serious accessibility violations", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await expect(page).toHaveURL(/tz=/); // the dashboard settles on the browser's time zone first
  await page.waitForLoadState("networkidle");
  await audit(page, "overview");
  for (const path of ["/dashboard", "/dashboard/editor", "/dashboard/analytics", "/dashboard/billing", "/dashboard/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await audit(page, path);
  }
});

test("public page works at phone width without horizontal scroll", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  for (const path of ["/", `/${DEMO.username}`, "/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls horizontally`).toBeLessThanOrEqual(0);
  }
  await ctx.close();
});
