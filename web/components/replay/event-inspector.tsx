import type { ResearchEvent } from "@/lib/events/types";
import { useTranslations } from "next-intl";
import styles from "./replay.module.css";

export function EventInspector({ event }: { event?: ResearchEvent }) {
  const t = useTranslations("replay");
  if (!event) return <p className={styles.empty}>{t("inspectorEmpty")}</p>;
  return (
    <section aria-label={t("eventInspector")} className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <h3>{event.event_type}</h3>
        <span>{t("sequence", { sequence: event.sequence })}</span>
      </div>
      <pre className={styles.payload}>
        {JSON.stringify(event.payload, null, 2)}
      </pre>
    </section>
  );
}
