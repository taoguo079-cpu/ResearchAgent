"use client";

import { useUiStore } from "@/stores/ui-store";

export function exitTaskZen(taskId: string) {
  if (useUiStore.getState().zenTaskId !== taskId) return;
  useUiStore.getState().setZenTaskId(null);
  requestAnimationFrame(() => {
    document.getElementById(`enter-zen-${taskId}`)?.focus();
  });
}
