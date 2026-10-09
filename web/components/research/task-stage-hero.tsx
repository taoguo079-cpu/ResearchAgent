"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { CurrentStagePanel } from "@/components/research/current-stage-panel";
import { useStageProgress } from "@/features/tasks/hooks/use-stage-progress";
import { ResearchPlan } from "@/components/research/research-plan";
import {
  taskStageMessageKeys,
  taskStatusMessageKeys,
} from "@/i18n/task-labels";
import { RESEARCH_STAGES, type ReplayState } from "@/lib/events/types";
import styles from "./task-stage-hero.module.css";

export function TaskStageHero({ state }: { state: ReplayState }) {
  const t = useTranslations("task");
  const progress = useStageProgress(state);
  return (
    <section
      className={styles.hero}
      data-testid="task-stage-hero"
      aria-label={t("activeResearch")}
    >
      <div className={styles.stageOverview}>
        <h1 className={styles.stageTitle}>
          {state.currentStage
            ? t(taskStageMessageKeys[state.currentStage])
            : t("waitingToStart")}
        </h1>
        <p role="status" className={styles.stageStatus}>
          <span>
            {String(
              Math.max(
                0,
                RESEARCH_STAGES.indexOf(state.currentStage ?? "orchestrate"),
              ) + 1,
            ).padStart(2, "0")}{" "}
            / 07
          </span>
          <span>{t(taskStatusMessageKeys[state.taskStatus])}</span>
        </p>
        <p className={styles.stageDescription}>{progress}</p>
      </div>
      <div className={styles.detailsRail}>
        <details
          className={styles.stageDetails}
          data-testid="current-stage-details"
        >
          <summary>
            <span>
              {state.currentStage
                ? t(taskStageMessageKeys[state.currentStage])
                : t("waitingToStart")}
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <CurrentStagePanel state={state} />
        </details>
        <details
          className={styles.planDetails}
          data-testid="research-plan-details"
        >
          <summary>
            <span>{t("researchPlan")}</span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <ResearchPlan state={state} />
        </details>
      </div>
    </section>
  );
}
