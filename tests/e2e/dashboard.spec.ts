import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers";

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

test.beforeEach(async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await expect(page.getByRole("heading", { name: "Global dashboard" })).toBeVisible();
});

test("shows key numbers, chart, top performers and live panels", async ({ page }) => {
  await expect(page).toHaveURL(/tz=/); // defaults to the browser's own time zone
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
