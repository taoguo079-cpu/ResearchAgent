import { expect, test, type Page } from "@playwright/test";
import type {
  ResearchTaskResultResponse,
  TaskSnapshotResponse,
} from "../lib/api/client";
import { mockEntryBackend } from "./three-page-helpers";

test.use({ viewport: { width: 1366, height: 768 } });

async function mockReport(page: Page, locale: "en" | "zh-CN") {
  await mockEntryBackend(page);
  const id = "task-report-navigation";
  const chinese = locale === "zh-CN";
  const repeated = chinese ? "研究发现" : "Findings";
  const report: ResearchTaskResultResponse = {
    task_id: id,
    partial: false,
    report_markdown: [
      `# ${chinese ? "手性分子的结构与证据" : "Molecular structure and evidence"}`,
      ...Array.from(
        { length: 24 },
        (_, index) =>
          `## ${index + 1}. ${chinese ? "手性中心与立体中心：结构层面的标记点及相关证据的详细分析" : "Stereocentres and molecular structure: a detailed comparison of the available evidence"}\n\n${(chinese ? "证据显示，分子结构与观察方法共同决定结果。" : "The evidence connects molecular structure with the methods used to observe it. ").repeat(8)}`,
      ),
      `## ${repeated}\n\n${chinese ? "第一项研究发现。" : "First finding."}`,
      `## ${repeated}\n\n${chinese ? "第二项研究发现。" : "Second finding."}`,
    ].join("\n\n"),
    research_plan: [],
    papers: [],
    paper_insights: [],
    analysis: {},
    critique: {},
    statistics: {},
    evidence: [],
    citations: [],
    capabilities: {
      supports_replay: false,
      supports_evidence: false,
      supports_structured_papers: false,
    },
  };
  const snapshot: TaskSnapshotResponse = {
    id,
    client_request_id: `client-${id}`,
    title: chinese ? "分子结构证据报告" : "Molecular evidence report",
    query: "THIS SUBTITLE MUST NOT APPEAR",
    status: "running",
    effective_locale: locale,
    current_stage: "critic",
    last_sequence: 0,
    created_at: "2026-10-09T12:00:00Z",
  };
  await page.route(`**/api/v1/research/tasks/${id}`, (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.route(`**/api/v1/research/tasks/${id}/result`, (route) =>
    route.fulfill({ json: report }),
  );
  await page.route(`**/api/v1/research/tasks/${id}/messages`, (route) =>
    route.fulfill({
      json: {
        task_id: id,
        task_status: snapshot.status,
        messages: [],
        pending: null,
      },
    }),
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      "research-agent.ui.v1",
      JSON.stringify({ state: { isTaskSidebarOpen: true }, version: 1 }),
    );
    const metrics = { created: 0, active: 0 };
    Object.assign(window, { reportStreamMetrics: metrics });
    class ReportEventSource extends EventTarget {
      static current: ReportEventSource | null = null;
      readyState = 1;
      onopen: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      constructor(readonly url: string) {
        super();
        ReportEventSource.current = this;
        metrics.created++;
        metrics.active++;
        queueMicrotask(() => this.onopen?.(new Event("open")));
      }
      close() {
        if (this.readyState === 2) return;
        this.readyState = 2;
        metrics.active--;
      }
    }
    Object.defineProperty(window, "EventSource", { value: ReportEventSource });
    Object.assign(window, {
      finishReport: (taskId: string) =>
        ReportEventSource.current?.dispatchEvent(
          new MessageEvent("task.completed", {
            data: JSON.stringify({
              schema_version: 1,
              task_id: taskId,
              sequence: 1,
              event_type: "task.completed",
              occurred_at: "2026-10-09T12:01:00Z",
              level: "info",
              payload: {},
            }),
          }),
        ),
    });
  });
  return { snapshot, repeated, id, report };
}

