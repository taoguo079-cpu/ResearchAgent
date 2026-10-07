import { InlineAlert } from "@/components/ui/inline-alert";
import type { ResearchTaskResultResponse } from "@/lib/api/client";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import styles from "./report-view.module.css";

export function QualityReview({
  result,
}: {
  result: ResearchTaskResultResponse;
}) {
  const t = useTranslations("report");
  const warnings = result.warnings ?? [];
  const critiqueSummary =
    typeof result.critique?.summary === "string"
      ? result.critique.summary
      : null;

  if (!result.partial && !warnings.length && !critiqueSummary) return null;
  return (
    <details className={styles.qualityDisclosure}>
      <summary>
        <span>
          {t("qualityReview")}
          {result.partial ? ` · ${t("partialResult")}` : ""}
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </summary>
      <div className="space-y-2 pb-4">
        {result.partial || warnings.length ? (
          <InlineAlert tone="warning">
            <span className="space-y-1">
              {result.partial ? (
                <span className="block">{t("partialDescription")}</span>
              ) : null}
              {warnings.map((warning) => (
                <span className="block" key={warning}>
                  {warning}
                </span>
              ))}
            </span>
          </InlineAlert>
        ) : null}
        {critiqueSummary ? (
          <div className={styles.review}>
            {t("criticReview")}: {critiqueSummary}
          </div>
        ) : null}
      </div>
    </details>
  );
}
