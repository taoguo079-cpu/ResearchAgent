"use client";

import ExternalLink from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { ResearchPaper } from "@/features/papers/paper-model";
import { useUiStore } from "@/stores/ui-store";
import { BookOpen, ArrowUpRight } from "lucide-react";
import styles from "./papers.module.css";

export type PaperCitationLink = {
  citationId: string;
  displayNumber?: number | null;
};

export function PaperDetail({
  paper,
  citations = [],
}: {
  paper: ResearchPaper | null;
  citations?: PaperCitationLink[];
}) {
  const t = useTranslations("papers");
  const selectObject = useUiStore((state) => state.selectObject);
  const setContextTab = useUiStore((state) => state.setContextTab);
  if (!paper) {
    return (
      <aside aria-label={t("detailTitle")} className={styles.empty}>
        <BookOpen aria-hidden="true" />
        <p>{t("selectToInspect")}</p>
      </aside>
    );
  }

  return (
    <aside aria-label={t("detailTitle")} className={styles.detail}>
      <div>
        <h2 className={styles.detailTitle}>{paper.title}</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>{paper.source}</Badge>
        {paper.year ? <Badge>{paper.year}</Badge> : null}
        {paper.selected ? (
          <Badge variant="success">{t("selected")}</Badge>
        ) : null}
        {paper.fullTextStatus === "full" ? (
          <Badge variant="success">{t("fullTextAvailable")}</Badge>
        ) : null}
        {paper.fullTextStatus === "full_no_abstract" ? (
          <Badge variant="warning">{t("fullNoAbstract")}</Badge>
        ) : null}
        {paper.fullTextStatus === "abstract_only" ? (
          <Badge variant="warning">{t("abstractOnly")}</Badge>
        ) : null}
        {paper.fullTextStatus === "unavailable" ? (
          <Badge variant="error">{t("unavailable")}</Badge>
        ) : null}
        {paper.fullTextStatus === "pdf_failed" ? (
          <Badge variant="error">{t("pdfFailed")}</Badge>
        ) : null}
      </div>
      <dl className={styles.detailMetadata}>
        <div>
          <dt>{t("authors")}</dt>
          <dd>{paper.authors.join(", ") || t("unknownAuthors")}</dd>
        </div>
        {paper.doi ? (
          <div className={styles.doi}>
            <dt>DOI</dt>
            <dd>{paper.doi}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t("citations")}</dt>
          <dd>{paper.citationCount ?? "—"}</dd>
        </div>
        {paper.relevanceScore !== null ? (
          <div>
            <dt>{t("relevance")}</dt>
            <dd>{paper.relevanceScore.toFixed(1)}</dd>
          </div>
        ) : null}
      </dl>
      <div>
        <h3>{t("abstract")}</h3>
        <p className={styles.abstract}>{paper.abstract || t("noAbstract")}</p>
      </div>
      {paper.fullTextStatus === "abstract_only" ? (
        <p className="text-sm text-[var(--color-warning)]">
          {t("abstractOnlyNotice")}
        </p>
      ) : null}
      {paper.fullTextStatus === "pdf_failed" ? (
        <p className="text-sm text-[var(--color-error)]">
          {t("pdfFailedNotice")}
        </p>
      ) : null}
      {paper.fullTextStatus === "full_no_abstract" ? (
        <p className="text-sm text-[var(--color-warning)]">
          {t("fullNoAbstractNotice")}
        </p>
      ) : null}
      {paper.fullTextStatus === "unavailable" ? (
        <p className="text-sm text-[var(--color-error)]">
          {t("unavailableNotice")}
        </p>
      ) : null}
      {paper.pdfUrl ? (
        <ExternalLink
          href={paper.pdfUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={styles.pdf}
        >
          {t("openPdf")}
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </ExternalLink>
      ) : null}
      {citations.length ? (
        <div className={styles.citationLinks}>
          <h3>{t("reportCitations")}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {citations.map((citation) => (
              <button
                key={citation.citationId}
                type="button"
                className={styles.citationLink}
                onClick={() => {
                  selectObject(citation.citationId);
                  setContextTab("evidence");
                }}
              >
                {t("citationNumber", {
                  number: citation.displayNumber ?? citation.citationId,
                })}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
