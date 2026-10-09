import type { ReplayState } from "@/lib/events/types";
import { taskStageMessageKeys } from "@/i18n/task-labels";
import { useTranslations } from "next-intl";
import { useStageProgress } from "@/features/tasks/hooks/use-stage-progress";
import styles from "./workspace-task.module.css";

export function CurrentStagePanel({ state }: { state: ReplayState }) {
  const t = useTranslations("task");
  const stage = state.currentStage ? state.stages[state.currentStage] : null;
  const progress = useStageProgress(state);
  return (
    <section className={styles.currentStage}>
      <h2>
        {state.currentStage
          ? t(taskStageMessageKeys[state.currentStage])
          : t("waitingToStart")}
      </h2>
      <p>{progress}</p>
      {state.currentStage === "read" &&
      stage?.detail?.trim() &&
      state.metrics.read_total !== undefined ? (
        <p role="status" className={styles.readProgress}>
          {t("readProgress", {
            total: state.metrics.read_total,
            completed: state.metrics.read_completed ?? 0,
            succeeded: state.metrics.read_succeeded ?? 0,
            degraded: state.metrics.read_degraded ?? 0,
            failed: state.metrics.read_failed ?? 0,
          })}
        </p>
      ) : null}
    </section>
  );
}
