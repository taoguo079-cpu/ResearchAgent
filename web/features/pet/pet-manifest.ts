import legacyManifest from "@/public/pets/research-bot/manifest.json";
import {
  RESEARCH_STAGES,
  type ResearchStage,
  type TaskStatus,
} from "@/lib/events/types";

export type PetAnimationState =
  "idle" | ResearchStage | "dragging" | "completed" | "failed";

export const PET_ANIMATION_STATES: readonly PetAnimationState[] = [
  "idle",
  ...RESEARCH_STAGES,
  "dragging",
  "completed",
  "failed",
];

export const PET_MANIFEST_SRC = "/pets/fintech-robot/manifest.json";
export const PET_CELL = { width: 192, height: 208 } as const;

export type PetAnimationSpec = {
  src: string;
  posterSrc: string;
  columns: number;
  rows: number;
  frameCount: number;
  frameDurationsMs: readonly number[];
  loop: boolean;
  repeat?: number;
  posterFrame: number;
  /** Only the retained legacy sheet has an action offset. New sheets begin at zero. */
  frameOffset?: number;
};

export type PetManifest = {
  schemaVersion: 2;
  id: string;
  displayName: string;
  cell: { width: number; height: number };
  previewSrc: string;
  states: Record<PetAnimationState, PetAnimationSpec>;
};

/** Keep the current pet until a complete manifest built from genuine GIFs exists. */
export const LEGACY_PET_MANIFEST: PetManifest = {
  schemaVersion: 2,
  id: legacyManifest.id,
  displayName: legacyManifest.displayName,
  cell: legacyManifest.cell,
  previewSrc: `/pets/research-bot/${legacyManifest.preview}`,
  states: Object.fromEntries<PetAnimationSpec>(
    PET_ANIMATION_STATES.map((state) => {
      const legacy = legacyManifest.states[state];
      return [
        state,
        {
          src: `/pets/research-bot/${legacyManifest.spritesheet}`,
          posterSrc: `/pets/research-bot/${legacyManifest.preview}`,
          columns: legacyManifest.grid.columns,
          rows: legacyManifest.grid.rows,
          frameOffset: legacy.row * legacyManifest.grid.columns,
          frameCount: legacy.frameCount,
          frameDurationsMs: Array<number>(legacy.frameCount).fill(
            legacy.frameDurationMs,
          ),
          loop: legacy.loop,
          repeat: "repeat" in legacy ? legacy.repeat : undefined,
          posterFrame: legacy.posterFrame,
        },
      ];
    }),
  ) as PetManifest["states"],
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function assetPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/pets/fintech-robot/") &&
    !value.includes("..") &&
    !/[?#\\]/.test(value)
  );
}

/** Read playback metadata from the generated asset manifest, never a second table. */
export function parsePetManifest(value: unknown): PetManifest {
  if (
    !record(value) ||
    value.schemaVersion !== 2 ||
    value.id !== "fintech-robot" ||
    typeof value.displayName !== "string" ||
    !record(value.cell) ||
    value.cell.width !== PET_CELL.width ||
    value.cell.height !== PET_CELL.height ||
    (value.previewSrc !== undefined && !assetPath(value.previewSrc)) ||
    !record(value.states)
  ) {
    throw new Error("Invalid Fintech Robot manifest");
  }

  const states = {} as PetManifest["states"];
  for (const state of PET_ANIMATION_STATES) {
    const spec = value.states[state];
    if (
      !record(spec) ||
      !assetPath(spec.src) ||
      !assetPath(spec.posterSrc) ||
      spec.columns !== 12 ||
      !positiveInteger(spec.rows) ||
      !positiveInteger(spec.frameCount) ||
      spec.frameCount > spec.columns * spec.rows ||
      spec.rows !== Math.ceil(spec.frameCount / spec.columns) ||
      !Array.isArray(spec.frameDurationsMs) ||
      spec.frameDurationsMs.length !== spec.frameCount ||
      !spec.frameDurationsMs.every(positiveInteger) ||
      typeof spec.loop !== "boolean" ||
      typeof spec.posterFrame !== "number" ||
      !Number.isSafeInteger(spec.posterFrame) ||
      spec.posterFrame !== Math.floor(spec.frameCount / 2) ||
      (state === "completed"
        ? spec.loop || spec.repeat !== 2
        : !spec.loop || (spec.repeat !== undefined && spec.repeat !== 1))
    ) {
      throw new Error(`Invalid Fintech Robot animation: ${state}`);
    }
    states[state] = {
      src: spec.src,
      posterSrc: spec.posterSrc,
      columns: spec.columns,
      rows: spec.rows,
      frameCount: spec.frameCount,
      frameDurationsMs: [...spec.frameDurationsMs],
      loop: spec.loop,
      ...(spec.repeat === undefined ? {} : { repeat: spec.repeat as number }),
      posterFrame: spec.posterFrame,
    };
  }
  if (
    new Set(Object.values(states).map((spec) => spec.src)).size !==
    PET_ANIMATION_STATES.length
  ) {
    throw new Error("Fintech Robot animations must have separate atlases");
  }
  return {
    schemaVersion: 2,
    id: value.id,
    displayName: value.displayName,
    cell: { ...PET_CELL },
    previewSrc: value.previewSrc ?? states.idle.posterSrc,
    states,
  };
}

export type PetRuntimeSnapshot = {
  taskId: string | null;
  taskStatus: TaskStatus | null;
  currentStage: ResearchStage | null;
  updatedAt: number;
};

const failureStatuses = new Set<TaskStatus>([
  "cancelling",
  "failed",
  "cancelled",
  "interrupted",
]);

export function resolvePetState({
  runtime,
  dragging,
  completionFinished,
}: {
  runtime: PetRuntimeSnapshot;
  dragging: boolean;
  completionFinished: boolean;
}): PetAnimationState {
  if (dragging) return "dragging";
  if (runtime.taskStatus && failureStatuses.has(runtime.taskStatus)) {
    return "failed";
  }
  if (runtime.taskStatus === "completed") {
    return completionFinished ? "idle" : "completed";
  }
  if (runtime.taskStatus === "running" && runtime.currentStage) {
    return runtime.currentStage;
  }
  return "idle";
}
