import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { connectDomain, setPlanByUsername } from "./db";
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

test("each template creates its own page with its own link", async ({ page }) => {
  const name = await newCreator(page);
  await page.getByRole("link", { name: "Templates" }).click();
  await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();
  for (const t of ["Pro Card", "Personal Card", "Spotlight Card", "Modern Card", "Simple Stack"]) {
    await expect(page.getByRole("heading", { name: t })).toBeVisible();
  }

  await page.getByRole("button", { name: "Use the Spotlight Card template" }).click();
  const dialog = page.getByRole("dialog", { name: "New page with Spotlight Card" });
  const spot = `${name.slice(0, 18)}_spot`;
  await dialog.getByLabel("Page link").fill(spot);
  await expect(dialog.getByText("Available")).toBeVisible();
  await dialog.getByRole("button", { name: "Create page" }).click();
  await expect(page).toHaveURL(/\/dashboard\/editor/);
  await expect(page.getByRole("button", { name: `Editing page /${spot}. Switch page` })).toBeVisible();

  // The new page has its own link; the first page is untouched.
  const first = await page.request.get(`/${name}`);
  expect(await first.text()).toContain("My first link");
  await page.goto(`/${spot}`);
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
  await page.goto(`/${spot}`);
  await expect(page.locator('img[src="/templates/pro-card.jpg"]')).toHaveCount(1);

  // Switch back to the first page from the header.
  await page.goto("/dashboard/editor");
  await page.getByRole("button", { name: `Editing page /${spot}. Switch page` }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^/${name}(?!_)`) }).click();
  await expect(page.getByRole("button", { name: `Editing page /${name}. Switch page` })).toBeVisible();

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
  await page.getByRole("button", { name: "Apply to the page I'm editing instead" }).click();
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

test("custom domains: add, see DNS steps, use on a link, and serve links on that domain", async ({ page }) => {
  const name = await newCreator(page);

  // Free accounts see the upgrade prompt.
  await page.goto("/dashboard/domains");
  await expect(page.getByText("Custom domains are part of Pro.")).toBeVisible();

  await setPlanByUsername(name, "PRO");
  await page.reload();
  const pending = `links-${name.replace(/_/g, "-")}.example.com`;
  await page.getByLabel("Domain").fill(`https://${pending}/whatever`);
  await page.getByRole("button", { name: "Add domain" }).click();
  await expect(page.getByRole("list", { name: "Your domains" }).getByText(pending, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Waiting for DNS")).toBeVisible();
  await expect(page.getByRole("cell", { name: "CNAME" })).toBeVisible();
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText(/No DNS record found yet|Not pointing at Tendril yet/)).toBeVisible();

  // A connected domain can be picked for a smart link, and serves it.
  const host = `go-${name.replace(/_/g, "-")}.test`;
  await connectDomain(name, host);
  const slug = uniqueName("dom").replace(/_/g, "-");
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Link name").fill(slug);
  await page.getByLabel("Domain").selectOption({ label: `${host}/` });
  await page.getByLabel("Destination URL").fill("https://example.com/shop");
  await page.getByRole("switch", { name: "Adult content warning" }).click();
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  await expect(page.getByRole("link", { name: `${host}/${slug}` })).toBeVisible();

  const onDomain = await page.request.get(`/${slug}`, { maxRedirects: 0, headers: { host } });
  expect(onDomain.status()).toBe(302);
  expect(onDomain.headers()["location"]).toBe("https://example.com/shop");
  // Someone else's link doesn't resolve on this domain.
  expect((await page.request.get("/demo-shop", { maxRedirects: 0, headers: { host } })).status()).toBe(404);
  // The domain's home page shows the creator's bio page.
  const home = await page.request.get("/", { headers: { host } });
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain(name);
});

test("verified badge: Pro creators switch it on, Free sees it locked", async ({ page }) => {
  const name = await newCreator(page);
  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(page.getByText("The blue check is part of Pro.")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Show verified badge" })).toBeDisabled();

  await setPlanByUsername(name, "PRO");
  await page.reload();
  await page.getByRole("tab", { name: "Profile" }).click();
  const toggle = page.getByRole("switch", { name: "Show verified badge" });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto(`/${name}`);
  await expect(page.getByRole("heading", { level: 1 }).getByRole("img", { name: "Verified" })).toBeVisible();

  await page.goto("/dashboard/editor");
  await page.getByRole("tab", { name: "Profile" }).click();
  await page.getByRole("switch", { name: "Show verified badge" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto(`/${name}`);
  await expect(page.getByRole("img", { name: "Verified" })).toHaveCount(0);
});

test("verified badge: pages the site owner verifies keep it on the Free plan", async ({ page }) => {
  const name = await newCreator(page);
  execFileSync(process.execPath, ["scripts/verify-page.mjs", name], { env: { ...process.env, APP_URL: "", CRON_SECRET: "" } });
  await page.reload();
  await page.getByRole("tab", { name: "Profile" }).click();
  const toggle = page.getByRole("switch", { name: "Show verified badge" });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto(`/${name}`);
  await expect(page.getByRole("img", { name: "Verified" })).toBeVisible();
});
