import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1366, height: 768 } });

test("remaining workspace pages keep the entry identity and usable desktop layout", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const screenshotDirectory = path.resolve(
    process.cwd(),
    "../.impeccable/review",
  );
  await mkdir(screenshotDirectory, { recursive: true });
  const capture = async (name: string) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(screenshotDirectory, `${name}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(1366);
  };

  await page.goto("/en/research/new");
  await expect(page.getByLabel("Research question")).toBeVisible();
  await capture("reference-research");
  await page
    .getByLabel("Research question")
    .fill("Desktop design acceptance demo: evidence in scientific retrieval");
  await page.getByRole("button", { name: /send to agent/i }).click();
  await expect(page).toHaveURL(/\/research\/(?!new$)[^/]+$/);
  const taskUrl = page.url();
  await expect(page.getByTestId("followup-composer")).toBeVisible();
  await capture("task-live");
  await expect(
    page.getByRole("heading", { name: "Research synthesis", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Quality review|Final critic review|Critic attempt/i)).toHaveCount(0);
  await capture("report");
  const composerBox = await page.getByTestId("followup-composer").boundingBox();
  const contentBox = await page.getByTestId("task-scroll-region").boundingBox();
  expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(769);
  expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(
    composerBox!.y + 1,
  );

  await page.getByRole("button", { name: /open citation 1/i }).click();
  await expect(
    page.getByRole("region", { name: "Evidence details" }),
  ).toContainText("Hybrid retrieval improves grounding");
  await capture("evidence-selected");
  await page.getByRole("button", { name: /open paper/i }).click();

  await page.getByRole("tab", { name: "Papers (5)", exact: true }).click();
  await page.getByRole("button", { name: /Paper: Hybrid retrieval/i }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Papers (5)" })
      .getByRole("complementary", { name: "Paper details" }),
  ).toContainText("Hybrid retrieval");
  await capture("papers");
  await page
    .getByTestId("task-scroll-region")
    .getByRole("tab", { name: "Run details", exact: true })
    .click();
  await capture("run-details");
  await page.getByText("Open execution replay").click();
  await expect(
    page.getByRole("heading", { name: "Agent replay" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next replay event" }).click();
  await expect(
    page.getByRole("region", { name: "Event timeline" }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Agent replay" })
    .scrollIntoViewIfNeeded();
  await capture("replay-expanded");
  await page
    .getByRole("region", { name: "Event inspector" })
    .scrollIntoViewIfNeeded();
  await capture("replay-inspector");

  await page.goto("/en/settings");
  await expect(page.getByLabel("Maximum papers")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Task navigation" }),
  ).toHaveCount(0);
  const actionStyle = await page
    .getByRole("button", { name: "Save settings" })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color };
    });
  expect(actionStyle).toEqual({
    background: "rgb(20, 107, 224)",
    foreground: "rgb(255, 255, 255)",
  });
  const previewBox = await page.getByText(/^Preview:/).boundingBox();
  const saveBox = await page
    .getByRole("button", { name: "Save settings" })
    .boundingBox();
  expect(previewBox!.y + previewBox!.height).toBeLessThanOrEqual(saveBox!.y);
  await capture("settings");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await capture("settings-dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.goto("/zh-CN/settings");
  await expect(
    page.getByRole("heading", { name: "设置", exact: true }),
  ).toBeVisible();
  await capture("settings-zh");

  await page.goto("/en/history");
  await expect(
    page.getByRole("heading", { name: "Research history", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Desktop design acceptance demo/i }).first(),
  ).toBeVisible();
  await capture("history");
  await page.goto("/zh-CN/history");
  await expect(
    page.getByRole("heading", { name: "研究历史", exact: true }),
  ).toBeVisible();
  await capture("history-zh");
  await page.goto("/en/missing-design-page");
  await expect(
    page.getByRole("heading", { name: /could not be found/i }),
  ).toBeVisible();
  await capture("not-found");

  await page.goto(taskUrl);
  await expect(
    page.getByRole("heading", { name: "Research synthesis", exact: true }),
  ).toBeVisible();
});

test("replay event inspector stays readable above the follow-up composer", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/research/new");
  await page
    .getByLabel("Research question")
    .fill("Desktop replay inspector acceptance demo");
  await page.getByRole("button", { name: /send to agent/i }).click();
  await expect(
    page.getByRole("heading", { name: "Research synthesis", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await page
    .getByLabel("Research views")
    .getByRole("tab", { name: "Run details" })
    .click();
  await page.getByText("Open execution replay").click();
  await page.getByRole("button", { name: "Next replay event" }).click();
  const inspector = page.getByRole("region", { name: "Event inspector" });
  await expect(inspector).toContainText("task.created");
  await inspector.scrollIntoViewIfNeeded();
  const inspectorBox = await inspector.boundingBox();
  const composerBox = await page.getByTestId("followup-composer").boundingBox();
  expect(inspectorBox!.y + inspectorBox!.height).toBeLessThanOrEqual(
    composerBox!.y + 1,
  );
  const screenshotDirectory = path.resolve(
    process.cwd(),
    "../.impeccable/review",
  );
  await mkdir(screenshotDirectory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(screenshotDirectory, "replay-inspector.png"),
    fullPage: true,
    animations: "disabled",
  });
});
