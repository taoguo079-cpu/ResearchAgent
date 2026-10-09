import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { TaskStageHero } from "@/components/research/task-stage-hero";
import { createInitialReplayState, replayEvents } from "@/lib/events/reducer";
import { RESEARCH_STAGES, type StageStatus } from "@/lib/events/types";

vi.mock("@/components/research/research-stage-robot", () => ({
  ResearchStageRobot: () => <div data-testid="research-stage-robot" />,
}));

describe("TaskStageHero", () => {
  it("preserves the main hero robot and expandable progress and plan details", async () => {
    const user = userEvent.setup();
    const state = createInitialReplayState("swiss-stage");
    state.currentStage = "read";
    state.taskStatus = "running";
    state.stages.read.detail = "Reading the selected papers";

    render(
      <Providers locale="en">
        <TaskStageHero state={state} />
      </Providers>,
    );

    expect(screen.getByTestId("research-stage-robot")).toBeInTheDocument();
    const details = screen.getByTestId("current-stage-details");
    await user.click(details.querySelector("summary")!);
    expect(details).toHaveAttribute("open");
    expect(details).toHaveTextContent("Reading the selected papers");
    const plan = screen.getByTestId("research-plan-details");
    await user.click(plan.querySelector("summary")!);
    expect(plan).toHaveAttribute("open");
  });

  it.each(RESEARCH_STAGES)(
    "shows meaningful progress for %s without an event description",
    (stage) => {
      const state = createInitialReplayState("progress");
      state.currentStage = stage;
      state.taskStatus = "running";
      state.stages[stage].status = "running";
      render(
        <Providers locale="zh-CN">
          <TaskStageHero state={state} />
        </Providers>,
      );
      expect(
        screen.queryByText("研究 Agent 会在此发布进度。"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("task-stage-hero")).toHaveTextContent("正在");
    },
  );

  it.each([
    ["completed", "搜索阶段已完成。"],
    ["failed", "搜索阶段因错误停止。"],
    ["cancelled", "搜索阶段已停止，已保存的进度仍可查看。"],
  ] satisfies [StageStatus, string][])(
    "describes a %s stage accurately",
    (status, message) => {
      const state = createInitialReplayState("progress");
      state.currentStage = "search";
      state.stages.search.status = status;
      render(
        <Providers locale="zh-CN">
          <TaskStageHero state={state} />
        </Providers>,
      );
      expect(screen.getAllByText(message)).toHaveLength(1);
    },
  );

  it("renders published search angles and counts in the hero and expanded details", async () => {
    const user = userEvent.setup();
    const state = replayEvents("progress", [
      {
        schema_version: 1,
        task_id: "progress",
        sequence: 1,
        event_type: "plan.available",
        level: "info",
        occurred_at: "2026-10-09T00:00:00Z",
        payload: {
          steps: [
            {
              display_query: "比较多来源检索证据",
              retrieval_query: "multi-source retrieval",
            },
            { sub_query: "分析现有方法的局限" },
          ],
        },
      },
      {
        schema_version: 1,
        task_id: "progress",
        sequence: 2,
        event_type: "stage.progress",
        stage: "search",
        level: "info",
        occurred_at: "2026-10-09T00:00:01Z",
        payload: { counts: { raw_papers: 12 } },
      },
    ]);
    render(
      <Providers locale="zh-CN">
        <TaskStageHero state={state} />
      </Providers>,
    );
    const details = screen.getByTestId("current-stage-details");
    await user.click(details.querySelector("summary")!);
    expect(
      within(details).getByText("已从所选学术来源检索到 12 篇论文。"),
    ).toBeVisible();
    const plan = screen.getByTestId("research-plan-details");
    await user.click(plan.querySelector("summary")!);
    expect(within(plan).getByRole("list")).toBeVisible();
    expect(within(plan).getAllByRole("listitem")).toHaveLength(2);
    expect(plan).toHaveTextContent("比较多来源检索证据");
    expect(plan).toHaveTextContent("分析现有方法的局限");
    expect(plan).not.toHaveTextContent("规划 Agent 发布计划后");
  });
});
