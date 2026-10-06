"use client";

import {
  Check,
  Circle,
  CircleAlert,
  CircleX,
  LoaderCircle,
  Pause,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  ResearchStage,
  ReplayState,
  StageStatus,
} from "@/lib/events/types";
import { RESEARCH_STAGES } from "@/lib/events/types";
import {
  taskStageMessageKeys,
  taskStageStatusMessageKeys,
} from "@/i18n/task-labels";
import styles from "./workspace-task.module.css";

export function StageStepper({
  state,
  onSelectStage,
  variant = "default",
}: {
  state: ReplayState;
  onSelectStage?: (stage: ResearchStage) => void;
  variant?: "default" | "zen";
}) {
  const t = useTranslations("task");
  const stages = RESEARCH_STAGES;
  const Item = onSelectStage ? "button" : "div";
  return (
    <nav
      aria-label={t("stageDetail")}
      className={styles.stages}
      data-variant={variant}
    >
      {stages.map((stage) => {
        const snapshot = state.stages[stage];
        return (
          <Item
            key={stage}
            type={onSelectStage ? "button" : undefined}
            role={onSelectStage ? undefined : "group"}
            aria-label={
              t(taskStageMessageKeys[stage]) +
              " " +
              t(taskStageStatusMessageKeys[snapshot.status])
            }
            data-status={snapshot.status}
            aria-current={state.currentStage === stage ? "step" : undefined}
            data-interactive={Boolean(onSelectStage) || undefined}
            onClick={() => onSelectStage?.(stage)}
            className={styles.stage}
          >
            <span className={styles.stageNode}>
              <StageIcon status={snapshot.status} />
            </span>
            <span className={styles.stageName}>
              {t(taskStageMessageKeys[stage])}
            </span>
            {stage === "critic" && snapshot.attempt > 1 ? (
              <span className={styles.stageAttempt}>
                {t("attempt", { attempt: snapshot.attempt })}
              </span>
            ) : null}
          </Item>
        );
      })}
    </nav>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "running":
      return (
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      );
    case "completed":
      return (
        <Check
          aria-hidden="true"
          className="h-4 w-4 text-[var(--color-success)]"
        />
      );
    case "warning":
      return (
        <CircleAlert
          aria-hidden="true"
          className="h-4 w-4 text-[var(--color-warning)]"
        />
      );
    case "failed":
      return (
        <CircleX
          aria-hidden="true"
          className="h-4 w-4 text-[var(--color-error)]"
        />
      );
    case "cancelled":
      return (
        <Pause
          aria-hidden="true"
          className="h-4 w-4 text-[var(--color-text-muted)]"
        />
      );
    default:
      return <Circle aria-hidden="true" className="h-4 w-4" />;
  }
}
