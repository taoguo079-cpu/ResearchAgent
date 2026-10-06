"use client";

import type { ResearchStage, ReplayState } from "@/lib/events/types";
import { RESEARCH_STAGES } from "@/lib/events/types";
import { useTranslations } from "next-intl";
import {
  taskStageMessageKeys,
  taskStageStatusMessageKeys,
} from "@/i18n/task-labels";
import styles from "./replay.module.css";

export function ReplayStepper({
  state,
  onStage,
}: {
  state: ReplayState;
  onStage: (stage: ResearchStage) => void;
}) {
  const t = useTranslations();
  const taskT = useTranslations("task");
  return (
    <nav aria-label={t("replay.stageJump")} className={styles.stages}>
      {RESEARCH_STAGES.map((stage) => (
        <button
          key={stage}
          type="button"
          data-current={state.currentStage === stage}
          onClick={() => onStage(stage)}
          className={styles.stage}
        >
          <span>{taskT(taskStageMessageKeys[stage])}</span>
          <small>
            {taskT(taskStageStatusMessageKeys[state.stages[stage].status])}
          </small>
        </button>
      ))}
    </nav>
  );
}
