import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { mockEntryBackend } from "./three-page-helpers";

test.describe.configure({ timeout: 60_000 });

test.use({
  viewport: { width: 1366, height: 768 },
  video: { mode: "on", size: { width: 1366, height: 768 } },
});

test.beforeAll(async ({ request }) => {
  // Compile these routes before measuring the transition rather than dev startup.
  await Promise.all(
    ["/en/workspace", "/en/research/new", "/workspace", "/research/new"].map(
      (path) => request.get(path),
    ),
  );
});

function artifactDirectory(info: TestInfo) {
  const directory = resolve("../artifacts/entry-overlap", info.project.name);
  mkdirSync(directory, { recursive: true });
  return directory;
}

test.afterEach(async ({ page }, info) => {
  const video = page.video();
  if (!video) return;
  const path = await video.path();
  await page.close();
  copyFileSync(
    path,
    resolve(
      artifactDirectory(info),
      `${info.title.replace(/[^a-zA-Z0-9]+/g, "-")}.webm`,
    ),
  );
});

async function captureTransition(
  page: Page,
  info: TestInfo,
  name: string,
  target: string,
  action: () => Promise<void>,
  direction = "forward",
) {
  const overlay = page.getByTestId("entry-transition");
  await action();
  await expect(page).toHaveURL(new RegExp(`${target}$`));
  await expect(overlay).toHaveAttribute("data-phase", "overlapping");
  await expect(overlay).toHaveAttribute("data-direction", direction);
  const layers = await page.evaluate(() => {
    const animations = document
      .getAnimations()
      .filter(
        (animation) =>
          animation instanceof CSSAnimation &&
          /page-overlap|page-retreat/.test(animation.animationName),
      );
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = 110;
    });
    return animations.length;
  });
  expect(layers).toBe(2);

  for (const [label, time] of [
    ["entering", 110],
    ["overlapping", 450],
    ["settling", 800],
  ] as const) {
    const positions = await page.evaluate(async (time) => {
      const animations = document
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            /page-overlap|page-retreat/.test(animation.animationName),
        );
      animations.forEach((animation) => {
        animation.currentTime = time;
      });
      await new Promise(requestAnimationFrame);
      return {
        old: new DOMMatrixReadOnly(
          getComputedStyle(
            document.documentElement,
            "::view-transition-old(root)",
          ).transform,
        ).m41,
        next: new DOMMatrixReadOnly(
          getComputedStyle(
            document.documentElement,
            "::view-transition-new(root)",
          ).transform,
        ).m41,
        width: innerWidth,
      };
    }, time);
    expect(Math.abs(positions.next)).toBeLessThan(positions.width);
    expect(Math.abs(positions.next)).toBeGreaterThan(0);
    if (direction === "forward") {
      expect(positions.next).toBeGreaterThan(0);
      expect(positions.old).toBeLessThan(0);
    } else {
      expect(positions.next).toBeLessThan(0);
      expect(positions.old).toBeGreaterThan(0);
    }
    await page.screenshot({
      path: resolve(artifactDirectory(info), `${name}-${label}.png`),
    });
  }
  await page.evaluate(() => {
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation instanceof CSSAnimation &&
          /page-overlap|page-retreat/.test(animation.animationName),
      )
      .forEach((animation) => animation.play());
  });
  await expect(overlay).toHaveCount(0);
  expect(await page.locator("[inert]").count()).toBe(0);
}
for (const locale of ["en", "zh-CN"] as const) {
  test(`overlapping three-page frames ${locale}`, async ({ page }, info) => {
    await mockEntryBackend(page);
    const prefix = locale === "en" ? "/en" : "";
    await page.goto(prefix || "/");
    await expect(page.locator('[data-brand-media="animation"]')).toBeVisible();
    await expect(page.getByTestId("entry-transition")).toHaveCount(0);
    await captureTransition(
      page,
      info,
      `${locale}-next`,
      `${prefix}/workspace`,
      async () => {
        await page.getByRole("button", { name: /NEXT|下一步/ }).focus();
        await page.keyboard.press("Enter");
      },
    );
    await expect(page.getByTestId("research-menu")).toBeVisible();
    await captureTransition(
      page,
      info,
      `${locale}-new`,
      `${prefix}/research/new`,
      () => page.getByRole("link", { name: /NEW RESEARCH|新建研究/ }).click(),
    );
    await page
      .locator("textarea")
      .fill("Overlapping transition preserves a usable research form");
    await expect(page.locator("textarea")).toHaveValue(
      "Overlapping transition preserves a usable research form",
    );
    await captureTransition(
      page,
      info,
      `${locale}-back`,
      `${prefix}/workspace`,
      () => page.getByRole("link", { name: /Back to menu|返回菜单/ }).click(),
      "backward",
    );
    await expect(page.getByTestId("research-menu")).toBeVisible();
  });
}

