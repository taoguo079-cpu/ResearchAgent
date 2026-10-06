import type { ResearchStage, TaskStatus } from "@/lib/events/types";

export const PET_ANIMATION_STATES = ["completed", "dragging"] as const;
export type PetAnimationState = (typeof PET_ANIMATION_STATES)[number];

// Both actions use the canonical native60fps assets, with no GIF/atlas fallback.
export const PET_ANIMATIONS = {
  completed: "completed",
  dragging: "flying",
} as const;

export function resolvePetState({
  dragging,
  moving,
}: {
  dragging: boolean;
  moving: boolean;
}): PetAnimationState {
  return dragging || moving ? "dragging" : "completed";
}

// Retained task tracker data does not determine the companion's animation.
export type PetRuntimeSnapshot = {
  taskId: string | null;
  taskStatus: TaskStatus | null;
  currentStage: ResearchStage | null;
  updatedAt: number;
};
