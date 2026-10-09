import { describe, expect, it } from "vitest";

import {
  replayStateToSnapshot,
  snapshotToReplayState,
} from "@/features/tasks/task-cache";
import { taskSnapshotSchema } from "@/lib/api/response-schemas";
import { reduceResearchEvent } from "@/lib/events/reducer";

const snapshot = {
  id: "task",
  client_request_id: "request",
  query: "Question",
  title: "Title",
  status: "running",
  effective_locale: "en",
  last_sequence: 0,
  created_at: "2026-09-07T00:00:00Z",
  replay_events: [],
};
const event = {
  task_id: "task",
  schema_version: 1,
  sequence: 1,
  event_type: "draft.available",
  stage: "synthesize",
  level: "info",
  payload: { count: 1 },
  occurred_at: snapshot.created_at,
};

describe("durable snapshot replay", () => {
  it("preserves applied artifacts in cache for a page remount", () => {
    const initial = taskSnapshotSchema.parse(snapshot);
    const applied = reduceResearchEvent(snapshotToReplayState(initial), event);
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied")
      throw new Error("Expected an applied event");
    const cached = replayStateToSnapshot(initial, applied.state, applied.event);
    expect(snapshotToReplayState(cached)).toEqual(applied.state);
    expect(
      replayStateToSnapshot(cached, applied.state, applied.event).replay_events,
    ).toHaveLength(1);
  });

  it("tolerates future event types but rejects malformed known events", () => {
    expect(
      taskSnapshotSchema.safeParse({
        ...snapshot,
        replay_events: [{ ...event, event_type: "future.event" }],
      }).success,
    ).toBe(true);
    expect(
      taskSnapshotSchema.safeParse({
        ...snapshot,
        replay_events: [
          { ...event, event_type: "agent.delegated", payload: {} },
        ],
      }).success,
    ).toBe(false);
  });

  it("restores plan contents and progress even when snapshot stage details are absent", () => {
    const state = snapshotToReplayState(
      taskSnapshotSchema.parse({
        ...snapshot,
        current_stage: "search",
        last_sequence: 2,
        stages: [
          { stage: "search", status: "running", attempt: 1, detail: null },
        ],
        replay_events: [
          {
            ...event,
            event_type: "plan.available",
            stage: "orchestrate",
            payload: { steps: [{ display_query: "Compare evidence" }] },
          },
          {
            ...event,
            sequence: 2,
            event_type: "stage.progress",
            stage: "search",
            payload: {
              message: "Searching academic sources",
              counts: { raw_papers: 7 },
            },
          },
        ],
      }),
    );
    expect(state.researchPlan).toEqual(["Compare evidence"]);
    expect(state.stages.search.detail).toBe("Searching academic sources");
    expect(state.metrics.raw_papers).toBe(7);
  });

  it("does not restore a previous round's counts from cached statistics", () => {
    const initial = taskSnapshotSchema.parse({
      ...snapshot,
      current_stage: "search",
      statistics: { raw_papers: 12 },
      replay_events: [
        {
          ...event,
          event_type: "stage.progress",
          stage: "search",
          payload: { counts: { raw_papers: 12 } },
        },
      ],
    });
    const applied = reduceResearchEvent(snapshotToReplayState(initial), {
      ...event,
      sequence: 2,
      event_type: "stage.started",
      stage: "search",
      payload: { attempt: 2 },
    });
    if (applied.status !== "applied")
      throw new Error("Expected an applied event");
    const cached = replayStateToSnapshot(initial, applied.state, applied.event);
    expect(cached.statistics?.raw_papers).toBeUndefined();
    expect(snapshotToReplayState(cached).metrics.raw_papers).toBeUndefined();
  });
});
