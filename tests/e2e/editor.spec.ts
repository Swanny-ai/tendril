import { expect, test, type Page } from "@playwright/test";
import { TEST_PASSWORD, uniqueName } from "./helpers";

async function newCreator(page: Page) {
  const name = uniqueName("ed");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);
  return name;
}

const saved = (page: Page) => expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
const preview = (page: Page) => page.getByLabel("Live preview of your page");

test("edit links, add blocks, reorder, theme: preview and public page update", async ({ page }) => {
  const username = await newCreator(page);

  // Edit the starter link
  await page.getByRole("button", { name: "Expand" }).nth(1).click();
  await page.getByLabel("Title", { exact: true }).fill("My shop");
  await page.getByLabel("Destination URL").fill("shop.example.com/me");
  await page.getByLabel("Destination URL").press("Enter");
  await saved(page);
  await expect(page.getByLabel("Destination URL")).toHaveValue("shop.example.com/me");
  await expect(page.getByText("https://shop.example.com/me")).toBeVisible();
  await expect(preview(page).getByText("My shop")).toBeVisible();

  // Rejects dangerous URLs
  await page.getByLabel("Destination URL").fill("javascript:alert(1)");
  await page.getByLabel("Destination URL").press("Enter");
  await expect(page.getByText("Only http and https links are allowed")).toBeVisible();
  await page.getByLabel("Destination URL").fill("https://shop.example.com/me");
  await page.getByLabel("Destination URL").press("Enter");

  // Content warning
  await page.getByRole("switch", { name: "Content warning" }).click();
  await saved(page);
  await expect(preview(page).getByText("Sensitive")).toBeVisible();

  // Add a text block
  await page.getByRole("button", { name: "Add block" }).click();
  await page.getByRole("menuitem", { name: /Text/ }).click();
  await expect(page.getByText("3 / 12 blocks")).toBeVisible();
  await page.getByLabel("Text", { exact: true }).fill("Commissions open in June.");
  await saved(page);
  await expect(preview(page).getByText("Commissions open in June.")).toBeVisible();

  // Reorder with the keyboard: move the text block to the top (collapsed cards first)
  for (const btn of await page.getByRole("button", { name: "Collapse" }).all()) await btn.click();
  await page.getByRole("button", { name: "Reorder Text" }).focus();
  for (const key of ["Space", "ArrowUp", "ArrowUp", "Space"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250); // let dnd-kit measure and animate between steps
  }
  await saved(page);
  await expect(page.getByRole("button", { name: /^Reorder / }).first()).toHaveAccessibleName("Reorder Text");

  // Theme
  await page.getByRole("tab", { name: "Theme" }).click();
  await expect(page.getByRole("button", { name: /Mono/ })).toBeDisabled();
  await page.getByRole("button", { name: /Sunset/ }).click();
  await saved(page);

  // Profile
  await page.getByRole("tab", { name: "Profile" }).click();
  await page.getByLabel("Display name").fill("E2E Creator");
  await page.getByLabel("Bio").fill("Testing every flow.");
  await saved(page);

  // Public page reflects everything, in order
  await page.goto(`/${username}`);
  await expect(page.getByRole("heading", { name: "E2E Creator" })).toBeVisible();
  await expect(page.getByText("Testing every flow.")).toBeVisible();
  const order = await page.locator("main").getByText(/Commissions open in June\.|My shop|Welcome to my page/).allInnerTexts();
  expect(order.map((t) => t.replace(/\s+/g, " ").trim().split(" ")[0])).toEqual(["Commissions", "WELCOME", "My"]);
  await expect(page).toHaveTitle("E2E Creator | Tendril");
});

test("deleting a block can be undone", async ({ page }) => {
  await newCreator(page);
  await page.getByRole("button", { name: "Expand" }).first().click();
  await page.getByRole("button", { name: "Delete block" }).click();
  await expect(page.getByText("1 / 12 blocks")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("2 / 12 blocks")).toBeVisible();
});

test("free plan block limit is enforced", async ({ page }) => {
  await newCreator(page);
  for (let i = 0; i < 10; i++) {
    await page.getByRole("button", { name: "Add block" }).click();
    await page.getByRole("menuitem", { name: /Section header/ }).click();
    await expect(page.getByText(`${3 + i} / 12 blocks`)).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Add block" })).toBeDisabled();
  await expect(page.getByText(/reached the 12-block limit/)).toBeVisible();
});
