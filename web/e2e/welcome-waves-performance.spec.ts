import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { mockEntryBackend } from "./three-page-helpers";

// Opt-in, headed Chrome measurement on the attached desktop, not a CI FPS assertion.
test.skip(!process.env.WAVE_BENCHMARK, "Opt-in desktop performance capture");
test.use({
  launchOptions: {
    executablePath:
      process.env.PLAYWRIGHT_CHROME_PATH ??
      (process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : undefined),
    headless: false,
    args: ["--start-fullscreen"],
  },
});
test("measure seeded full-screen wave rendering", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    viewport: null,
    deviceScaleFactor: undefined,
    baseURL,
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  const desktopWindow = await session.send("Browser.getWindowForTarget");
  await session.send("Browser.setWindowBounds", {
    windowId: desktopWindow.windowId,
    bounds: { windowState: "fullscreen" },
  });
  await mockEntryBackend(page);
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.goto("/en");
  const waves = page.getByTestId("welcome-waves");
  await expect(waves).toHaveAttribute("data-intro", "complete");
  await page.evaluate(() => document.fonts.ready);
  await session.send("Performance.enable");
  const samples = [];
  for (let sample = 0; sample < 3; sample++) {
    const before = await session.send("Performance.getMetrics");
    const result = await page.evaluate(async () => {
      const host = document.querySelector<HTMLElement>("a-waves")!;
      const bounds = host.getBoundingClientRect();
      const target = host.closest("main")!;
      let writes = 0;
      let draws = 0;
      let drawTime = 0;
      const canvas = host.querySelector("canvas");
      const context = canvas?.getContext("2d");
      const stroke = context?.stroke;
      if (context && stroke) {
        context.stroke = function (path?: Path2D) {
          const start = performance.now();
          Reflect.apply(stroke, this, path ? [path] : []);
          drawTime += performance.now() - start;
          draws++;
        };
      }
      const observer = new MutationObserver((entries) => {
        writes += entries.filter((entry) => entry.attributeName === "d").length;
      });
      observer.observe(host, {
        attributes: true,
        subtree: true,
        attributeFilter: ["d"],
      });
      const intervals: number[] = [];
      const start = performance.now();
      let previous = start;
      await new Promise<void>((resolve) => {
        function trace(time: number) {
          intervals.push(time - previous);
          previous = time;
          const elapsed = time - start;
          target.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              pointerType: "mouse",
              clientX: bounds.width * (0.5 + 0.42 * Math.sin(elapsed * 0.008)),
              clientY:
                bounds.top +
                bounds.height * (0.5 + 0.35 * Math.cos(elapsed * 0.006)),
            }),
          );
          if (elapsed < 10_000) requestAnimationFrame(trace);
          else resolve();
        }
        requestAnimationFrame(trace);
      });
      observer.disconnect();
      if (context && stroke) context.stroke = stroke;
      const duration = performance.now() - start;
      const sorted = intervals.slice(1).sort((a, b) => a - b);
      return {
        viewport: {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
        },
        band: { width: bounds.width, height: bounds.height },
        renderer: canvas ? "canvas" : "svg",
        duration,
        callbacks: intervals.length,
        callbackHz: (intervals.length * 1000) / duration,
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        over25Ms: sorted.filter((ms) => ms > 25).length,
        svgWrites: writes,
        canvasDraws: draws,
        strokeMs: drawTime,
      };
    });
    const after = await session.send("Performance.getMetrics");
    const delta = (name: string) =>
      after.metrics.find((metric) => metric.name === name)!.value -
      before.metrics.find((metric) => metric.name === name)!.value;
    samples.push({
      ...result,
      scriptSeconds: delta("ScriptDuration"),
      taskSeconds: delta("TaskDuration"),
    });
  }
  await session.send("Performance.disable");
  const directory = resolve("../artifacts/home-waves");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    resolve(directory, `canvas-performance-${process.env.WAVE_BENCHMARK}.json`),
    JSON.stringify(samples, null, 2),
  );
  console.log(JSON.stringify(samples));
  await context.close();
});
