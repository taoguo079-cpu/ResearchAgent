import { useTranslations } from "next-intl";

import { taskStageMessageKeys } from "@/i18n/task-labels";
import type { ReplayState } from "@/lib/events/types";

export function useStageProgress(state: ReplayState | null) {
  const t = useTranslations("task");
  if (state?.taskStatus === "cancelling") return t("cancellingProgress");
  const stage = state?.currentStage;
  if (!state || !stage) return t("queuedProgress");
  const current = state.stages[stage];
  const stageName = t(taskStageMessageKeys[stage]);
  if (state.taskStatus === "interrupted")
    return t("interruptedProgress", { stage: stageName });
  if (current.status === "failed" || state.taskStatus === "failed")
    return t("failedProgress", { stage: stageName });
  if (current.status === "cancelled" || state.taskStatus === "cancelled")
    return t("stoppedProgress", { stage: stageName });
  if (current.detail?.trim()) return current.detail;
  const count = (...keys: string[]) =>
    keys.map((key) => state.metrics[key]).find((value) => value !== undefined);
  if (stage === "orchestrate" && state.researchPlan.length) {
    return t("planProgress", { count: state.researchPlan.length });
  }
  if (stage === "search") {
    const found = count("papersDiscovered", "papers_discovered", "raw_papers");
    if (found !== undefined) return t("searchProgress", { count: found });
  }
  if (stage === "filter") {
    const selected = count(
      "papersSelected",
      "papers_selected",
      "selected_papers",
    );
    if (selected !== undefined) return t("filterProgress", { count: selected });
  }
  if (stage === "read" && state.metrics.read_total !== undefined) {
    return t("readProgress", {
      total: state.metrics.read_total,
      completed: state.metrics.read_completed ?? 0,
      succeeded: state.metrics.read_succeeded ?? 0,
      degraded: state.metrics.read_degraded ?? 0,
      failed: state.metrics.read_failed ?? 0,
    });
  }
  if (current.status === "completed")
    return t("completedProgress", { stage: stageName });
  return t(`stageProgress.${stage}`);
}
