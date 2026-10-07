import { expect, test } from "@playwright/test";
import { expectSwissEntry, mockEntryBackend } from "./three-page-helpers";

test("NEXT immediately opens the menu and preserves tab-scoped welcome memory", async ({
  page,
  context,
}) => {
  await mockEntryBackend(page);
  const api: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) api.push(request.url());
  });
  await page.goto("/en");
  await expectSwissEntry(page);
  const next = page.getByRole("button", { name: "NEXT", exact: true });
  await expect(next).toBeVisible();
  expect(api).toEqual([]);
  await next.click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expect(page.getByTestId("research-menu")).toBeVisible();
  await expectSwissEntry(page);
  await page.goto("/en");
  await expect(page).toHaveURL(/\/en\/workspace$/);
  const tab = await context.newPage();
  await tab.goto("/en");
  await expect(
    tab.getByRole("button", { name: "NEXT", exact: true }),
  ).toBeVisible();
  await tab.close();
});

test("numbered menu opens question input, history and settings", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.goto("/en/workspace");
  await expectSwissEntry(page);
  const menu = page.getByRole("navigation", { name: "Choose your next step" });
  await expect(menu.getByRole("link", { name: /NEW RESEARCH/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: /history/i })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Settings/ })).toBeVisible();
  await menu.getByRole("link", { name: /NEW RESEARCH/ }).click();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await expect(page.getByLabel("Research question")).toBeVisible();
  await expectSwissEntry(page);
  await page.goto("/en/workspace");
  await page.getByRole("link", { name: /history/i }).click();
  await expect(page).toHaveURL(/\/en\/history$/);
  await expect(
    page.getByRole("heading", { name: "Research history", exact: true }),
  ).toBeVisible();
  await page.goto("/en/workspace");
  const settings = page.getByRole("link", { name: /Settings/ });
  const box = await settings.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await settings.click();
  await expect(page).toHaveURL(/\/en\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
});

test("keyboard entry works with reduced motion and API setup remains available", async ({
  page,
}) => {
  await mockEntryBackend(page, false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await page.getByRole("button", { name: "NEXT", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/workspace$/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Configure a DeepSeek API key");
  await dialog.getByLabel("DeepSeek API key").fill("sk-entry-fixture");
  await dialog.getByRole("button", { name: "Save and continue" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: /NEW RESEARCH/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await expect(page.getByLabel("Research question")).toBeVisible();
});

test("blocked storage leaves NEXT and the three-page flow usable", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.addInitScript(() =>
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    }),
  );
  await page.goto("/en");
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await page.getByRole("link", { name: /NEW RESEARCH/ }).click();
  await expect(page.getByLabel("Research question")).toBeVisible();
});

test("backend-offline welcome loads Inter and entry entirely from local resources", async ({
  page,
}) => {
  const api: string[] = [];
  const remote: string[] = [];
  await page.route("**/api/v1/**", (route) => {
    api.push(route.request().url());
    return route.abort();
  });
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://localhost:") &&
      /^https?:/.test(request.url())
    )
      remote.push(request.url());
  });
  await page.goto("/en");
  await page.evaluate(() => document.fonts.ready);
  await expectSwissEntry(page);
  await expect(
    page.getByRole("button", { name: "NEXT", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("heading", { level: 1 })
      .evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain("Inter");
  expect(api).toEqual([]);
  expect(remote).toEqual([]);
});
