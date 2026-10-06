"use client";

import {
  NativeRobotAnimation,
  type RobotAction,
} from "@/components/robot/native-robot-animation";
import type { ResearchStage, TaskStatus } from "@/lib/events/types";
import manifest from "@/public/research-robot/manifest.json";
import styles from "@/components/robot/native-robot-animation.module.css";

export function ResearchStageRobot({
  stage,
  status,
  className,
  paused = false,
}: {
  stage: ResearchStage | null;
  status?: TaskStatus;
  className?: string;
  paused?: boolean;
}) {
  const action: RobotAction =
    status === "completed"
      ? "completed"
      : status === "failed" || status === "interrupted"
        ? "failed"
        : stage
          ? (manifest.stages[stage] as RobotAction)
          : "thinking";
  return (
    <div
      className={`${styles.robot}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      data-testid="research-stage-robot"
      data-research-stage={stage ?? "orchestrate"}
      data-research-action={action}
      data-research-fps={manifest.assets[action].fps}
    >
      <NativeRobotAnimation action={action} paused={paused} />
    </div>
  );
}
