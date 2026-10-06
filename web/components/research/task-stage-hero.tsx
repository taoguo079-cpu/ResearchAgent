"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { CurrentStagePanel } from "@/components/research/current-stage-panel";
import { ResearchPlan } from "@/components/research/research-plan";
import { ResearchStageRobot } from "@/components/research/research-stage-robot";
import { taskStageMessageKeys } from "@/i18n/task-labels";
import type { ReplayState } from "@/lib/events/types";
import { useUiStore } from "@/stores/ui-store";
import styles from "./task-stage-hero.module.css";

export function TaskStageHero({ state }: { state: ReplayState }) {
  const t = useTranslations("task");
  const isZen = useUiStore((store) => store.zenTaskId === state.taskId);
  return (
    <section
      className={styles.hero}
      data-testid="task-stage-hero"
      aria-label={t("activeResearch")}
    >
      <div className={styles.robotArea}>
        <ResearchStageRobot
          stage={state.currentStage}
          status={state.taskStatus}
          paused={isZen}
          className={styles.robot}
        />
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
          <ResearchPlan />
        </details>
      </div>
    </section>
  );
}
