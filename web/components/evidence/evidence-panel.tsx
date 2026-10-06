"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { EvidenceItem } from "@/components/evidence/evidence-item";
import { InlineAlert } from "@/components/ui/inline-alert";
import { buildEvidenceIndex } from "@/features/evidence/evidence-index";
import type { ResearchTaskResultResponse } from "@/lib/api/client";
import { useUiStore } from "@/stores/ui-store";
import { FileSearch } from "lucide-react";
import styles from "./evidence.module.css";

export function EvidencePanel({
  result,
}: {
  result?: ResearchTaskResultResponse;
}) {
  const t = useTranslations("evidence");
  const selectedObjectId = useUiStore((state) => state.selectedObjectId);
  const index = useMemo(() => buildEvidenceIndex(result), [result]);
  const citation = selectedObjectId
    ? index.citations.get(selectedObjectId)
    : undefined;
  const evidence = selectedObjectId
    ? (index.evidenceByCitation.get(selectedObjectId) ?? [])
    : [];

  if (!result) {
    return (
      <div className={styles.empty}>
        <FileSearch aria-hidden="true" />
        <p>{t("pending")}</p>
      </div>
    );
  }
  if (!result.capabilities?.supports_evidence && !result.evidence?.length) {
    return (
      <div className={styles.empty}>
        <FileSearch aria-hidden="true" />
        <p>{t("unsupported")}</p>
      </div>
    );
  }
  if (!citation) {
    return (
      <div className={styles.empty}>
        <FileSearch aria-hidden="true" />
        <p>{t("empty")}</p>
      </div>
    );
  }
  return (
    <section aria-label={t("details")} className={styles.panel}>
      <div>
        <h3 className={styles.title}>
          {t("citation", {
            number: String(citation.display_number ?? citation.citation_id),
          })}
        </h3>
        {citation.valid === false ? (
          <InlineAlert tone="warning" className="mt-2">
            {t("citationUnverified")}
          </InlineAlert>
        ) : null}
      </div>
      {evidence.length ? (
        evidence.map((item) => (
          <EvidenceItem
            key={String(item.evidence_id)}
            evidence={item}
            paper={index.papers.get(String(item.paper_id))}
          />
        ))
      ) : (
        <p className="text-sm">{t("noLinkedEvidence")}</p>
      )}
    </section>
  );
}
