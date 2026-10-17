import { expect, test } from "@playwright/test";
import { DEMO } from "./helpers";

// Seeded destinations use example.com (an IANA-reserved demo domain). Playwright cannot
// intercept requests that come from a redirect, so we assert URLs and Location headers.

test("public page renders with SEO metadata", async ({ page }) => {
  const res = await page.goto(`/${DEMO.username}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Demo Creator" })).toBeVisible();
  await expect(page).toHaveTitle("Demo Creator | Tendril");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Demo Creator");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/demo$/);
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain("\"@type\":\"ProfilePage\"");
  await expect(page.getByRole("link", { name: "Spring glaze collection" })).toHaveAttribute("href", /^\/go\//);
  const og = await page.request.get(`/${DEMO.username}/opengraph-image`);
  expect(og.headers()["content-type"]).toBe("image/png");
});

test("unknown usernames get a 404 with a claim prompt", async ({ page }) => {
  const res = await page.goto("/no-such-creator-xyz");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("No page here yet")).toBeVisible();
});

test("clicking a link redirects through /go", async ({ page }) => {
  await page.goto(`/${DEMO.username}`);
  const link = page.getByRole("link", { name: "Spring glaze collection" });
  const href = await link.getAttribute("href");
  const res = await page.request.get(href!, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe("https://example.com/shop");
  expect(res.headers()["cache-control"]).toContain("no-store");
  await link.click();
  await expect(page).toHaveURL("https://example.com/shop");
});

test("content-warning links open an 18+ popup on the page first", async ({ page }) => {
  await page.goto(`/${DEMO.username}`);
  const link = page.getByRole("link", { name: /After-dark sketchbook/ });
  const href = (await link.getAttribute("href")) ?? "";
  await link.click();
  // The popup opens over the page; the address doesn't change.
  const popup = page.getByRole("dialog", { name: /Adult content warning/ });
  await expect(popup).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${DEMO.username}$`));

  await popup.getByRole("button", { name: "Cancel" }).click();
  await expect(popup).toBeHidden();

  // Opening the link's own address directly still shows the full warning page.
  await page.goto(href);
  await expect(page).toHaveURL(/\/go\/.+\/warning$/);
  await expect(page.getByRole("heading", { name: "Before you continue" })).toBeVisible();

  await page.goto(`/${DEMO.username}`);
  await page.getByRole("link", { name: /After-dark sketchbook/ }).click();
  await page.getByRole("dialog").getByRole("link", { name: "I'm 18+, continue" }).click();
  await expect(page).toHaveURL("https://example.com/sketchbook");
});

test("in-app browsers see an 'open in browser' tip", async ({ browser }) => {
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85",
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  await page.goto(`/${DEMO.username}`);
  const tip = page.getByRole("note");
  await expect(tip).toContainText("Instagram");
  await page.getByRole("button", { name: "Dismiss tip" }).click();
  await expect(tip).toBeHidden();
  await ctx.close();

  const normal = await browser.newPage();
  await normal.goto(`/${DEMO.username}`);
  await expect(normal.getByRole("note")).toHaveCount(0);
  await normal.close();
});
