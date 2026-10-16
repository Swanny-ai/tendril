import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { DEMO, login, TEST_PASSWORD, uniqueName } from "./helpers";

async function newCreator(page: Page) {
  const name = uniqueName("sl");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/dashboard\/editor/);
  return name;
}

async function createLink(page: Page, slug: string, destination: string, template?: string) {
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Link name").fill(slug);
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
  await page.getByLabel("Destination URL").fill(destination);
  if (template) await page.getByRole("radio", { name: template }).click();
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
}

test("adult warning is on by default, with 13 designs and a live preview", async ({ page }) => {
  await newCreator(page);
  await page.goto("/dashboard/links/new");
  await expect(page.getByRole("switch", { name: "Adult content warning" })).toBeChecked();
  await expect(page.getByRole("radiogroup", { name: "Warning page design" }).getByRole("radio")).toHaveCount(13);
  await expect(page.getByRole("radio", { name: "Dusk" })).toHaveAttribute("aria-checked", "true");

  const preview = page.getByLabel("Warning page preview");
  await expect(preview.getByText("Adults only")).toBeVisible();
  await page.getByLabel("Destination URL").fill("example.com/vip");
  await expect(preview.getByText("example.com")).toBeVisible();
  await page.getByRole("radio", { name: "Sorbet" }).click();
  await expect(page.getByRole("radio", { name: "Sorbet" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Desktop" }).click();
  await expect(preview).toBeVisible();

  // Free plan: custom wording and badge removal are locked
  await expect(page.getByLabel("Title")).toBeDisabled();
  await expect(page.getByRole("switch", { name: "Show Made with badge" })).toBeDisabled();
});

test("visitors see the warning, can continue or leave, and stats count it", async ({ page, browser }) => {
  await newCreator(page);
  const slug = uniqueName("vip").replace(/_/g, "-");
  await createLink(page, slug, "https://example.com/vip", "Sorbet");
  await expect(page.getByRole("cell", { name: new RegExp(`/l/${slug}`) }).first()).toBeVisible();
  await expect(page.getByText("18+ · Sorbet")).toBeVisible();

  // Visitor flow (separate, signed-out browser)
  const visitor = await browser.newContext({ locale: "en-US" });
  const v = await visitor.newPage();
  const first = await v.request.get(`/l/${slug}`, { maxRedirects: 0 });
  expect(first.status()).toBe(302);
  expect(first.headers()["location"]).toBe(`/l/${slug}/warning`);

  await v.goto(`/l/${slug}`);
  await expect(v).toHaveURL(new RegExp(`/l/${slug}/warning$`));
  await expect(v.getByRole("heading", { name: "Adults only" })).toBeVisible();
  await expect(v.getByText("example.com")).toBeVisible();
  await expect(v.getByText("Made with Tendril")).toBeVisible();

  const cont = await v.getByTestId("warning-continue").getAttribute("href");
  const go = await v.request.get(cont!, { maxRedirects: 0 });
  expect(go.status()).toBe(302);
  expect(go.headers()["location"]).toBe("https://example.com/vip");

  await v.getByRole("link", { name: "Take me back" }).click();
  await expect(v.getByRole("heading", { name: "No problem" })).toBeVisible();
  await visitor.close();

  // Spanish visitors get Spanish wording
  const es = await browser.newContext({ locale: "es-ES", extraHTTPHeaders: { "accept-language": "es-ES,es;q=0.9" } });
  const e = await es.newPage();
  await e.goto(`/l/${slug}/warning`);
  await expect(e.getByRole("heading", { name: "Solo para adultos" })).toBeVisible();
  await es.close();

  // Stats on the dashboard
  await page.goto("/dashboard/links");
  const row = page.getByRole("row", { name: new RegExp(`/l/${slug}`) });
  await expect(row.getByRole("cell").nth(2)).not.toHaveText("0");
  await expect(row.getByRole("cell").nth(4)).toHaveText("1");
});

test("turning the warning off redirects straight away; pausing makes the link 404", async ({ page }) => {
  await newCreator(page);
  const slug = uniqueName("direct").replace(/_/g, "-");
  await createLink(page, slug, "https://example.com/direct");
  await page.getByRole("link", { name: `/l/${slug}` }).click();
  await page.getByRole("switch", { name: "Adult content warning" }).click();
  await expect(page.getByText("Visitors will be sent straight to your destination")).toBeVisible();
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);

  const direct = await page.request.get(`/l/${slug}`, { maxRedirects: 0 });
  expect(direct.headers()["location"]).toBe("https://example.com/direct");
  expect((await page.request.get(`/l/${slug}/warning`)).status()).toBe(404);

  await page.getByRole("switch", { name: "Pause link" }).click();
  await expect(page.getByText("Paused")).toBeVisible();
  expect((await page.request.get(`/l/${slug}`, { maxRedirects: 0 })).status()).toBe(404);
});

test("free plan allows 3 smart links; names are validated", async ({ page }) => {
  await newCreator(page);
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Link name").fill("demo-vip");
  await expect(page.getByText("That link name is taken")).toBeVisible();
  await page.getByLabel("Link name").fill("warning");
  await expect(page.getByText("That name is reserved")).toBeVisible();
  await page.getByLabel("Link name").fill("ok-name-1");
  await page.getByLabel("Destination URL").fill("javascript:alert(1)");
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page.getByRole("main").getByText("Only http and https links are allowed")).toBeVisible();

  for (let i = 1; i <= 3; i++) await createLink(page, `${uniqueName("cap").replace(/_/g, "-")}-${i}`, `https://example.com/${i}`);
  await expect(page.getByText("3 / 3 used")).toBeVisible();
  await expect(page.getByRole("link", { name: "Upgrade for more links" })).toBeVisible();
  await page.goto("/dashboard/links/new");
  await expect(page.getByText(/used all 3 deep links/)).toBeVisible();
});

test("bio-page content warnings can use a warning template", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await page.goto("/dashboard/editor");
  await page.getByRole("tab", { name: "Theme" }).click();
  await page.getByRole("combobox", { name: "Content-warning page style" }).click();
  await page.getByRole("option", { name: "Night & Gold" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  await page.goto(`/${DEMO.username}`);
  await page.getByRole("link", { name: /After-dark sketchbook/ }).click();
  await expect(page.getByRole("heading", { name: "Adults only" })).toBeVisible();
  await expect(page.getByText("A link from Demo Creator")).toBeVisible();

  // Restore the default for other tests
  await page.goto("/dashboard/editor");
  await page.getByRole("tab", { name: "Theme" }).click();
  await page.getByRole("combobox", { name: "Content-warning page style" }).click();
  await page.getByRole("option", { name: "Match my page theme" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
});

test("Clear Blue template renders the reference age gate", async ({ page, browser }) => {
  await newCreator(page);
  const slug = uniqueName("blue").replace(/_/g, "-");
  await createLink(page, slug, "https://example.com/blue", "Clear Blue");
  const visitor = await browser.newContext({ locale: "en-US" });
  const v = await visitor.newPage();
  await v.goto(`/l/${slug}/warning`);
  await expect(v.getByRole("heading", { name: "Age Restricted" })).toBeVisible();
  await expect(v.getByText("This platform is restricted to 18+ users. Confirm your age to continue.")).toBeVisible();
  const button = v.getByTestId("warning-continue");
  await expect(button).toHaveText("Yes, I'm 18+");
  await expect(button).toHaveCSS("text-transform", "uppercase");
  await expect(button).toHaveCSS("background-color", "rgb(0, 175, 240)");
  await expect(v.getByRole("link", { name: "Take me back" })).toHaveCount(0);
  await visitor.close();
});

test("each smart link has a QR code with PNG and SVG downloads", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await page.goto("/dashboard/links");
  await page.getByRole("button", { name: /QR code for .*\/l\/demo-vip$/ }).click();
  await expect(page.getByRole("img", { name: /QR code for .*\/l\/demo-vip$/ })).toBeVisible();
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG" }).click();
  expect((await png).suggestedFilename()).toBe("qr-demo-vip.png");
  const svgDl = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG" }).click();
  const svg = await svgDl;
  expect(svg.suggestedFilename()).toBe("qr-demo-vip.svg");
  expect(await readFile(await svg.path(), "utf8")).toContain("<svg");

  await page.goto("/dashboard/links");
  await page.getByRole("link", { name: "Edit link" }).first().click();
  await expect(page.getByRole("heading", { name: /^Edit \/l\// })).toBeVisible();
  await expect(page.getByRole("button", { name: /QR code for .*\/l\/demo-/ }).filter({ hasText: "QR code" })).toBeVisible();
});
