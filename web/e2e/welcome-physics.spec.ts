import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import lettering from "../public/design-text/manifest.json";
import robotMedia from "../public/brand-robot/manifest.json";

import {
  expectBrandRobot,
  expectNoHorizontalOverflow,
  mockEntryBackend,
} from "./three-page-helpers";

test.describe.configure({ timeout: 60_000 });

for (const viewport of [{ width: 1366, height: 768 }]) {
  test(`three-page design fits ${viewport.width}px with one robot and reachable controls`, async ({
    page,
  }, info) => {
    await mockEntryBackend(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    const directory = resolve(
      "../artifacts/three-page-design",
      info.project.name,
    );
    mkdirSync(directory, { recursive: true });
    for (const [name, url, action] of [
      ["brand", "/en", "search"],
      ["menu", "/en/workspace", "idle"],
      ["question", "/en/research/new", "filter"],
    ] as const) {
      await page.goto(url);
      await expectBrandRobot(page, action);
      await expectNoHorizontalOverflow(page);
      const control =
        name === "brand"
          ? page.getByRole("button", { name: /NEXT/ })
          : name === "menu"
            ? page.getByRole("link", { name: /NEW RESEARCH/ })
            : page.getByRole("button", { name: /SEND TO AGENT/i });
      await expect(control).toBeVisible();
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeInViewport();
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      if (name === "menu" && viewport.width === 1366) {
        const newPill = await control
          .locator(":scope > span")
          .last()
          .boundingBox();
        const historyPill = await page
          .getByRole("link", { name: "history", exact: true })
          .locator(":scope > span")
          .last()
          .boundingBox();
        expect(newPill).not.toBeNull();
        expect(historyPill).not.toBeNull();
        expect(newPill!.width).toBeCloseTo(500, 0);
        expect(newPill!.height).toBeCloseTo(95, 0);
        expect(historyPill!.width).toBeCloseTo(newPill!.width, 0);
        expect(historyPill!.height).toBeCloseTo(newPill!.height, 0);
      }
      if (name === "question") {
        const input = await page.getByLabel("Research question").boundingBox();
        expect(input).not.toBeNull();
        expect(input!.y + input!.height).toBeLessThanOrEqual(box!.y + 1);
      }
      for (const [asset, spec] of Object.entries(lettering.assets)) {
        if (
          !asset.startsWith(`${name === "brand" ? "home" : name}-`) &&
          !(name === "brand" && asset === "language-zh")
        )
          continue;
        const label = page.locator(`[data-design-text="${asset}"]`);
        await expect(label).toHaveAttribute("data-design-vector", "true");
        await expect(label.locator("img")).toHaveAttribute("src", spec.src);
        const bounds = await label.boundingBox();
        expect(bounds).not.toBeNull();
        expect(Math.abs(bounds!.x - spec.x)).toBeLessThan(1);
        expect(Math.abs(bounds!.y - spec.y)).toBeLessThan(1);
        expect(bounds!.width).toBe(spec.width);
        expect(bounds!.height).toBe(spec.height);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: resolve(directory, `${name}-${viewport.width}.png`),
        fullPage: true,
      });
    }
  });
}

test("Chinese three-page design keeps entry controls usable at 1366px", async ({
  page,
}, info) => {
  await mockEntryBackend(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1366, height: 768 });
  const directory = resolve(
    "../artifacts/three-page-design",
    info.project.name,
  );
  mkdirSync(directory, { recursive: true });
  for (const [name, url, action] of [
    ["brand", "/", "search"],
    ["menu", "/workspace", "idle"],
    ["question", "/research/new", "filter"],
  ] as const) {
    await page.goto(url);
    await expectBrandRobot(page, action);
    await expectNoHorizontalOverflow(page);
    const control =
      name === "brand"
        ? page.getByRole("button", { name: /下一步/ })
        : name === "menu"
          ? page.getByRole("link", { name: /新建研究/ })
          : page.getByRole("button", { name: /发送给 Agent/ });
    await expect(control).toBeInViewport();
    await page.screenshot({
      path: resolve(directory, `${name}-zh-1366.png`),
      fullPage: true,
    });
  }
});

test("reduced motion holds the appropriate static frame on all three entry pages", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [url, action] of [
    ["/en", "search"],
    ["/en/workspace", "idle"],
    ["/en/research/new", "filter"],
  ] as const) {
    await page.goto(url);
    await expectBrandRobot(page, action);
    const robot = page.getByTestId("brand-robot");
    await expect(robot.locator("[data-brand-media]")).toHaveAttribute(
      "data-brand-media",
      "poster",
    );
    await expect(robot.locator("video")).toHaveCount(0);
    await expect(robot.getByTestId("brand-robot-animation")).toHaveCount(0);
    await expect(robot.getByTestId("brand-robot-poster")).toHaveAttribute(
      "src",
      robotMedia.states[action].posterSrc,
    );
  }
});

