import { expect, test, type Page } from "@playwright/test";
import { DEMO, TEST_PASSWORD, uniqueName } from "./helpers";

// Simulated visitors inside Instagram's built-in browser.
const IG_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0";
const IG_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0";
/** Where an instagram://extbrowser/?url=... link sends the visitor. */
const extTarget = (href: string) => (href.startsWith("instagram://extbrowser/?url=") ? decodeURIComponent(href.slice("instagram://extbrowser/?url=".length)) : "");

const TIKTOK_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.0 BytedanceWebview";
const FB_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]";
const PHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

async function newCreatorWithLink(page: Page, warning = false) {
  const name = uniqueName("dl");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);

  const slug = uniqueName("deep").replace(/_/g, "-");
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Link name").fill(slug);
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
  await page.getByLabel("Destination URL").fill("https://example.com/shop");
  await expect(page.getByRole("switch", { name: "Open in phone browser" })).toBeChecked(); // on by default
  if (!warning) await page.getByRole("switch", { name: "Adult content warning" }).click();
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  return { name, slug };
}

test("smart links: in-app visitors get the open-in-browser step, others go straight through", async ({ page, browser }) => {
  const { name, slug } = await newCreatorWithLink(page);

  const inApp = await page.request.get(`/l/${slug}`, { maxRedirects: 0, headers: { "user-agent": IG_IOS } });
  expect(inApp.status()).toBe(302);
  expect(inApp.headers()["location"]).toBe(`/l/${slug}/open`);

  const outside = await page.request.get(`/l/${slug}`, { maxRedirects: 0, headers: { "user-agent": PHONE_SAFARI } });
  expect(outside.headers()["location"]).toBe("https://example.com/shop");

  const escaped = await page.request.get(`/l/${slug}?ib=1`, { maxRedirects: 0, headers: { "user-agent": IG_IOS } });
  expect(escaped.headers()["location"]).toBe("https://example.com/shop");

  // Step 2 page, as an iPhone visitor in Instagram sees it.
  const ctx = await browser.newContext({ userAgent: IG_IOS, viewport: { width: 390, height: 844 } });
  const visitor = await ctx.newPage();
  await visitor.goto(`/l/${slug}/open`);
  await expect(visitor.getByRole("heading", { name })).toBeVisible();
  await expect(visitor.getByText("You're in Instagram's built-in browser.")).toBeVisible();
  await expect(visitor.getByRole("link", { name: "Continue here instead" })).toHaveAttribute("href", `/l/${slug}?ib=1`);
  const open = visitor.getByRole("link", { name: "Open in Safari" });
  const safariHref = (await open.getAttribute("href")) ?? "";
  expect(extTarget(safariHref).endsWith(`/l/${slug}?ib=1`)).toBe(true); // Instagram's own "open in browser" link
  // The test browser can't open Safari, so the manual steps appear.
  await open.click();
  await expect(visitor.getByText("Didn't open?")).toBeVisible();
  await ctx.close();

  // Turning the option off sends in-app visitors straight to the destination.
  await page.getByRole("link", { name: `/l/${slug}` }).click();
  await page.getByRole("switch", { name: "Open in phone browser" }).click();
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  const off = await page.request.get(`/l/${slug}`, { maxRedirects: 0, headers: { "user-agent": IG_IOS } });
  expect(off.headers()["location"]).toBe("https://example.com/shop");
  expect((await page.request.get(`/l/${slug}/open`)).status()).toBe(404);
});

