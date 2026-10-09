import { useTranslations } from "next-intl";
import type { ReplayState } from "@/lib/events/types";
import styles from "./workspace-task.module.css";

export function ResearchPlan({ state }: { state: ReplayState }) {
  const t = useTranslations("task");
  return (
    <section className={styles.plan}>
      <h2>{t("researchPlan")}</h2>
      {state.researchPlan.length ? (
        <ol className={styles.planSteps}>
          {state.researchPlan.map((step, index) => (
            <li key={`${index}:${step}`}>{step}</li>
          ))}
        </ol>
      ) : (
        <p>
          {t(
            state.artifacts.planAvailable
              ? "researchPlanUnavailable"
              : "researchPlanPlaceholder",
          )}
        </p>
      )}
    </section>
  );
}
