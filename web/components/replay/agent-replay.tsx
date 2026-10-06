"use client";

import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EventInspector } from "@/components/replay/event-inspector";
import { EventTimeline } from "@/components/replay/event-timeline";
import { ReplayControls } from "@/components/replay/replay-controls";
import { ReplayStepper } from "@/components/replay/replay-stepper";
import { useTaskReplay } from "@/features/replay/hooks/use-task-replay";
import type { ResearchEvent } from "@/lib/events/types";
import { useTranslations } from "next-intl";
import styles from "./replay.module.css";

export function AgentReplay({
  taskId,
  events,
}: {
  taskId: string;
  events?: ResearchEvent[];
}) {
  const t = useTranslations("replay");
  const replay = useTaskReplay(taskId, { events });
  if (replay.isLoading)
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (replay.error)
    return (
      <div className="p-5">
        <InlineAlert tone="error">{t("loadError")}</InlineAlert>
      </div>
    );
  if (!replay.supported)
    return (
      <div className="p-5">
        <InlineAlert tone="info">{t("unsupported")}</InlineAlert>
      </div>
    );
  return (
    <section aria-label={t("title")} className={styles.replay}>
      <header className={styles.header}>
        <div>
          <h2>{t("title")}</h2>
          <p>
            {replay.isFinished
              ? t("finished")
              : t("cursor", {
                  cursor: replay.eventCursor,
                  status: replay.state.taskStatus,
                })}
            {replay.state.critic.attempt > 1
              ? ` · ${t("criticRevision", { attempt: replay.state.critic.attempt })}`
              : ""}
          </p>
        </div>
        <ReplayControls
          isPlaying={replay.isPlaying}
          speed={replay.speed}
          onPlay={replay.play}
          onPause={replay.pause}
          onPrevious={replay.previous}
          onNext={replay.next}
          onSpeedChange={replay.setSpeed}
        />
      </header>
      <ReplayStepper state={replay.state} onStage={replay.jumpToStage} />
      <EventTimeline
        events={replay.events}
        cursor={replay.cursor}
        onSeek={replay.seek}
      />
      <EventInspector event={replay.events[replay.cursor - 1]} />
    </section>
  );
}