test("failed vector animation loads preserve each pose as a static illustration", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.route(
    /\/brand-robot\/(search|idle|filter)\.lottie\.json$/,
    (route) => route.fulfill({ status: 404 }),
  );
  for (const [url, action] of [
    ["/en", "search"],
    ["/en/workspace", "idle"],
    ["/en/research/new", "filter"],
  ] as const) {
    await page.goto(url);
    await expectBrandRobot(page, action);
    const robot = page.getByTestId("brand-robot");
    await expect(robot.locator("[data-brand-media]")).toHaveAttribute(
      "data-brand-media",
      "error",
    );
    await expect(robot.locator("video")).toHaveCount(0);
    await expect(robot.getByTestId("brand-robot-animation")).toHaveCount(0);
    const poster = robot.getByTestId("brand-robot-poster");
    await expect(poster).toHaveAttribute(
      "src",
      robotMedia.states[action].posterSrc,
    );
    await expect
      .poll(() =>
        poster.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
});

test("each original 60 fps SVG animation advances on display frames and loops", async ({
  page,
}, info) => {
  await mockEntryBackend(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1366, height: 768 });
  const mediaRequests: string[] = [];
  const measurements = [];
  page.on("request", (request) => {
    if (/\.(mp4|gif)(\?|$)/.test(request.url()))
      mediaRequests.push(request.url());
  });
  for (const [url, action] of [
    ["/en", "search"],
    ["/en/workspace", "idle"],
    ["/en/research/new", "filter"],
  ] as const) {
    await page.goto(url);
    const robot = page.getByTestId("brand-robot");
    await expect(robot.locator("[data-brand-media]")).toHaveAttribute(
      "data-brand-media",
      "animation",
    );
    await expect(robot.locator("video")).toHaveCount(0);
    const animation = robot.getByTestId("brand-robot-animation");
    const spec = robotMedia.states[action];
    await expect(animation).toHaveAttribute("data-brand-fps", "60");
    await expect(animation).toHaveAttribute(
      "data-brand-frames",
      String(spec.animation.frames),
    );
    await expect(animation).toHaveAttribute("data-brand-playback", "playing");
    await expect(animation.locator("svg")).toHaveAttribute(
      "viewBox",
      `${spec.crop.left} ${spec.crop.top} ${spec.crop.width} ${spec.crop.height}`,
    );
    // Transparent SVGs must replace the poster, rather than overlay a static robot.
    await expect(robot.getByTestId("brand-robot-poster")).toHaveCSS(
      "opacity",
      "0",
    );
    const response = await page.request.get(spec.animation.src);
    const data = await response.json();
    expect(data.fr).toBe(60);
    expect(data.op - data.ip).toBe(spec.animation.frames);
    const bounds = await robot.boundingBox();
    const rate = await animation.locator("svg").evaluate(
      (svg, sampleDuration) =>
        new Promise<{
          updates: number;
          displayFrames: number;
          elapsed: number;
          fps: number;
          maxGapMs: number;
        }>((resolve) => {
          const start = performance.now();
          const updates: number[] = [];
          let displayFrames = 0;
          const observer = new MutationObserver(() => {
            updates.push(performance.now());
          });
          observer.observe(svg, { attributes: true, subtree: true });
          const sample = () => {
            displayFrames++;
            if (performance.now() - start < sampleDuration)
              return requestAnimationFrame(sample);
            observer.disconnect();
            const elapsed = (performance.now() - start) / 1000;
            resolve({
              updates: updates.length,
              displayFrames,
              elapsed,
              fps: updates.length / elapsed,
              maxGapMs: Math.max(
                ...updates.slice(1).map((time, index) => time - updates[index]),
              ),
            });
          };
          requestAnimationFrame(sample);
        }),
      (spec.animation.duration + 0.3) * 1000,
    );
    // Compare with the actual display cadence so this remains valid on slower test hosts.
    expect(rate.updates / rate.displayFrames).toBeGreaterThan(0.8);
    measurements.push({ action, ...rate });
    await expect
      .poll(
        async () => Number(await animation.getAttribute("data-brand-loops")),
        { timeout: (spec.animation.duration + 2) * 1000 },
      )
      .toBeGreaterThan(0);
    expect(await robot.boundingBox()).toEqual(bounds);
    if (action === "search") {
      await page.screenshot({
        path: resolve(
          "../artifacts/three-page-design",
          info.project.name,
          "brand-lottie-1366.png",
        ),
        fullPage: true,
      });
    }
  }
  expect(mediaRequests).toEqual([]);
  await info.attach("vector-playback-rates", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  const directory = resolve(
    "../artifacts/three-page-design",
    info.project.name,
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    resolve(directory, "lottie-playback-rates.json"),
    JSON.stringify(measurements, null, 2),
  );
});

test("invalid vector metadata falls back to the poster without a video request", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.route("**/brand-robot/search.lottie.json", (route) =>
    route.fulfill({ json: { fr: 30, ip: 0, op: 150, w: 1080, h: 1080 } }),
  );
  await page.goto("/en");
  const robot = page.getByTestId("brand-robot");
  await expect(robot.locator("[data-brand-media]")).toHaveAttribute(
    "data-brand-media",
    "error",
  );
  await expect(robot.getByTestId("brand-robot-poster")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(robot.locator("svg, video")).toHaveCount(0);
});

test("entry animation pauses while hidden and resumes without leaving an extra renderer", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.goto("/en/workspace");
  const robot = page.getByTestId("brand-robot");
  await expect(robot.locator("[data-brand-media]")).toHaveAttribute(
    "data-brand-media",
    "animation",
  );
  const animation = robot.getByTestId("brand-robot-animation");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(animation).toHaveAttribute("data-brand-playback", "paused");
  const pausedPose = await animation.locator("svg").innerHTML();
  await page.waitForTimeout(150);
  expect(await animation.locator("svg").innerHTML()).toBe(pausedPose);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(animation).toHaveAttribute("data-brand-playback", "playing");
  await expect
    .poll(() => animation.locator("svg").innerHTML())
    .not.toBe(pausedPose);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(robot.locator("[data-brand-media]")).toHaveAttribute(
    "data-brand-media",
    "poster",
  );
  await expect(animation).toHaveCount(0);
  await expect(robot.getByTestId("brand-robot-poster")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(animation).toHaveCount(1);
  await expect(animation.locator("svg")).toHaveCount(1);
  await expect(animation).toHaveAttribute("data-brand-playback", "playing");
});
