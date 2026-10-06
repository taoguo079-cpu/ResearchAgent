import { Badge } from "@/components/ui/badge";
import type { ResearchPaper } from "@/features/papers/paper-model";
import { useTranslations } from "next-intl";
import styles from "./papers.module.css";

export function PaperRow({
  paper,
  selected = false,
  onSelect,
}: {
  paper: ResearchPaper;
  selected?: boolean;
  onSelect?: (paper: ResearchPaper) => void;
}) {
  const t = useTranslations("papers");
  return (
    <article className={styles.row} data-selected={selected}>
      <button
        type="button"
        aria-label={`Paper: ${paper.title}`}
        onClick={() => onSelect?.(paper)}
        className={styles.rowButton}
      >
        <div className={styles.rowTitle}>
          <h3>{paper.title}</h3>
          <Badge variant="neutral">{paper.source}</Badge>
        </div>
        <p className={styles.authors}>
          {paper.authors.join(", ") || t("unknownAuthors")}
        </p>
        {paper.abstract ? (
          <p className={styles.rowAbstract}>{paper.abstract}</p>
        ) : null}
        <div className={styles.metadata}>
          {paper.year ? <span>{paper.year}</span> : null}
          <span>
            {paper.citationCount === null
              ? "—"
              : `${paper.citationCount} ${t("citations").toLowerCase()}`}
          </span>
          {paper.relevanceScore !== null ? (
            <span>
              {t("relevanceValue", { value: paper.relevanceScore.toFixed(1) })}
            </span>
          ) : null}
          {paper.reportCitationCount > 0 ? (
            <Badge variant="info">
              {t("citedInReport", { count: paper.reportCitationCount })}
            </Badge>
          ) : null}
          {paper.selected ? (
            <Badge variant="success">{t("selected")}</Badge>
          ) : null}
          {paper.fullTextStatus === "abstract_only" ? (
            <Badge variant="warning">{t("abstractOnly")}</Badge>
          ) : null}
          {paper.fullTextStatus === "full" ? (
            <Badge variant="success">{t("fullTextAvailable")}</Badge>
          ) : null}
          {paper.fullTextStatus === "full_no_abstract" ? (
            <Badge variant="warning">{t("fullNoAbstract")}</Badge>
          ) : null}
          {paper.fullTextStatus === "unavailable" ? (
            <Badge variant="error">{t("unavailable")}</Badge>
          ) : null}
          {paper.fullTextStatus === "pdf_failed" ? (
            <Badge variant="error">{t("pdfFailed")}</Badge>
          ) : null}
        </div>
      </button>
    </article>
  );
}
