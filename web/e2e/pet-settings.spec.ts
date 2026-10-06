import { expect, test } from "@playwright/test";
import { mockEntryBackend } from "./three-page-helpers";

test.use({ viewport: { width: 1366, height: 768 } });

test("opens settings from the companion and restores access when hidden", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.goto("/en/history", { waitUntil: "domcontentloaded" });
  const companion = page.getByRole("button", {
    name: /Research companion: relaxing; open settings/i,
  });
  await expect(companion).toBeVisible();
  await companion.click();

  await expect(page).toHaveURL(/\/en\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByLabel("Maximum papers").fill("7");
  await page.getByLabel("Show companion").uncheck();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Settings saved");
  await expect(
    page.getByRole("button", { name: "Open settings" }),
  ).toBeVisible();

  await page.goto("/en/research/new", { waitUntil: "domcontentloaded" });
  await page.getByText("Examples & research options", { exact: true }).click();
  await page.getByRole("button", { name: "This research overrides" }).click();
  await expect(page.getByLabel("Maximum papers")).toHaveValue("7");
  await expect(page.locator("[data-pet-state]")).toHaveCount(0);
  await page.goto("/en/workspace");
  await expect(
    page.getByRole("link", { name: "Settings", exact: true }),
  ).toBeVisible();
});

test.describe("reduced motion", () => {
  test("uses the native relaxing poster in system reduced motion", async ({
    page,
  }) => {
    await mockEntryBackend(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/history", { waitUntil: "domcontentloaded" });
    const companion = page.locator("[data-pet-state]");
    await expect(companion).toHaveAttribute("data-pet-state", "completed");
    await expect(
      companion.locator('[data-research-media="poster"]'),
    ).toBeVisible();
    await expect(
      companion.locator('[data-research-media="animation"]'),
    ).toHaveCount(0);
  });
});
