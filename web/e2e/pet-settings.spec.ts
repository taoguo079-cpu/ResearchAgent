import { expect, test } from "@playwright/test";
import { mockEntryBackend } from "./three-page-helpers";

test("settings save research defaults without theme or companion controls and initialize the next question", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.goto("/en/settings");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Show companion")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Research companion" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Switch to (dark|light) theme/ }),
  ).toHaveCount(0);
  await page.getByLabel("Maximum papers").fill("7");
  await page.getByRole("checkbox", { name: "arXiv", exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Settings saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Maximum papers")).toHaveValue("7");
  await expect(
    page.getByRole("checkbox", { name: "arXiv", exact: true }),
  ).not.toBeChecked();
  await page.goto("/en/research/new");
  await page.getByText("Examples & research options", { exact: true }).click();
  await page
    .getByRole("button", { name: "This research overrides", exact: true })
    .click();
  await expect(page.getByLabel("Maximum papers")).toHaveValue("7");
  await expect(
    page.getByRole("checkbox", { name: "arXiv", exact: true }),
  ).not.toBeChecked();
  await expect(page.locator("[data-pet-state]")).toHaveCount(0);
  await page.goto("/en/workspace");
  await page.getByRole("link", { name: /Settings/ }).click();
  await expect(page).toHaveURL(/\/en\/settings$/);
});

test("restore defaults resets papers and sources and remains available with reduced motion", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/settings");
  await page.getByLabel("Maximum papers").fill("5");
  await page.getByRole("checkbox", { name: "PubMed", exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore defaults", exact: true })
    .click();
  await expect(page.getByLabel("Maximum papers")).toHaveValue("15");
  for (const source of ["arXiv", "Semantic Scholar", "PubMed", "Crossref"])
    await expect(
      page.getByRole("checkbox", { name: source, exact: true }),
    ).toBeChecked();
  await page.reload();
  await expect(page.getByLabel("Maximum papers")).toHaveValue("15");
  await expect(
    page.locator("[data-pet-state], [data-brand-media], [data-research-media]"),
  ).toHaveCount(0);
});
