import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { addPageView, setPlanByUsername } from "./db";
import { DEMO, login, TEST_PASSWORD, uniqueName } from "./helpers";

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

test.beforeEach(async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await expect(page.getByRole("heading", { name: "Global dashboard" })).toBeVisible();
});

test("shows key numbers, chart, top performers and live panels", async ({ page }) => {
  await expect(page.getByRole("combobox", { name: "Time zone" })).toHaveText(/UTC/); // UTC by default
  for (const label of ["Total views", "Active links", "Avg views per link", "Growth"]) {
    await expect(page.getByRole("region", { name: "Key numbers" }).getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Performance overview")).toBeVisible();
  await expect(page.getByTestId("top-performers").getByText("/l/demo-vip")).toBeVisible();
  await expect(page.getByText("Real-time overview")).toBeVisible();
  await expect(page.getByTestId("live-feed").locator("li").first()).toBeVisible();
  // The demo account is on Free, so geography stays a Pro feature.
  await expect(page.getByText("Country maps are part of Tendril Pro.")).toBeVisible();
});

test("legend toggle hides and shows the chart legend", async ({ page }) => {
  await page.getByRole("button", { name: "Hide legend" }).click();
  await expect(page.getByRole("button", { name: "Show legend" })).toBeVisible();
});

test("date range and time zone controls update the view", async ({ page }) => {
  await page.getByRole("combobox", { name: "Date range" }).click();
  await page.getByRole("option", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.getByText("Views per day")).toBeVisible();

  await page.getByRole("combobox", { name: "Time zone" }).click();
  await page.getByRole("option", { name: /^UTC$/ }).click();
  await expect(page).toHaveURL(/tz=UTC/);
  await expect(page.getByRole("combobox", { name: "Time zone" })).toHaveText(/UTC/);

  await page.getByRole("button", { name: "Pick custom dates" }).click();
  const today = new Date();
  const day = (offset: number) => new Date(today.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Start").fill(day(5));
  await page.getByLabel("End").fill(day(2));
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(new RegExp(`range=custom&from=${day(5)}&to=${day(2)}`));
  await expect(page.getByText(`${day(5)} → ${day(2)}`).first()).toBeVisible();
});

test("export downloads a CSV of the current view", async ({ page }) => {
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^tendril-dashboard-24h-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile(await file.path(), "utf8");
  expect(csv).toContain('"Total views"');
  expect(csv).toContain('"/l/demo-vip"');
});

test("a smart-link visit shows up in the live feed", async ({ page }) => {
  const res = await page.request.get("/l/demo-shop", { maxRedirects: 0, headers: { "user-agent": CHROME_UA } });
  expect(res.status()).toBe(302);
  await expect
    .poll(async () => {
      const live = await (await page.request.get("/api/dashboard/live")).json();
      return live.recent[0]?.path;
    })
    .toBe("/l/demo-shop");
});

test("the live API requires sign-in", async ({ browser }) => {
  const anon = await browser.newContext();
  const res = await anon.request.get("/api/dashboard/live");
  expect(res.status()).toBe(401);
  expect((await anon.request.get("/api/dashboard/export")).status()).toBe(401);
  await anon.close();
});

test("numbers update in the background without reloading the page", async ({ page }) => {
  test.setTimeout(60_000);
  await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
  const total = page.getByRole("region", { name: "Key numbers" }).locator("p.font-heading").first();
  const before = Number((await total.innerText()).replace(/D/g, ""));
  await addPageView(DEMO.username);
  await expect.poll(async () => Number((await total.innerText()).replace(/D/g, "")), { timeout: 30_000, intervals: [2_000] }).toBe(before + 1);
  expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
});

test.describe("world map", () => {
  test("hovering a country shows its name and views for the selected range", async ({ page }) => {
    test.setTimeout(90_000);
    await page.context().clearCookies(); // sign out the demo account and use a fresh Pro account
    const name = uniqueName("geo");
    await page.goto("/signup");
    await page.getByLabel("Email").fill(`${name}@tendril.test`);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("Username").fill(name);
    await expect(page.getByText("Available")).toBeVisible();
    await page.getByRole("button", { name: "Claim and continue" }).click();
    await expect(page).toHaveURL(/\/dashboard\/editor/);
    await setPlanByUsername(name, "PRO");
    for (let i = 0; i < 3; i++) await addPageView(name, "BR");
    await addPageView(name, "MA");

    await page.goto("/dashboard?range=24h&tz=UTC");
    const totals = page.getByTestId("geo-totals");
    await expect(totals).toContainText("Countries: 2");
    await expect(totals).toContainText("Total views: 4");
    await page.locator('path[data-country="076"]').hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toContainText("Brazil");
    await expect(tip).toContainText("Total: 3 views");
    await page.locator('path[data-country="504"]').hover();
    await expect(tip).toContainText("Morocco");
    await expect(tip).toContainText("Total: 1 view");
  });
});
