import { describe, expect, it } from "vitest";

import {
  LEGACY_PET_MANIFEST,
  PET_ANIMATION_STATES,
  PET_CELL,
  parsePetManifest,
  resolvePetState,
  type PetAnimationSpec,
  type PetManifest,
  type PetRuntimeSnapshot,
} from "@/features/pet/pet-manifest";
import { RESEARCH_STAGES, type TaskStatus } from "@/lib/events/types";

function runtime(
  taskStatus: TaskStatus | null,
  currentStage: PetRuntimeSnapshot["currentStage"] = null,
): PetRuntimeSnapshot {
  return { taskId: "task-1", taskStatus, currentStage, updatedAt: 1 };
}

describe("pet manifest", () => {
  it.each(RESEARCH_STAGES)("maps the %s research stage", (stage) => {
    expect(
      resolvePetState({
        runtime: runtime("running", stage),
        dragging: false,
        completionFinished: false,
      }),
    ).toBe(stage);
  });

  it.each(["cancelling", "failed", "cancelled", "interrupted"] as const)(
    "maps %s to failed",
    (status) => {
      expect(
        resolvePetState({
          runtime: runtime(status, "search"),
          dragging: false,
          completionFinished: false,
        }),
      ).toBe("failed");
    },
  );

  it("applies dragging and completion priorities", () => {
    expect(
      resolvePetState({
        runtime: runtime("failed", "critic"),
        dragging: true,
        completionFinished: false,
      }),
    ).toBe("dragging");
    expect(
      resolvePetState({
        runtime: runtime("completed"),
        dragging: false,
        completionFinished: false,
      }),
    ).toBe("completed");
    expect(
      resolvePetState({
        runtime: runtime("completed"),
        dragging: false,
        completionFinished: true,
      }),
    ).toBe("idle");
  });

  it("accepts complete independent sheets and preserves source frame timing", () => {
    const value = manifest();
    const parsed = parsePetManifest(value);
    expect(Object.keys(parsed.states)).toEqual(PET_ANIMATION_STATES);
    expect(parsed.states.search.frameDurationsMs).toEqual([100, 250, 150]);
    expect(parsed.states.completed.repeat).toBe(2);
    expect(parsed.states.search.posterFrame).toBe(1);
    expect(parsed.states.search.frameDurationsMs).not.toBe(
      value.states.search.frameDurationsMs,
    );
  });

  it("supports multirow actions without truncating after 12 frames", () => {
    const value = manifest();
    value.states.read = {
      ...value.states.read,
      rows: 2,
      frameCount: 13,
      frameDurationsMs: Array<number>(13).fill(80),
      posterFrame: 6,
    };
    expect(parsePetManifest(value).states.read.frameCount).toBe(13);
  });

  it.each([
    "missing-action",
    "duplicated-atlas",
    "mismatched-durations",
    "zero-duration",
    "wrong-grid",
    "invalid-poster",
    "endless-celebration",
    "external-asset",
  ])("rejects an unsafe identity switch: %s", (scenario) => {
    const value = manifest();
    switch (scenario) {
      case "missing-action":
        delete (value.states as Partial<PetManifest["states"]>).critic;
        break;
      case "duplicated-atlas":
        value.states.search.src = value.states.read.src;
        break;
      case "mismatched-durations":
        value.states.read.frameDurationsMs = [100];
        break;
      case "zero-duration":
        value.states.read.frameDurationsMs = [100, 0, 150];
        break;
      case "wrong-grid":
        value.states.read.rows = 2;
        break;
      case "invalid-poster":
        value.states.read.posterFrame = 3;
        break;
      case "endless-celebration":
        value.states.completed.loop = true;
        break;
      case "external-asset":
        value.states.read.src = "https://example.test/read.webp";
        break;
    }
    expect(() => parsePetManifest(value)).toThrow(/Fintech Robot/);
  });

  it("keeps the existing JSON as the fallback source while GIFs are pending", () => {
    expect(LEGACY_PET_MANIFEST.id).toBe("research-bot");
    expect(LEGACY_PET_MANIFEST.states.search.src).toContain("research-bot");
    expect(LEGACY_PET_MANIFEST.states.completed.repeat).toBe(2);
    for (const spec of Object.values(LEGACY_PET_MANIFEST.states)) {
      expect(spec.frameDurationsMs).toHaveLength(spec.frameCount);
      expect((spec.frameOffset ?? 0) + spec.frameCount).toBeLessThanOrEqual(
        spec.columns * spec.rows,
      );
    }
  });
});

function manifest(): PetManifest {
  return {
    schemaVersion: 2,
    id: "fintech-robot",
    displayName: "Fintech Robot",
    cell: { ...PET_CELL },
    previewSrc: "/pets/fintech-robot/preview.webp",
    states: Object.fromEntries<PetAnimationSpec>(
      PET_ANIMATION_STATES.map((state) => [
        state,
        {
          src: `/pets/fintech-robot/atlases/${state}.webp`,
          posterSrc: `/pets/fintech-robot/posters/${state}.webp`,
          columns: 12,
          rows: 1,
          frameCount: 3,
          frameDurationsMs: [100, 250, 150],
          loop: state !== "completed",
          ...(state === "completed" ? { repeat: 2 } : {}),
          posterFrame: 1,
        },
      ]),
    ) as PetManifest["states"],
  };
}
