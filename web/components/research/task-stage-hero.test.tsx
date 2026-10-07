import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { TaskStageHero } from "@/components/research/task-stage-hero";
import { createInitialReplayState } from "@/lib/events/reducer";

describe("TaskStageHero", () => {
  it("shows the current numbered stage and preserves expandable details without a robot", async () => {
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

    expect(
      screen.getByRole("heading", { level: 1, name: "Read" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("04 / 07");
    expect(screen.getByRole("status")).toHaveTextContent("Running");
    expect(
      screen.queryByTestId("research-stage-robot"),
    ).not.toBeInTheDocument();
    const details = screen.getByTestId("current-stage-details");
    await user.click(details.querySelector("summary")!);
    expect(details).toHaveAttribute("open");
    expect(details).toHaveTextContent("Reading the selected papers");
    const plan = screen.getByTestId("research-plan-details");
    await user.click(plan.querySelector("summary")!);
    expect(plan).toHaveAttribute("open");
  });
});
