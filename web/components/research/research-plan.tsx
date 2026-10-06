import { useTranslations } from "next-intl";
import styles from "./workspace-task.module.css";

export function ResearchPlan() {
  const t = useTranslations("task");
  return (
    <section className={styles.plan}>
      <h2>{t("researchPlan")}</h2>
      <p>{t("researchPlanPlaceholder")}</p>
    </section>
  );
}
