import { expect, test, type Page } from "@playwright/test";
import { TEST_PASSWORD, uniqueName } from "./helpers";

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function newCreator(page: Page) {
  const name = uniqueName("tpl");
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

test("the templates gallery applies a template, with sample links on an empty page", async ({ page }) => {
  const name = await newCreator(page);
  await page.getByRole("link", { name: "Templates" }).click();
  await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();
  for (const t of ["Pro Card", "Personal Card", "Spotlight Card", "Modern Card", "Simple Stack"]) {
    await expect(page.getByRole("heading", { name: t })).toBeVisible();
  }

  await page.getByRole("button", { name: "Use the Spotlight Card template" }).click();
  await expect(page).toHaveURL(/\/dashboard\/editor/);

  await page.goto(`/${name}`);
  await expect(page.getByRole("link", { name: /My exclusive page/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chat with me" })).toBeVisible();
  await expect(page.getByRole("timer")).toContainText("50% off ends in");
  await expect(page.locator('img[src="/templates/spotlight.jpg"]')).toHaveCount(1); // sample art until a cover is added

  // Switch from the editor's Theme tab; the public page follows.
  await page.goto("/dashboard/editor");
  await page.getByRole("tab", { name: "Theme" }).click();
  await page.getByRole("combobox", { name: "Page template" }).click();
  await page.getByRole("option", { name: "Pro Card" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto(`/${name}`);
  await expect(page.locator('img[src="/templates/pro-card.jpg"]')).toHaveCount(1);

  // Back to classic from the gallery.
  await page.goto("/dashboard/templates");
  await page.getByRole("button", { name: "Back to the classic layout" }).click();
  await expect(page.getByRole("button", { name: "Back to the classic layout" })).toHaveCount(0);
});

test("cover photo, video embed and countdown blocks", async ({ page }) => {
  const name = await newCreator(page);

  // Cover photo
  await page.getByRole("tab", { name: "Profile" }).click();
  await page.getByLabel("Cover photo file").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("img", { name: "Your cover photo" })).toBeVisible();
  await page.getByLabel("Tagline").fill("Painter · Lisbon");

  // Video embed
  await page.getByRole("tab", { name: "Blocks" }).click();
  await page.getByRole("button", { name: "Add block" }).click();
  await page.getByRole("menuitem", { name: /Video or music/ }).click();
  await page.getByLabel("Video or music link").fill("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  await page.getByLabel("Video or music link").press("Enter");

  // Countdown
  await page.getByRole("button", { name: "Add block" }).click();
  await page.getByRole("menuitem", { name: /Countdown/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  // Use a photo template so the cover shows.
  await page.goto("/dashboard/templates");
  await page.getByRole("button", { name: "Use the Modern Card template" }).click();
  await expect(page).toHaveURL(/\/dashboard\/editor/);

  await page.goto(`/${name}`);
  const cover = page.locator('img[src^="/media/"]').first();
  await expect(cover).toBeVisible();
  const res = await page.request.get((await cover.getAttribute("src"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  await expect(page.getByText("Painter · Lisbon")).toBeVisible();
  await expect(page.locator('iframe[src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ"]')).toHaveCount(1);
  await expect(page.getByRole("timer")).toContainText("Offer ends in");
});

test("embeds only accept YouTube and Spotify links", async ({ page }) => {
  await newCreator(page);
  await page.getByRole("button", { name: "Add block" }).click();
  await page.getByRole("menuitem", { name: /Video or music/ }).click();
  await page.getByLabel("Video or music link").fill("https://example.com/video");
  await page.getByLabel("Video or music link").press("Enter");
  await expect(page.getByText("Paste a YouTube or Spotify link.")).toBeVisible();
});
