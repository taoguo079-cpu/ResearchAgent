import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });
const sessionKey = "research-agent.welcome.v1";
async function mockWorkspace(page: Page, configured = true) {
  await page.route("**/api/v1/settings/deepseek", (route) =>
    route.fulfill({
      json: {
        provider: "deepseek",
        default_model: "deepseek-v4-flash",
        api_key_required: true,
        api_key_configured: configured,
      },
    }),
  );
  await page.route("**/api/v1/research/tasks/active", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/v1/research/history*", (route) =>
    route.fulfill({ json: [] }),
  );
}
async function ready(page: Page) {
  await expect(page.locator("main")).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 25_000 },
  );
  await expect(page.locator("main")).toHaveAttribute(
    "data-scene-ready",
    "true",
  );
  await expect(page.locator("canvas")).toBeVisible();
}
async function greet(page: Page) {
  await ready(page);
  await page.mouse.click(40, 150);
  await expect(page.getByTestId("welcome-magnifier")).toHaveCount(1);
  await expect(page.locator("main")).toHaveAttribute(
    "data-intro-phase",
    "greeting",
    { timeout: 20_000 },
  );
  return page.getByTestId("welcome-robot");
}
async function fits(page: Page) {
  const viewport = page.viewportSize()!;
  for (const node of [
    page.getByRole("status"),
    page.getByRole("button", {
      name: /你想研究什么问题吗|What would you like to research\?/,
    }),
  ]) {
    const box = await node.boundingBox();
    if (!box) throw new Error("Missing invitation");
    expect(box.x).toBeGreaterThanOrEqual(15);
    expect(box.y).toBeGreaterThanOrEqual(15);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 15);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const robot = await page.getByTestId("welcome-robot").boundingBox();
  const bubble = await page.getByRole("status").boundingBox();
  if (robot && bubble) {
    const overlapX =
      Math.min(robot.x + robot.width, bubble.x + bubble.width) -
      Math.max(robot.x, bubble.x);
    const overlapY =
      Math.min(robot.y + robot.height, bubble.y + bubble.height) -
      Math.max(robot.y, bubble.y);
    expect(overlapX <= 0 || overlapY <= 0).toBe(true);
  }
}
test("neon title is visible at entry, one click drops both, invitation preserves tab memory", async ({
  page,
  context,
}, info) => {
  await mockWorkspace(page);
  const api: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) api.push(request.url());
  });
  await page.goto("/");
  await ready(page);
  await expect(page.getByTestId("welcome-story")).toHaveCount(0);
  await expect(page.getByTestId("welcome-magnifier")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("welcome-neon-desktop.png") });
  for (let i = 0; i < 5; i++) await page.mouse.click(40, 150);
  await expect(page.locator("main")).toHaveAttribute(
    "data-intro-phase",
    "greeting",
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("welcome-magnifier")).toHaveCount(1);
  await expect(page.getByTestId("welcome-robot")).toHaveCount(1);
  expect(
    Number(await page.locator("main").getAttribute("data-title-contacts")),
  ).toBeGreaterThan(0);
  expect(api).toEqual([]);
  const robot = page.getByTestId("welcome-robot");
  await robot.click();
  await expect(
    page.getByRole("button", { name: "你想研究什么问题吗" }),
  ).toHaveCount(0);
  await robot.dblclick();
  await fits(page);
  await page.screenshot({
    path: info.outputPath("welcome-neon-companion.png"),
  });
  await page.getByRole("button", { name: "你想研究什么问题吗" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/workspace$/);
  const tab = await context.newPage();
  await tab.goto("/");
  await ready(tab);
  await tab.close();
});
test("unfinished intro resets; English entry opens API setup only in the workspace", async ({
  page,
}) => {
  await mockWorkspace(page, false);
  await page.goto("/en");
  await ready(page);
  await page.mouse.click(40, 150);
  await page.reload();
  await ready(page);
  await expect(page.getByTestId("welcome-magnifier")).toHaveCount(0);
  const robot = await greet(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await robot.dblclick();
  await page
    .getByRole("button", { name: "What would you like to research?" })
    .click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expect(page.getByRole("dialog")).toContainText(
    "Configure a DeepSeek API key",
  );
});
test("keyboard and reduced motion complete the single-click sequence", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await ready(page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toHaveAttribute(
    "data-intro-phase",
    "greeting",
  );
  await expect(page.getByTestId("welcome-robot")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "What would you like to research?" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/workspace$/);
});
test("blocked storage permits skipping without waiting for a scene", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.addInitScript(() =>
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    }),
  );
  await page.goto("/en");
  await page.getByRole("button", { name: /Skip introduction/ }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
});
test("backend-offline introduction loads only local resources", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/api/v1/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  const remote: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://localhost:") &&
      /^https?:/.test(request.url())
    )
      remote.push(request.url());
  });
  await page.goto("/");
  const robot = await greet(page);
  await robot.dblclick();
  await expect(
    page.getByRole("button", { name: "你想研究什么问题吗" }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  expect(remote).toEqual([]);
});
test("320px phones and short landscapes keep title and invitation usable", async ({
  page,
}, info) => {
  await mockWorkspace(page);
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/en");
    await ready(page);
    await page.screenshot({
      path: info.outputPath(`welcome-neon-${viewport.width}.png`),
    });
    const robot = await greet(page);
    await robot.dblclick();
    await fits(page);
    await page.screenshot({
      path: info.outputPath(`welcome-invitation-${viewport.width}.png`),
    });
  }
});
test("WebGL failure leaves a static title and a working workspace entrance", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (/webgl/.test(kind)) return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } as typeof original;
  });
  await page.goto("/en");
  await expect(page.locator("main")).toHaveAttribute(
    "data-scene-failed",
    "true",
    { timeout: 25_000 },
  );
  await expect(page.getByTestId("welcome-title-placeholder")).toBeVisible();
  await page.getByRole("button", { name: /Skip introduction/ }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
});
test.describe("touchscreen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("one tap drops both, double tap opens the research invitation", async ({
    page,
  }, info) => {
    await mockWorkspace(page);
    await page.goto("/");
    await ready(page);
    await page.touchscreen.tap(40, 150);
    await expect(page.locator("main")).toHaveAttribute(
      "data-intro-phase",
      "greeting",
      { timeout: 20_000 },
    );
    const robot = page.getByTestId("welcome-robot"),
      box = await robot.boundingBox();
    if (!box) throw new Error("No robot");
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await fits(page);
    await page.screenshot({ path: info.outputPath("welcome-neon-touch.png") });
    await page.getByRole("button", { name: "你想研究什么问题吗" }).tap();
    await expect(page).toHaveURL(/\/workspace$/);
    expect(
      await page.evaluate((key) => sessionStorage.getItem(key), sessionKey),
    ).toBe("complete");
  });
});