async function watchTransitions(page: Page) {
  await page.evaluate(() => {
    const observed = window as typeof window & { entryTransitionsSeen: number };
    observed.entryTransitionsSeen = 0;
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (
            node instanceof Element &&
            (node.matches('[data-testid="entry-transition"]') ||
              node.querySelector('[data-testid="entry-transition"]'))
          )
            observed.entryTransitionsSeen++;
        }
    }).observe(document.body, { childList: true, subtree: true });
  });
}

async function expectNoTransitions(page: Page) {
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { entryTransitionsSeen: number })
          .entryTransitionsSeen,
    ),
  ).toBe(0);
  await expect(page.getByTestId("entry-transition")).toHaveCount(0);
}

test("history settings and browser history remain direct navigations", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.goto("/en/workspace");
  await watchTransitions(page);
  await page.getByRole("link", { name: "history", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/history$/);
  await expectNoTransitions(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/settings$/);
  await expectNoTransitions(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await page.getByRole("link", { name: /NEW RESEARCH/ }).click();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await expect(page.getByTestId("entry-transition")).toHaveCount(0);
  await watchTransitions(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expectNoTransitions(page);
  await page.goForward();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await expectNoTransitions(page);
});

test("language changes stay direct and subsequent transitions use the new locale", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.goto("/en/workspace");
  await watchTransitions(page);
  await page.getByRole("button", { name: "Languages", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/workspace");
  await expectNoTransitions(page);
  await page.getByRole("link", { name: "新建研究", exact: true }).click();
  await expect(page).toHaveURL(/\/research\/new$/);
  expect(new URL(page.url()).pathname).toBe("/research/new");
  await expect(page.getByTestId("entry-transition")).toHaveCount(0);
  await watchTransitions(page);
  await page.getByRole("button", { name: "语言选项", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await expect(
    page.getByRole("link", { name: "Back to menu", exact: true }),
  ).toBeVisible();
  expect(await page.locator("html").getAttribute("lang")).toBe("en");
  await expectNoTransitions(page);
});

test("reduced motion skips the overlap and a completed welcome skips without animation", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await watchTransitions(page);
  await page.getByRole("button", { name: /NEXT/ }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await page.getByRole("link", { name: /NEW RESEARCH/ }).click();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await page.getByRole("link", { name: "Back to menu", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expectNoTransitions(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expect(page.getByTestId("entry-transition")).toHaveCount(0);
});

test("overlapping three-page live demo zh-CN", async ({ page }) => {
  await mockEntryBackend(page);
  await page.goto("/");
  await expect(page.locator('[data-brand-media="animation"]')).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByTestId("entry-transition")).toHaveCount(0);
  await expect(page.locator('[data-brand-media="animation"]')).toBeVisible();
  await page.getByRole("link", { name: "新建研究", exact: true }).click();
  await expect(page).toHaveURL(/\/research\/new$/);
  await expect(page.getByTestId("entry-transition")).toHaveCount(0);
  await page.locator("textarea").fill("人工智能如何帮助科研？");
  await page.getByRole("link", { name: "返回菜单", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByTestId("entry-transition")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "新建研究", exact: true }),
  ).toBeEnabled();
});

test("a slow route keeps the old page until the new page is committed", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.goto("/en");
  await expect(page.locator('[data-brand-media="animation"]')).toBeVisible();
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/en/workspace*", async (route) => {
    if (route.request().headers().rsc === "1") await held;
    await route.fallback();
  });
  try {
    await page.getByRole("button", { name: "NEXT", exact: true }).click();
    await expect(page.getByTestId("entry-transition")).toHaveAttribute(
      "data-phase",
      "waiting",
    );
    expect(new URL(page.url()).pathname).toBe("/en");
    // Deliberately hold the route longer than an ordinary cached navigation.
    await page.waitForTimeout(300);
    await expect(page.getByTestId("entry-transition")).toHaveAttribute(
      "data-phase",
      "waiting",
    );
    release();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await expect(page.getByTestId("entry-transition")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /NEW RESEARCH/ }),
    ).toBeEnabled();
  } finally {
    release();
  }
});

test("browsers without view transitions navigate directly", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", {
      value: undefined,
      configurable: true,
    });
  });
  await mockEntryBackend(page);
  await page.goto("/en/workspace");
  await watchTransitions(page);
  await page.getByRole("link", { name: /NEW RESEARCH/ }).click();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await page.getByRole("link", { name: "Back to menu", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expectNoTransitions(page);
});
