import { expect, test, type Page } from "@playwright/test";
import type { TaskSnapshotResponse } from "../lib/api/client";
import { mockEntryBackend } from "./three-page-helpers";

test.use({ viewport: { width: 1366, height: 768 } });

const taskId = "task-focus-preview";
const snapshot: TaskSnapshotResponse = {
  id: taskId,
  client_request_id: "client-focus-preview",
  query: "What advances have been made in Transformer attention since 2023?",
  title: "Transformer attention since 2023",
  status: "running",
  effective_locale: "en",
  current_stage: "filter",
  created_at: "2026-10-05T09:00:00Z",
  started_at: "2026-10-05T09:00:01Z",
  last_sequence: 12,
  available_actions: ["cancel"],
  statistics: { papersDiscovered: 24, papersSelected: 8 },
  stages: [
    { stage: "orchestrate", status: "completed", attempt: 1 },
    { stage: "search", status: "completed", attempt: 1 },
    {
      stage: "filter",
      status: "running",
      attempt: 1,
      detail: "Selecting the most relevant attention research.",
    },
  ],
  replay_events: [
    {
      schema_version: 1,
      task_id: taskId,
      sequence: 6,
      event_type: "plan.available",
      stage: "orchestrate",
      occurred_at: "2026-10-05T09:00:04Z",
      level: "info",
      payload: {
        steps: [
          { step: 1, title: "Compare efficient attention methods" },
          { step: 2, title: "Trace benchmark evidence and limitations" },
        ],
      },
    },
  ],
};

type StreamMetrics = { created: number; active: number; peak: number };

async function mockRunningResearch(page: Page, taskSnapshot = snapshot) {
  await mockEntryBackend(page);
  await page.route(`**/api/v1/research/tasks/${taskId}`, (route) =>
    route.fulfill({ json: taskSnapshot }),
  );
  await page.route(`**/api/v1/research/tasks/${taskId}/messages`, (route) =>
    route.fulfill({
      json: {
        task_id: taskId,
        task_status: "running",
        messages: [],
        pending: null,
      },
    }),
  );
  await page.route(`**/api/v1/research/tasks/${taskId}/result`, (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.addInitScript(() => {
    localStorage.clear();
    const metrics = { created: 0, active: 0, peak: 0 };
    Object.assign(window, { researchStreamMetrics: metrics });
    class FocusEventSource extends EventTarget {
      static current: FocusEventSource | null = null;
      readonly url: string;
      readyState = 0;
      onopen: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      private closed = false;

      constructor(url: string | URL) {
        super();
        this.url = String(url);
        FocusEventSource.current = this;
        metrics.created += 1;
        metrics.active += 1;
        metrics.peak = Math.max(metrics.peak, metrics.active);
        queueMicrotask(() => {
          if (this.closed) return;
          this.readyState = 1;
          this.onopen?.(new Event("open"));
        });
      }

      close() {
        if (this.closed) return;
        this.closed = true;
        this.readyState = 2;
        metrics.active -= 1;
      }
    }
    Object.defineProperty(window, "EventSource", { value: FocusEventSource });
    Object.assign(window, {
      dispatchResearchEvent: (event: { event_type: string }) => {
        FocusEventSource.current?.dispatchEvent(
          new MessageEvent(event.event_type, { data: JSON.stringify(event) }),
        );
      },
    });
  });
}

function streamMetrics(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { researchStreamMetrics: StreamMetrics })
        .researchStreamMetrics,
  );
}

