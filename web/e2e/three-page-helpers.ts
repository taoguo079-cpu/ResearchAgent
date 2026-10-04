import { expect, type Page } from "@playwright/test";

export async function mockEntryBackend(page: Page, configured = true) {
  let apiKeyConfigured = configured;
  await page.route("**/api/v1/settings/deepseek", (route) => {
    if (route.request().method() === "PUT") apiKeyConfigured = true;
    return route.fulfill({
      json: {
        provider: "deepseek",
        default_model: "deepseek-v4-flash",
        api_key_required: true,
        api_key_configured: apiKeyConfigured,
      },
    });
  });
  await page.route("**/api/v1/research/tasks/active", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/v1/research/history*", (route) =>
    route.fulfill({ json: [] }),
  );
}

export async function expectBrandRobot(
  page: Page,
  action: "search" | "idle" | "filter",
) {
  const robot = page.getByTestId("brand-robot");
  await expect(robot).toHaveCount(1);
  await expect(robot).toBeVisible();
  await expect(robot).toHaveAttribute("data-brand-action", action);
  await expect(robot.locator("[data-brand-media]")).toBeVisible();
  await expect(robot.getByTestId("brand-robot-poster")).toBeVisible();
  await expect(page.locator("[data-pet-state]")).toHaveCount(0);
}

export async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
