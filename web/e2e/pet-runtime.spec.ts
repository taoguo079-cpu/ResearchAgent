import { expect, test, type Locator, type Page } from "@playwright/test";

import { mockEntryBackend } from "./three-page-helpers";

test.use({ viewport: { width: 1366, height: 768 } });

async function seedCompanion(page: Page) {
  await page.addInitScript(() => {
    const key = "research-agent.preferences.v1";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        state: {
          version: 1,
          research: {
            maxPapers: 15,
            sources: ["arxiv", "semantic_scholar", "pubmed", "crossref"],
          },
          pet: {
            visible: true,
            size: "medium",
            motion: "full",
            dragLocked: false,
            position: { xRatio: 0.5, yRatio: 1 },
          },
        },
      }),
    );
  });
}

async function boundedBox(companion: Locator, page: Page) {
  const box = await companion.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("Companion geometry is unavailable");
  await expect(companion).toHaveCSS("width", "96px");
  await expect(companion).toHaveCSS("height", "104px");
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  return box;
}

test("native companion flies during drag and inertia, then relaxes and restores its position", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const gifRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (/\.gif(?:[?#]|$)/i.test(request.url())) gifRequests.push(request.url());
  });
  await mockEntryBackend(page);
  await seedCompanion(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en/history", { waitUntil: "domcontentloaded" });
  const companion = page.locator("[data-pet-state]");
  const animation = companion.locator("[data-research-action]").first();
  await expect(companion).toHaveAttribute("data-physics", "resting");
  await expect(companion).toHaveAttribute("data-pet-state", "completed");
  await expect(animation).toHaveAttribute("data-research-action", "completed");
  await expect(animation).toHaveAttribute("data-research-fps", "60");
  await expect(
    companion.locator('[data-research-media="animation"]'),
  ).toBeVisible();
  const initial = await boundedBox(companion, page);
  await page.screenshot({ path: test.info().outputPath("pet-resting.png") });

  await page.mouse.move(
    initial.x + initial.width / 2,
    initial.y + initial.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(1, 1, { steps: 5 });
  await expect(companion).toHaveAttribute("data-physics", "dragging");
  await expect(companion).toHaveAttribute("data-pet-state", "dragging");
  await expect(animation).toHaveAttribute("data-research-action", "flying");
  await expect(animation).toHaveAttribute("data-research-fps", "60");
  await expect(
    companion.locator('[data-research-media="animation"]'),
  ).toBeVisible();
  await boundedBox(companion, page);
  await page.mouse.move(1365, 767, { steps: 5 });
  await boundedBox(companion, page);
  await page.mouse.move(500, 160, { steps: 5 });
  await page.screenshot({ path: test.info().outputPath("pet-flying.png") });
  await page.mouse.move(560, 100);
  await page.mouse.up();

  await expect(companion).toHaveAttribute("data-physics", "flying");
  await expect(companion).toHaveAttribute("data-pet-state", "dragging");
  await expect(animation).toHaveAttribute("data-research-action", "flying");
  const released = await boundedBox(companion, page);
  await expect
    .poll(async () => {
      const next = await companion.boundingBox();
      return next ? Math.hypot(next.x - released.x, next.y - released.y) : 0;
    })
    .toBeGreaterThan(2);
  await expect(page).toHaveURL(/\/en\/history$/);
  await expect(companion).toHaveAttribute("data-physics", "resting", {
    timeout: 15_000,
  });
  await expect(companion).toHaveAttribute("data-pet-state", "completed");
  await expect(animation).toHaveAttribute("data-research-action", "completed");
  const rested = await boundedBox(companion, page);
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("research-agent.preferences.v1") ?? "{}")
        .state.pet.position as { xRatio: number; yRatio: number },
  );
  for (const value of Object.values(saved)) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(companion).toHaveAttribute("data-physics", "resting", {
    timeout: 15_000,
  });
  await expect(companion).toHaveAttribute("data-pet-state", "completed");
  const restored = await boundedBox(companion, page);
  expect(Math.abs(restored.x - rested.x)).toBeLessThanOrEqual(32);
  expect(gifRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});