test("android visitors get an intent link to their default browser", async ({ browser, page }) => {
  const { slug } = await newCreatorWithLink(page);
  const ctx = await browser.newContext({ userAgent: IG_ANDROID, viewport: { width: 412, height: 900 } });
  const visitor = await ctx.newPage();
  await visitor.goto(`/l/${slug}/open`);
  // The button gets its Android intent address once the page has loaded on the phone.
  const openButton = visitor.getByRole("link", { name: "Open in browser" });
  await expect(openButton).toHaveAttribute("href", /^intent:\/\//);
  const intent = (await openButton.getAttribute("href")) ?? "";
  expect(intent.startsWith("intent://")).toBe(true);
  expect(intent).toContain(`/l/${slug}?ib=1#Intent;scheme=http`);
  expect(intent).toContain("S.browser_fallback_url=");
  await ctx.close();
});

test("bio page: link taps inside Instagram try the phone browser first", async ({ browser }) => {
  const ctx = await browser.newContext({ userAgent: IG_IOS, viewport: { width: 390, height: 844 } });
  const visitor = await ctx.newPage();
  await visitor.goto(`/${DEMO.username}`);
  const firstLink = visitor.locator('a[href^="/go/"]').first();
  const href = await firstLink.getAttribute("href");
  await firstLink.click();
  // Still on the bio page (the test browser can't open Safari), with steps and a way to continue.
  await expect(visitor.getByRole("dialog", { name: "Open in your browser" })).toBeVisible();
  await expect(visitor).toHaveURL(new RegExp(`/${DEMO.username}$`));
  await expect(visitor.getByRole("link", { name: "Continue here instead" })).toHaveAttribute("href", href ?? "");
  await ctx.close();
});

test("18+ links: the warning shows inside Instagram and confirming opens the default browser", async ({ page, browser }) => {
  const { slug } = await newCreatorWithLink(page, true);

  // In-app visitors go straight to the warning (no extra page).
  const inApp = await page.request.get(`/l/${slug}`, { maxRedirects: 0, headers: { "user-agent": IG_IOS } });
  expect(inApp.headers()["location"]).toBe(`/l/${slug}/warning`);

  // iPhone in Instagram: "I'm 18+" points at Safari, landing on the destination via ok=1.
  const ios = await browser.newContext({ userAgent: IG_IOS, viewport: { width: 390, height: 844 } });
  const iosPage = await ios.newPage();
  await iosPage.goto(`/l/${slug}/warning`);
  const confirm = iosPage.getByRole("link", { name: /18 or older|I'm 18+/i });
  const safariHref = (await confirm.getAttribute("href")) ?? "";
  expect(extTarget(safariHref).endsWith(`/l/${slug}?ok=1&ib=1`)).toBe(true); // Instagram's own "open in browser" link
  await confirm.click();
  await expect(iosPage.getByRole("dialog", { name: "Open in your browser" })).toBeVisible(); // test browser can't open Safari
  await expect(iosPage.getByRole("link", { name: "Continue here instead" })).toHaveAttribute("href", `/l/${slug}?ok=1&ib=1`);
  await ios.close();

  // Android in Instagram: an intent link to the default browser.
  const android = await browser.newContext({ userAgent: IG_ANDROID });
  const androidPage = await android.newPage();
  await androidPage.goto(`/l/${slug}/warning`);
  const intent = (await androidPage.getByRole("link", { name: /18 or older|I'm 18+/i }).getAttribute("href")) ?? "";
  expect(intent.startsWith("intent://")).toBe(true);
  expect(intent).toContain(`/l/${slug}?ok=1&ib=1#Intent;`);
  await android.close();

  // In Safari itself the button is a normal link, and it lands on the destination.
  const safari = await browser.newContext({ userAgent: PHONE_SAFARI });
  const safariPage = await safari.newPage();
  await safariPage.goto(`/l/${slug}/warning`);
  await expect(safariPage.getByRole("link", { name: /18 or older|I'm 18+/i })).toHaveAttribute("href", `/l/${slug}?ok=1`);
  await safari.close();
  const landed = await page.request.get(`/l/${slug}?ok=1&ib=1`, { maxRedirects: 0, headers: { "user-agent": PHONE_SAFARI } });
  expect(landed.headers()["location"]).toBe("https://example.com/shop");
});

test("bio page: links with a content warning show it inside Instagram, then open the default browser", async ({ browser }) => {
  const ctx = await browser.newContext({ userAgent: IG_IOS, viewport: { width: 390, height: 844 } });
  const visitor = await ctx.newPage();
  await visitor.goto(`/${DEMO.username}`);
  const warned = visitor.locator('a[href^="/go/"][data-warning]').first();
  const href = (await warned.getAttribute("href")) ?? "";
  await warned.click();
  await expect(visitor).toHaveURL(new RegExp(`/${DEMO.username}$`)); // popup over the page, still in the app
  const confirm = visitor.getByRole("dialog").getByRole("link", { name: /18\+/ });
  const target = (await confirm.getAttribute("href")) ?? "";
  expect(extTarget(target).endsWith(`${href}?ok=1`)).toBe(true);
  await ctx.close();
});

test("TikTok on iPhone: bio page links offer press-and-hold to open the browser", async ({ browser }) => {
  const ctx = await browser.newContext({ userAgent: TIKTOK_IOS, viewport: { width: 390, height: 844 } });
  const visitor = await ctx.newPage();
  await visitor.goto(`/${DEMO.username}`);
  const link = visitor.locator('a[href^="/go/"]:not([data-warning])').first();
  const href = (await link.getAttribute("href")) ?? "";
  await expect(async () => {
    await link.click();
    await expect(visitor.getByRole("dialog", { name: "Open in your browser" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(visitor).toHaveURL(new RegExp(`/${DEMO.username}$`)); // stayed on the page
  const holdLink = visitor.getByRole("link", { name: "Press and hold here" });
  expect(await holdLink.getAttribute("href")).toMatch(new RegExp(`^https?://[^/]+${href}$`));
  await holdLink.click(); // a tap does nothing: it must be pressed and held
  await expect(visitor).toHaveURL(new RegExp(`/${DEMO.username}$`));
  await expect(visitor.getByRole("link", { name: "Continue here instead" })).toHaveAttribute("href", href);
  await ctx.close();
});

test("Facebook on iPhone: an 18+ deep link's confirm button becomes press-and-hold", async ({ page, browser }) => {
  const { slug } = await newCreatorWithLink(page, true);
  const ctx = await browser.newContext({ userAgent: FB_IOS, viewport: { width: 390, height: 844 } });
  const visitor = await ctx.newPage();
  await visitor.goto(`/l/${slug}/warning`);
  const confirm = visitor.getByRole("link", { name: /18 or older|I'm 18\+/i });
  await expect(confirm).toHaveAttribute("href", `/l/${slug}?ok=1`);
  await expect(async () => {
    await confirm.click();
    await expect(visitor.getByRole("dialog", { name: "Open in your browser" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(visitor).toHaveURL(new RegExp(`/l/${slug}/warning$`));
  expect(await visitor.getByRole("link", { name: "Press and hold here" }).getAttribute("href")).toMatch(new RegExp(`/l/${slug}\\?ok=1&ib=1$`));
  await ctx.close();
});
