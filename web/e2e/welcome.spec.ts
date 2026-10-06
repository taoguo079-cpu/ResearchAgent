import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

import {
  expectBrandRobot,
  expectNoHorizontalOverflow,
  mockEntryBackend,
} from "./three-page-helpers";

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
  await expect(
    page.getByRole("heading", { name: /Research\s*Agent/ }),
  ).toBeVisible();
  await expectBrandRobot(page, "search");
  const next = page.getByRole("button", { name: /NEXT/ });
  await expect(next).toBeVisible();
  expect(api).toEqual([]);
  await next.click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expect(page.getByTestId("research-menu")).toBeVisible();
  await expectBrandRobot(page, "idle");
  await page.goto("/en");
  await expect(page).toHaveURL(/\/en\/workspace$/);

  const tab = await context.newPage();
  await tab.goto("/en");
  await expect(tab.getByRole("button", { name: /NEXT/ })).toBeVisible();
  await tab.close();
});

test("menu opens question input, history, and the labelled settings gear", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "Research Agent" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve(
      process.cwd(),
      "..",
      ".impeccable",
      "review",
      "reference-welcome.png",
    ),
  });
  for (const locale of ["en", "zh-CN"] as const) {
    await page.goto(`/${locale}/workspace`);
    await expect(
      page.getByRole("heading", { name: "Research Agent", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("list")).toHaveCount(0);
    const actions = page.getByRole("navigation", {
      name: locale === "en" ? "Choose your next step" : "选择下一步",
    });
    const actionsBox = await actions.boundingBox();
    expect(actionsBox!.y + actionsBox!.height).toBeLessThanOrEqual(768);
    await expectBrandRobot(page, "idle");
    await expectNoHorizontalOverflow(page);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: resolve(
        process.cwd(),
        "..",
        ".impeccable",
        "review",
        `menu-${locale}.png`,
      ),
    });
  }
  await page.goto("/en/workspace");
  await page.getByRole("link", { name: /NEW RESEARCH/ }).click();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await expect(page.getByLabel("Research question")).toBeVisible();
  await expectBrandRobot(page, "filter");

  await page.goto("/en/workspace");
  await page.getByRole("link", { name: "history", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/history$/);
  await expect(
    page.getByRole("heading", { name: "Research history", exact: true }),
  ).toBeVisible();

  await page.goto("/en/workspace");
  const gear = page.getByRole("link", { name: "Settings", exact: true });
  await expect(gear).toHaveAttribute("title", "Settings");
  const box = await gear.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await gear.click();
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
  const next = page.getByRole("button", { name: /NEXT/ });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/workspace$/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Configure a DeepSeek API key");
  await dialog.getByLabel("DeepSeek API key").fill("sk-entry-fixture");
  await dialog.getByRole("button", { name: "Save and continue" }).click();
  await expect(dialog).not.toBeVisible();
  const newResearch = page.getByRole("link", { name: /NEW RESEARCH/ });
  await newResearch.focus();
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
  await page.getByRole("button", { name: /NEXT/ }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await page.getByRole("link", { name: /NEW RESEARCH/ }).click();
  await expect(page.getByLabel("Research question")).toBeVisible();
});

test("backend-offline brand page loads its illustration and entry from local resources", async ({
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
    ) {
      remote.push(request.url());
    }
  });
  await page.goto("/en");
  await expectBrandRobot(page, "search");
  await expect(page.getByRole("button", { name: /NEXT/ })).toBeVisible();
  expect(api).toEqual([]);
  expect(remote).toEqual([]);
});
