"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { EvidenceRecord } from "@/features/evidence/evidence-index";
import { useUiStore } from "@/stores/ui-store";
import styles from "./evidence.module.css";

export function EvidenceItem({
  evidence,
  paper,
}: {
  evidence: EvidenceRecord;
  paper?: Record<string, unknown>;
}) {
  const t = useTranslations("evidence");
  const selectObject = useUiStore((state) => state.selectObject);
  const setContextTab = useUiStore((state) => state.setContextTab);
  const verified = evidence.verified !== false;
  const pageStart =
    typeof evidence.page_start === "number" ? evidence.page_start : null;
  const pageEnd =
    typeof evidence.page_end === "number" ? evidence.page_end : null;
  const paperId =
    typeof evidence.paper_id === "string" ? evidence.paper_id : "";
  return (
    <article className={styles.item}>
      <div className={styles.itemHeader}>
        <Badge variant={verified ? "success" : "warning"}>
          {verified ? t("verified") : t("unverified")}
        </Badge>
        <span>{String(evidence.content_type ?? "pdf")}</span>
      </div>
      <blockquote className={styles.excerpt}>
        {String(evidence.excerpt ?? t("noExcerpt"))}
      </blockquote>
      <div className={styles.source}>
        {paper ? (
          <span>{String(paper.title ?? paperId)}</span>
        ) : (
          <span>{paperId || t("unknownPaper")}</span>
        )}
        {pageStart !== null ? (
          <span>
            {t("page", {
              page: `${pageStart}${pageEnd !== null && pageEnd !== pageStart ? `–${pageEnd}` : ""}`,
            })}
          </span>
        ) : null}
      </div>
      {!verified ? (
        <p className={styles.warning}>
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5" />
          {t("unverifiedExcerpt")}
        </p>
      ) : null}
      {paperId ? (
        <button
          type="button"
          className={styles.openPaper}
          onClick={() => {
            selectObject(paperId);
            setContextTab("papers");
          }}
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          {t("openPaper")}
        </button>
      ) : null}
    </article>
  );
}
