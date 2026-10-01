import { expect, test, type Locator, type Page } from "@playwright/test";
test.describe.configure({ timeout: 60_000 });
async function prepare(page: Page) {
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 25_000 },
  );
  await page.mouse.click(40, 150);
  await expect(page.locator("main")).toHaveAttribute(
    "data-intro-phase",
    "greeting",
    { timeout: 20_000 },
  );
  return {
    robot: page.getByTestId("welcome-robot"),
    lens: page.getByTestId("welcome-magnifier"),
  };
}
async function center(node: Locator) {
  const box = await node.boundingBox();
  if (!box) throw new Error("Missing toy");
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    width: box.width,
  };
}
async function drag(
  page: Page,
  node: Locator,
  target: { x: number; y: number },
) {
  const start = await center(node);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(
      start.x + ((target.x - start.x) * i) / 10,
      start.y + ((target.y - start.y) * i) / 10,
    );
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(200);
  await page.mouse.up();
}
async function inside(page: Page, node: Locator) {
  const box = await node.boundingBox();
  if (!box) throw new Error("Missing toy");
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}
test("drops contact the outline, dragging hides guidance, a stationary click restores it", async ({
  page,
}) => {
  const { robot, lens } = await prepare(page);
  expect(
    Number(await page.locator("main").getAttribute("data-title-contacts")),
  ).toBeGreaterThan(0);
  await robot.dblclick();
  await expect(
    page.getByRole("button", { name: "你想研究什么问题吗" }),
  ).toBeVisible();
  await drag(page, lens, { x: page.viewportSize()!.width / 2 - 150, y: 240 });
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "你想研究什么问题吗" }),
  ).toHaveCount(0);
  await expect(robot).toHaveAttribute("data-motion", "still", {
    timeout: 20_000,
  });
  await robot.click();
  await expect(
    page.getByRole("button", { name: "你想研究什么问题吗" }),
  ).toBeVisible();
  await expect(lens).toHaveAttribute("data-motion", "still", {
    timeout: 20_000,
  });
  await inside(page, lens);
  await inside(page, robot);
});
test("both hands carry the magnifier, detach on drag and stay inside after resizing", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { robot, lens } = await prepare(page);
  for (const hand of ["left", "right"] as const) {
    const body = await center(robot),
      scale = body.width / 192;
    await drag(page, lens, {
      x: body.x + (hand === "left" ? -72 : 72) * scale - 26 * scale,
      y: body.y + 20 * scale - 32 * scale,
    });
    await expect(lens).toHaveAttribute("data-held-hand", hand);
    await expect(lens).toHaveAttribute("data-motion", "held");
    await drag(page, robot, {
      x: hand === "left" ? 0 : page.viewportSize()!.width,
      y: 300,
    });
    await inside(page, lens);
    await inside(page, robot);
    if (hand === "left")
      await page.screenshot({ path: info.outputPath("welcome-neon-held.png") });
    await drag(page, lens, { x: page.viewportSize()!.width / 2, y: 220 });
    await expect(lens).toHaveAttribute("data-held-hand", "");
    await drag(page, robot, {
      x: page.viewportSize()!.width / 2,
      y: page.viewportSize()!.height - 104,
    });
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(async () => {
    await inside(page, lens);
    await inside(page, robot);
  }).toPass();
});
test("throwing wakes a body and moving clicks cannot activate the invitation", async ({
  page,
}) => {
  const { robot } = await prepare(page),
    body = await center(robot);
  await page.mouse.move(body.x, body.y);
  await page.mouse.down();
  await page.mouse.move(body.x - 140, 280, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.move(body.x + 30, 270);
  await page.waitForTimeout(25);
  await page.mouse.move(body.x + 90, 260);
  await page.mouse.up();
  await expect(robot).toHaveAttribute("data-motion", "moving");
  await robot.evaluate((node: HTMLButtonElement) => node.click());
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(robot).toHaveAttribute("data-motion", "still", {
    timeout: 20_000,
  });
  await inside(page, robot);
  await robot.click();
  await expect(page.getByRole("status")).toBeVisible();
});
test.describe("touch dragging", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("real touch capture suppresses release clicks and retains a 44px hit target", async ({
    page,
  }) => {
    const { robot, lens } = await prepare(page);
    expect((await lens.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    const session = await page.context().newCDPSession(page),
      start = await center(robot);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: start.x, y: start.y }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x - 70, y: 260 }],
    });
    await expect(robot).toHaveAttribute("data-motion", "dragging");
    await page.waitForTimeout(200);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(robot).toHaveAttribute("data-motion", "still", {
      timeout: 20_000,
    });
    await expect(page.getByRole("status")).toHaveCount(0);
    await robot.tap();
    await expect(
      page.getByRole("button", { name: "你想研究什么问题吗" }),
    ).toBeVisible();
    await session.detach();
  });
});
