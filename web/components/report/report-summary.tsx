import { FileWarning } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ResearchTaskResultResponse } from "@/lib/api/client";
import styles from "./report-view.module.css";

export function ReportSummary({
  result,
}: {
  result: ResearchTaskResultResponse;
}) {
  const t = useTranslations("report");
  const papersRead =
    typeof result.statistics?.papers_read === "number"
      ? result.statistics.papers_read
      : (result.papers?.length ?? 0);

  return (
    <div className={styles.summary}>
      <span>{t("papersRead", { count: papersRead })}</span>
      {result.partial ? (
        <span className="inline-flex items-center gap-1 text-[var(--color-warning)]">
          <FileWarning aria-hidden="true" className="h-3.5 w-3.5" />{" "}
          {t("partialResult")}
        </span>
      ) : null}
    </div>
  );
}