async function expectCenteredReport(page: Page) {
  const document = page.locator(".report-document");
  await expect(document).toBeVisible();
  await expect(document).toHaveCSS("text-align", "left");
  const geometry = await document.evaluate((element) => {
    const body = element.parentElement!.getBoundingClientRect();
    const prose = element.getBoundingClientRect();
    return {
      left: prose.left - body.left,
      right: body.right - prose.right,
      width: prose.width,
      maximum: parseFloat(getComputedStyle(element).maxWidth),
    };
  });
  expect(Math.abs(geometry.left - geometry.right)).toBeLessThan(2);
  expect(geometry.width).toBeLessThanOrEqual(geometry.maximum + 1);
}

for (const locale of ["en", "zh-CN"] as const) {
  test(`${locale} report directory replaces task navigation and preserves the reading area`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { snapshot, repeated, id } = await mockReport(page, locale);
    const chinese = locale === "zh-CN";
    const labels = {
      stages: chinese ? "阶段详情" : "Stage detail",
      synthesis: chinese ? "研究综合报告" : "Research synthesis",
      export: chinese ? "导出报告" : "Export report",
      toc: chinese ? "本页内容" : "On this page",
      tasks: chinese ? "任务导航" : "Task navigation",
      expand: chinese ? "展开任务侧栏" : "Expand task sidebar",
      collapse: chinese ? "收起任务侧栏" : "Collapse task sidebar",
      report: chinese ? "报告" : "Report",
      papers: chinese ? "论文（0）" : "Papers (0)",
      run: chinese ? "运行详情" : "Run details",
      views: chinese ? "研究视图" : "Research views",
      followup: chinese ? "追问当前报告" : "Ask about this report",
      enterZen: chinese ? "进入禅模式" : "Enter Zen mode",
      exitZen: chinese ? "退出禅模式" : "Exit Zen mode",
    };
    await page.goto(`${chinese ? "" : "/en"}/research/${id}`);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { reportStreamMetrics: { created: number } })
              .reportStreamMetrics.created,
        ),
      )
      .toBe(1);
    await expect(
      page.getByRole("navigation", { name: labels.stages }),
    ).toBeVisible();
    await page.getByRole("button", { name: labels.enterZen }).click();
    await expect(page.getByTestId("task-zen-view")).toBeVisible();
    snapshot.status = "completed";
    snapshot.last_sequence = 1;
    await page.evaluate(
      (taskId) =>
        (
          window as unknown as { finishReport: (id: string) => void }
        ).finishReport(taskId),
      id,
    );
    await expect(
      page.getByRole("tablist", { name: labels.views }).getByRole("tab"),
    ).toHaveCount(2);
    await expect(page.getByTestId("task-zen-view")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: labels.exitZen }),
    ).toBeFocused();
    await page.getByRole("button", { name: labels.exitZen }).click();
    const toc = page.getByRole("navigation", { name: labels.toc });
    const tasks = page.getByRole("complementary", { name: labels.tasks });
    const main = page.getByRole("main");
    await expect(toc).toBeVisible();
    await expect(tasks).toHaveCount(0);
    await expect(
      main.getByRole("navigation", { name: labels.toc }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "English", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "中文", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("THIS SUBTITLE MUST NOT APPEAR")).toHaveCount(
      0,
    );
    await expect(page.getByText(/任务 ID|Task ID/)).toHaveCount(0);
    const bodyBox = (await main.boundingBox())!;
    const railBox = (await toc.boundingBox())!;
    expect(railBox.x + railBox.width).toBeLessThan(bodyBox.x);
    await page.evaluate(() => document.fonts.ready);
    await expectCenteredReport(page);
    await expect(
      page.getByRole("navigation", { name: labels.stages }),
    ).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath(`report-directory-${locale}.png`),
      animations: "disabled",
    });

    const list = page.getByTestId("report-toc-list");
    expect(
      await list.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    await list.evaluate((element) => {
      element.scrollTop = 420;
    });
    const savedListScroll = await list.evaluate((element) => element.scrollTop);
    await page.getByRole("button", { name: labels.expand }).click();
    await expect(tasks).toBeVisible();
    await expect(toc).toBeHidden();
    expect((await main.boundingBox())!.width).toBeCloseTo(bodyBox.width, 1);
    expect((await tasks.boundingBox())!.width).toBeCloseTo(railBox.width, 1);
    await expect(
      page.getByRole("button", { name: labels.collapse }),
    ).toBeFocused();
    await page.screenshot({
      path: test.info().outputPath(`report-task-overlay-${locale}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(toc).toBeVisible();
    await expect(
      page.getByRole("button", { name: labels.expand }),
    ).toBeFocused();
    expect(await list.evaluate((element) => element.scrollTop)).toBe(
      savedListScroll,
    );

    await toc.getByRole("link", { name: repeated, exact: true }).last().click();
    const target = page.locator(
      `.report-document [id="${chinese ? "研究发现" : "findings"}-2"]`,
    );
    await expect(target).toBeInViewport();
    expect(
      await page
        .getByTestId("task-scroll-region")
        .evaluate((element) => element.scrollTop),
    ).toBeGreaterThan(0);
    const savedBodyScroll = await page
      .getByTestId("task-scroll-region")
      .evaluate((element) => element.scrollTop);
    await page.getByRole("button", { name: labels.expand }).click();
    await page.getByRole("button", { name: labels.collapse }).click();
    expect(
      await page
        .getByTestId("task-scroll-region")
        .evaluate((element) => element.scrollTop),
    ).toBe(savedBodyScroll);

    const tabs = page.getByRole("tablist", { name: labels.views });
    await tabs.getByRole("tab", { name: labels.papers, exact: true }).click();
    await expect(
      page.getByRole("navigation", { name: labels.stages }),
    ).toHaveCount(0);
    await expect(toc).toHaveCount(0);
    await expect(tasks).toBeVisible();
    await page.getByRole("button", { name: labels.collapse }).click();
    await expect(tasks).toHaveCount(0);
    await page.getByRole("button", { name: labels.expand }).click();
    await tabs.getByRole("tab", { name: labels.run, exact: true }).click();
    await expect(
      page.getByRole("navigation", { name: labels.stages }),
    ).toHaveCount(0);
    await expect(tasks).toBeVisible();
    await tabs.getByRole("tab", { name: labels.report, exact: true }).click();
    await expect(toc).toBeVisible();
    await expect(tasks).toHaveCount(0);

    await page
      .getByTestId("followup-composer")
      .locator("button[aria-expanded]")
      .click();
    const input = page.getByRole("textbox", { name: labels.followup });
    await input.fill("Keep my question while toggling navigation.");
    await page.getByRole("button", { name: labels.expand }).click();
    await page.getByRole("button", { name: labels.collapse }).click();
    const scroll = page.getByTestId("task-scroll-region");
    await scroll.evaluate((element) => {
      element.scrollTop = 360;
    });
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollTop))
      .toBe(360);
    await page.getByRole("button", { name: labels.enterZen }).click();
    await expect(toc).toBeHidden();
    await expect(page.getByTestId("task-zen-view")).toHaveCount(0);
    await expect(page.getByTestId("followup-composer")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: labels.synthesis, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: labels.export, exact: true }),
    ).toHaveCount(0);
    await expect(tabs.getByRole("tab")).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: labels.exitZen }),
    ).toBeFocused();
    await expectCenteredReport(page);
    await page.screenshot({
      path: test.info().outputPath(`report-zen-${locale}.png`),
      animations: "disabled",
    });
    await tabs.getByRole("tab", { name: labels.papers, exact: true }).click();
    await expect(
      page.getByRole("complementary", {
        name: chinese ? "上下文面板" : "Context panel",
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: labels.exitZen }).click();
    await expect(toc).toBeVisible();
    await expect(tabs.getByRole("tab")).toHaveCount(3);
    await expect(
      tabs.getByRole("tab", { name: labels.report, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("button", { name: labels.enterZen }),
    ).toBeFocused();
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollTop))
      .toBe(360);
    await page.getByRole("button", { name: labels.enterZen }).click();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: labels.enterZen }),
    ).toBeFocused();
    await expect(input).toHaveValue(
      "Keep my question while toggling navigation.",
    );
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { reportStreamMetrics: { created: number } })
            .reportStreamMetrics.created,
      ),
    ).toBe(1);

    await page.getByRole("button", { name: labels.expand }).click();
    await page.reload();
    await expect(toc).toBeVisible();
    await expect(tasks).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(1366);
    await page.goto(`${chinese ? "" : "/en"}/history`);
    await expect(
      page.getByRole("button", { name: "English", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "中文", exact: true }),
    ).toBeEnabled();
    await expect(async () => {
      await page
        .getByRole("button", {
          name: chinese ? "English" : "中文",
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(
        chinese ? /\/en\/history$/ : /(?<!\/en)\/history$/,
        { timeout: 1000 },
      );
    }).toPass({ timeout: 15_000, intervals: [500, 1000] });
  });
}

test("report Zen retains paper inspection and restores the normal tab", async ({
  page,
}) => {
  const { snapshot, id, report } = await mockReport(page, "en");
  snapshot.status = "completed";
  report.papers = [
    {
      paper_id: "paper-1",
      title: "Paper one",
      source: "arxiv",
      source_id: "demo-paper",
      authors: ["Researcher"],
      abstract: "Paper abstract",
      selected: true,
      full_text_status: "abstract_only",
      pdf_url: "https://example.com/paper.pdf",
    },
  ];
  const columns = Array.from(
    { length: 24 },
    (_, index) => `Benchmark ${index + 1}`,
  );
  report.report_markdown += `\n\n| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n| ${columns.map(() => "Long measurement").join(" | ")} |`;
  await page.goto(`/en/research/${id}`);
  await page.evaluate(() => document.fonts.ready);
  await expectCenteredReport(page);
  const table = page.getByRole("table");
  expect(
    await table.evaluate(
      (element) =>
        element.parentElement!.scrollWidth > element.parentElement!.clientWidth,
    ),
  ).toBe(true);
  const tabs = page.getByRole("tablist", { name: "Research views" });
  await tabs.getByRole("tab", { name: "Run details", exact: true }).click();
  await page.getByRole("button", { name: "Enter Zen mode" }).click();
  await expect(
    tabs.getByRole("tab", { name: "Report", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expectCenteredReport(page);
  await tabs.getByRole("tab", { name: "Papers (1)", exact: true }).click();
  await page
    .getByRole("button", { name: "Paper: Paper one", exact: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Paper one", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open PDF", exact: true }),
  ).toHaveAttribute("href", "https://example.com/paper.pdf");
  await page.screenshot({
    path: test.info().outputPath("report-zen-papers.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Exit Zen mode" }).click();
  await expect(
    tabs.getByRole("tab", { name: "Run details", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await tabs.getByRole("tab", { name: "Papers (1)", exact: true }).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Paper one", level: 2 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter Zen mode" }).click();
  await expect(
    tabs.getByRole("tab", { name: "Papers (1)", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await tabs.getByRole("tab", { name: "Report", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    tabs.getByRole("tab", { name: "Papers (1)", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1366);
});

for (const state of ["loading", "error"] as const) {
  test(`report ${state} hides the stage rail and can exit Zen`, async ({
    page,
  }) => {
    const { snapshot, id, report } = await mockReport(page, "en");
    snapshot.status = "completed";
    let releaseResult!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseResult = resolve;
    });
    await page.route(`**/api/v1/research/tasks/${id}/result`, async (route) => {
      if (state === "loading") await gate;
      await route.fulfill(
        state === "loading"
          ? { json: report }
          : { status: 500, json: { detail: "Fixture report unavailable" } },
      );
    });
    try {
      await page.goto(`/en/research/${id}`);
      await expect(page.locator("[data-sidebar][data-report]")).toHaveAttribute(
        "data-report",
        "true",
      );
      if (state === "error")
        await expect(
          page.getByTestId("task-scroll-region").getByRole("alert"),
        ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Stage detail" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Enter Zen mode" }).click();
      await expect(
        page.getByRole("button", { name: "Exit Zen mode" }),
      ).toBeFocused();
      await expect(page.getByTestId("followup-composer")).toBeHidden();
      await expect(page.getByTestId("task-scroll-region")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Enter Zen mode" }),
      ).toBeFocused();
      await expect(page.getByTestId("followup-composer")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Stage detail" }),
      ).toHaveCount(0);
    } finally {
      releaseResult();
    }
    if (state === "loading")
      await expect(
        page.getByRole("heading", { name: "Research synthesis", exact: true }),
      ).toBeVisible();
  });
}