test("Chinese progress and the published plan update live and survive a refresh", async ({
  page,
}) => {
  const restored: TaskSnapshotResponse = {
    ...snapshot,
    effective_locale: "zh-CN",
    current_stage: "search",
    statistics: {},
    stages: [{ stage: "search", status: "running", attempt: 1, detail: null }],
    replay_events: [
      {
        ...snapshot.replay_events![0],
        payload: {
          steps: [
            {
              display_query: "比较多来源检索的证据",
              retrieval_query: "multi-source retrieval evidence",
            },
            { sub_query: "分析现有方法的局限" },
          ],
        },
      },
    ],
  };
  await mockRunningResearch(page, restored);
  await page.goto(`/research/${taskId}`);
  const hero = page.getByTestId("task-stage-hero");
  const progress = "已从所选学术来源检索到 12 篇论文。";
  await expect(hero).toContainText("正在所选学术来源中检索相关论文。");
  const update = {
    schema_version: 1,
    task_id: taskId,
    sequence: 13,
    event_type: "stage.progress",
    stage: "search",
    level: "info",
    occurred_at: "2026-10-09T00:00:00Z",
    payload: { counts: { raw_papers: 12 } },
  };
  await expect.poll(async () => (await streamMetrics(page)).active).toBe(1);
  await page.evaluate((event) => {
    (
      window as unknown as {
        dispatchResearchEvent: (event: Record<string, unknown>) => void;
      }
    ).dispatchResearchEvent(event);
  }, update);
  const stage = page.getByTestId("current-stage-details");
  await stage.locator("summary").click();
  await expect(stage).toContainText(progress);
  const plan = page.getByTestId("research-plan-details");
  await plan.locator("summary").click();
  await expect(plan.getByRole("listitem")).toHaveCount(2);
  await expect(plan).toContainText("比较多来源检索的证据");
  await expect(hero).not.toContainText("研究 Agent 会在此发布进度。");
  await expect(plan).not.toContainText("规划 Agent 发布计划后");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: test.info().outputPath("research-progress-zh.png"),
    animations: "disabled",
  });
  restored.replay_events!.push(update);
  restored.last_sequence = 13;
  await page.reload();
  await expect(hero).toContainText(progress);
  await plan.locator("summary").click();
  await expect(plan).toContainText("比较多来源检索的证据");
  await expect(plan).toContainText("分析现有方法的局限");
  await expect.poll(async () => (await streamMetrics(page)).active).toBe(1);
});

