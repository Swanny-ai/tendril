import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { connectDomain, pageSummary, removeShowcase, setPlanByUsername, showcaseTemplate } from "./db";
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
  await expect(page).toHaveURL(/\/edit\/template\//);
  return name;
}

test("each template creates its own page with its own link", async ({ page }) => {
  const name = await newCreator(page);
  await page.getByRole("navigation", { name: "Dashboard" }).first().getByRole("link", { name: "Templates" }).click();
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
  await expect(page).toHaveURL(/\/edit\/template\//);
  await expect(page.getByText(new RegExp(`/${spot}$`)).first()).toBeVisible();

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

  // The @username a template shows can be changed or hidden (the page's link stays).
  await page.goto("/dashboard/editor");
  await expect(page).toHaveURL(new RegExp(`/edit/template/.+/${spot}$`));
  await page.getByRole("tab", { name: "Profile" }).click();
  const handleField = page.getByLabel("Username on page", { exact: true });
  await expect(handleField).toBeEditable();
  await handleField.fill("spot.handle");
  await expect(handleField).toHaveValue("spot.handle");
  await expect(page.getByRole("status").filter({ hasText: "Saving" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect.poll(async () => (await page.request.get(`/${spot}`)).text()).toContain("spot.handle");
  await page.getByRole("switch", { name: "Show username on page" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect.poll(async () => (await page.request.get(`/${spot}`)).text()).not.toContain("spot.handle");

  // Templates lists every page with its own link; Edit opens that page in the editor.
  await page.goto("/dashboard/templates");
  const yours = page.getByRole("list", { name: "Your pages" });
  await expect(yours.getByText(new RegExp(`/${spot}$`))).toBeVisible();
  await expect(yours.getByText(new RegExp(`/${name}$`))).toBeVisible();
  await yours.getByRole("button", { name: `Edit /${name}`, exact: true }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);
  await expect(page.getByText(new RegExp(`/${name}$`)).first()).toBeVisible();

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
  await page.getByRole("tab", { name: "Theme" }).click();
  await page.getByRole("combobox", { name: "Page template" }).click();
  await page.getByRole("option", { name: "Modern Card" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

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
  await expect(page.getByRole("list", { name: /Setup progress for/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "CNAME" })).toBeVisible();
  await page.getByRole("button", { name: "Check now" }).click();
  await expect(page.getByText(/No matching DNS record yet|Not pointing at ViewLink yet/)).toBeVisible();

  // A root domain offers an A record or a CNAME on the root, both with a www record.
  const apex = `${name.replace(/_/g, "-")}-site.test`;
  await page.getByLabel("Domain", { exact: true }).fill(apex);
  await page.getByRole("button", { name: "Add domain" }).click();
  const recordType = page.getByRole("radiogroup", { name: `Record type for ${apex}` });
  await expect(recordType).toBeVisible();
  await expect(page.getByRole("cell", { name: "75.2.60.5" })).toBeVisible();
  await recordType.getByRole("radio", { name: "CNAME" }).click();
  await expect(page.getByText(/allows a CNAME on the root/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "@" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "www" })).toBeVisible();

  // A connected domain can be picked for a smart link, and serves it.
  const host = `go-${name.replace(/_/g, "-")}.test`;
  await connectDomain(name, host);
  const slug = uniqueName("dom").replace(/_/g, "-");
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Link name").fill(slug);
  await page.getByLabel("Domain").selectOption({ label: host });
  await page.getByLabel("Destination URL").fill("https://example.com/shop");
  await page.getByRole("switch", { name: "Adult content warning" }).click();
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  await expect(page.getByRole("link", { name: `${host}/${slug}` })).toBeVisible();

  const onDomain = await page.request.get(`/${slug}`, { maxRedirects: 0, headers: { host } });
  expect(onDomain.status()).toBe(302);
  expect(onDomain.headers()["location"]).toBe("https://example.com/shop");
  // www.<domain> sends visitors to the domain itself, keeping the path.
  const www = await page.request.get(`/${slug}?ref=1`, { maxRedirects: 0, headers: { host: `www.${host}` } });
  expect(www.status()).toBe(301);
  expect(www.headers()["location"]).toBe(`https://${host}/${slug}?ref=1`);
  // Someone else's link doesn't resolve on this domain.
  expect((await page.request.get("/demo-shop", { maxRedirects: 0, headers: { host } })).status()).toBe(404);
  // A connected domain shows only what's assigned to it: never the bio page by default.
  const home = await page.request.get("/", { headers: { host } });
  expect(home.status()).toBe(404);
  expect((await page.request.get(`/${name}`, { maxRedirects: 0, headers: { host } })).status()).toBe(404);

  // Put the bio page on the domain at a path: it opens there.
  await page.goto("/dashboard/templates");
  await page.getByRole("button", { name: `Change the link of /${name}` }).click();
  const linkDialog = page.getByRole("dialog", { name: `Link for /${name}` });
  await linkDialog.getByLabel("Domain").selectOption({ label: host });
  await linkDialog.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByRole("list", { name: "Your pages" }).getByText(`${host}/${name}`)).toBeVisible();
  const onPath = await page.request.get(`/${name}`, { headers: { host } });
  expect(onPath.status()).toBe(200);
  expect(await onPath.text()).toContain("My first link");
  expect((await page.request.get("/", { headers: { host } })).status()).toBe(404);

  // Root needs a custom domain; with one, the domain itself opens the link instead of the bio page.
  await page.goto("/dashboard/links/new");
  await expect(page.getByRole("radio", { name: "Root" })).toBeDisabled();
  await page.getByLabel("Domain").selectOption({ label: host });
  await page.getByRole("radio", { name: "Root" }).click();
  await expect(page.getByText(`https://${host}/`)).toBeVisible();
  await page.getByLabel("Destination URL").fill("https://example.com/root");
  await page.getByRole("switch", { name: "Adult content warning" }).click();
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  await expect(page.getByRole("link", { name: `${host}/`, exact: true })).toBeVisible();
  const root = await page.request.get("/", { maxRedirects: 0, headers: { host } });
  expect(root.status()).toBe(302);
  expect(root.headers()["location"]).toBe("https://example.com/root");

  // With the 18+ warning on, the warning shows at the link's own clean address (no /l/…/warning),
  // and its button continues from there.
  const warned = uniqueName("warn").replace(/_/g, "-");
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Domain").selectOption({ label: host });
  await page.getByLabel("Link name").fill(warned);
  await page.getByLabel("Destination URL").fill("https://example.com/warned");
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  const warnedPage = await page.request.get(`/${warned}`, { maxRedirects: 0, headers: { host } });
  expect(warnedPage.status()).toBe(200);
  const html = await warnedPage.text();
  expect(html).toContain(`href="/${warned}?ok=1"`);
  expect(html).not.toContain(`/l/${warned}/warning`);
  const confirmed = await page.request.get(`/${warned}?ok=1`, { maxRedirects: 0, headers: { host } });
  expect(confirmed.status()).toBe(302);
  expect(confirmed.headers()["location"]).toBe("https://example.com/warned");

  // A page can't take a root a deep link already uses.
  await page.goto("/dashboard/templates");
  await page.getByRole("button", { name: `Change the link of /${name}` }).click();
  const rootDialog = page.getByRole("dialog", { name: `Link for /${name}` });
  await rootDialog.getByRole("radio", { name: "Root" }).click();
  await rootDialog.getByRole("button", { name: "Save link" }).click();
  await expect(rootDialog.getByText(/already uses this domain's root/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Only one link can be a domain's root.
  await page.goto("/dashboard/links/new");
  await page.getByLabel("Domain").selectOption({ label: host });
  await page.getByRole("radio", { name: "Root" }).click();
  await page.getByLabel("Destination URL").fill("https://example.com/other");
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page.getByText(/already uses this domain's root/).first()).toBeVisible();

  // Removing the domain removes it everywhere: it stops serving, and its links (the Root one
  // included) fall back to the ViewLink address.
  await page.goto("/dashboard/domains");
  await page.getByRole("button", { name: `Remove ${host}` }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText(`${host} was removed`)).toBeVisible();
  await expect(page.getByRole("list", { name: "Your domains" }).getByText(host, { exact: true })).toHaveCount(0);
  expect((await page.request.get("/", { maxRedirects: 0, headers: { host } })).status()).toBe(404);
  await page.goto("/dashboard/links");
  await expect(page.getByRole("link", { name: `${host}/`, exact: true })).toHaveCount(0);
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

test("a showcase is everyone's preview of its template; using it starts from that content", async ({ page }) => {
  await showcaseTemplate("personal-card");
  try {
    const owner = await newCreator(page);
    await page.goto("/dashboard/templates");
    const gallery = page.getByRole("list", { name: "Link-in-bio templates" });
    await expect(gallery.getByText("Showcase Star")).toHaveCount(1);

    // Using it copies the showcase's content and look, but keeps the creator's own name.
    await page.getByRole("button", { name: "Use the Personal Card template" }).click();
    const dialog = page.getByRole("dialog", { name: "New page with Personal Card" });
    const fresh = `${owner.slice(0, 18)}_fresh`;
    await dialog.getByLabel("Page link").fill(fresh);
    await expect(dialog.getByText("Available")).toBeVisible();
    await dialog.getByRole("button", { name: "Create page" }).click();
    await expect(page).toHaveURL(/\/edit\/template\//);
    expect(await pageSummary(fresh)).toEqual({ displayName: owner, themeKey: "midnight", tagline: "Showcase tagline", blocks: 1 });

    // Each page has its own analytics.
    await page.goto("/dashboard/templates");
    await page.getByRole("link", { name: `Analytics for /${fresh}` }).click();
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText(new RegExp(`/${fresh} · Bots`))).toBeVisible();
  } finally {
    await removeShowcase("personal-card");
  }
});
