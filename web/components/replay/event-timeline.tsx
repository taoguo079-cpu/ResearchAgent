"use client";

import type { ResearchEvent } from "@/lib/events/types";
import { useTranslations } from "next-intl";
import styles from "./replay.module.css";

export function EventTimeline({
  events,
  cursor,
  onSeek,
}: {
  events: readonly ResearchEvent[];
  cursor: number;
  onSeek: (cursor: number) => void;
}) {
  const t = useTranslations("replay");
  return (
    <section aria-label={t("eventTimeline")} className={styles.timeline}>
      <div className={styles.timelineLabels}>
        <span>
          {t("eventCount", { current: cursor, total: events.length })}
        </span>
        <span>{events[cursor - 1]?.event_type ?? t("ready")}</span>
      </div>
      <input
        aria-label={t("seek")}
        type="range"
        min={0}
        max={events.length}
        value={cursor}
        onChange={(event) => onSeek(Number(event.target.value))}
        className={styles.range}
      />
      <div className={styles.events}>
        {events.map((event, index) => (
          <button
            key={event.sequence}
            type="button"
            data-played={index < cursor}
            aria-label={t("goToEvent", { sequence: event.sequence })}
            onClick={() => onSeek(index + 1)}
            className={styles.event}
          />
        ))}
      </div>
    </section>
  );
}