test("folded follow-up and Zen preserve the draft and the task stream", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await mockRunningResearch(page);
  await page.goto(`/en/research/${taskId}`);
  const composer = page.getByTestId("followup-composer");
  const input = page.getByRole("textbox", { name: "Ask about this report" });
  const expand = page.getByRole("button", { name: "Expand follow-up" });
  const hero = page.getByTestId("task-stage-hero");

  await expect(hero).toBeVisible();
  await expect(hero.getByTestId("research-stage-robot")).toHaveAttribute(
    "data-research-action",
    "checklist",
  );
  await expect(hero.locator("[data-research-fps]").first()).toHaveAttribute(
    "data-research-fps",
    "60",
  );
  await expect(hero.locator('[data-research-media="animation"]')).toBeVisible();
  await expect(input).toBeHidden();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(
    composer.getByRole("navigation", { name: "Stage detail" }),
  ).toBeVisible();
  for (const [name, content] of [
    ["Select", "Selecting the most relevant attention research."],
    ["Research plan", "Compare efficient attention methods"],
  ]) {
    const detail = page.locator("details").filter({
      has: page.locator("summary", { hasText: new RegExp(`^${name}$`) }),
    });
    await expect(detail).toHaveCount(1);
    await expect(detail).toHaveJSProperty("open", false);
    await detail.locator("summary").click();
    await expect(detail.getByText(content, { exact: true })).toBeVisible();
    await detail.locator("summary").click();
    await expect(detail).toHaveJSProperty("open", false);
  }
  await expect.poll(async () => (await streamMetrics(page)).active).toBe(1);
  const initialStream = await streamMetrics(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: test.info().outputPath("research-normal.png"),
    animations: "disabled",
  });

  await expand.click();
  await input.fill("Compare the evidence without starting another study.");
  await page.screenshot({
    path: test.info().outputPath("research-expanded.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Collapse follow-up" }).click();
  await expect(input).toBeHidden();
  await page.getByRole("button", { name: "Enter Zen mode" }).click();
  const zen = page.getByTestId("task-zen-view");
  const exit = page.getByRole("button", { name: "Exit Zen mode" });
  await expect(zen).toBeVisible();
  await expect(exit).toBeFocused();
  await expect(page.getByRole("button")).toHaveCount(1);
  await expect(
    page.getByRole("complementary", { name: "Task navigation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toHaveCount(0);
  await expect(page.locator("[data-pet-state]")).toBeHidden();
  await expect(
    composer.getByRole("navigation", { name: "Stage detail" }),
  ).toBeVisible();
  await expect(composer).toHaveAttribute("data-zen", "true");
  await page.evaluate((id) => {
    const dispatch = (
      window as unknown as {
        dispatchResearchEvent: (event: Record<string, unknown>) => void;
      }
    ).dispatchResearchEvent;
    const event = {
      schema_version: 1,
      task_id: id,
      level: "info",
      occurred_at: "2026-10-05T09:00:12Z",
      payload: {},
    };
    dispatch({
      ...event,
      sequence: 13,
      event_type: "stage.completed",
      stage: "filter",
    });
    dispatch({
      ...event,
      sequence: 14,
      event_type: "stage.started",
      stage: "read",
    });
  }, taskId);
  await expect(zen.getByTestId("research-stage-robot")).toHaveAttribute(
    "data-research-stage",
    "read",
  );
  await expect(zen.getByTestId("research-stage-robot")).toHaveAttribute(
    "data-research-action",
    "guidebook",
  );
  await expect(zen.locator('[data-research-media="animation"]')).toBeVisible();
  await expect(composer.locator('[aria-current="step"]')).toHaveAttribute(
    "aria-label",
    "Read Running",
  );
  expect(await streamMetrics(page)).toEqual(initialStream);
  await page.screenshot({
    path: test.info().outputPath("research-zen.png"),
    animations: "disabled",
  });

  await page.keyboard.press("Escape");
  await expect(zen).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Enter Zen mode" }),
  ).toBeFocused();
  await expand.click();
  await expect(input).toHaveValue(
    "Compare the evidence without starting another study.",
  );
  await page.getByRole("button", { name: "Enter Zen mode" }).click();
  await page.getByRole("button", { name: "Exit Zen mode" }).click();
  await expect(zen).toBeHidden();
  await expect(input).toHaveValue(
    "Compare the evidence without starting another study.",
  );
  expect(await streamMetrics(page)).toEqual(initialStream);
  expect(initialStream.peak).toBe(1);

  const zhTaskId = "task-focus-zh";
  await page.route(`**/api/v1/research/tasks/${zhTaskId}`, (route) =>
    route.fulfill({
      json: {
        ...snapshot,
        id: zhTaskId,
        effective_locale: "zh-CN",
        title: "Transformer 注意力机制的新进展",
        query: "2023 年以来，Transformer 注意力机制有哪些进展？",
        replay_events: snapshot.replay_events?.map((event) => ({
          ...event,
          task_id: zhTaskId,
        })),
      },
    }),
  );
  await page.route(`**/api/v1/research/tasks/${zhTaskId}/messages`, (route) =>
    route.fulfill({
      json: {
        task_id: zhTaskId,
        task_status: "running",
        messages: [],
        pending: null,
      },
    }),
  );
  await page.goto(`/research/${zhTaskId}`);
  await expect(page.getByRole("button", { name: "进入禅模式" })).toBeVisible();
  await expect(hero.locator('[data-research-media="animation"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: test.info().outputPath("research-normal-zh.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "展开追问" }).click();
  await expect(
    page.getByRole("textbox", { name: "追问当前报告" }),
  ).toBeFocused();
  await page.screenshot({
    path: test.info().outputPath("research-expanded-zh.png"),
    animations: "disabled",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero.locator('[data-research-media="poster"]')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
