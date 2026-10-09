"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { PaperDetail } from "@/components/papers/paper-detail";
import { PaperList } from "@/components/papers/paper-list";
import { ExportMenu } from "@/components/report/export-menu";
import { ReportDocument } from "@/components/report/report-document";
import { ReportSummary } from "@/components/report/report-summary";
import { ReportToc } from "@/components/report/report-toc";
import { AgentReplay } from "@/components/replay/agent-replay";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskResult } from "@/features/tasks/hooks/use-task-result";
import {
  normalizePaper,
  type ResearchPaper,
} from "@/features/papers/paper-model";
import type { ResearchTaskResultResponse } from "@/lib/api/client";
import { useUiStore } from "@/stores/ui-store";
import { buildReportHeadingIndex } from "@/lib/markdown/report-headings";
import styles from "./report-view.module.css";

const statisticLabels = {
  papers_count: "report.statistics.papersCount",
  selected_papers_count: "report.statistics.selectedPapersCount",
  paper_insights_count: "report.statistics.paperInsightsCount",
  papers_read: "report.statistics.papersRead",
  paper_claims_count: "report.statistics.paperClaimsCount",
  analysis_findings_count: "report.statistics.analysisFindingsCount",
  duration_ms: "report.statistics.durationMs",
} as const;

export function ReportView({
  taskId,
  result: providedResult,
}: {
  taskId: string;
  result?: ResearchTaskResultResponse;
}) {
  const query = useTaskResult(taskId, !providedResult);
  const result = providedResult ?? query.data;
  const headingIndex = useMemo(
    () => buildReportHeadingIndex(result?.report_markdown ?? ""),
    [result?.report_markdown],
  );
  const papers = useMemo(
    () =>
      (result?.papers ?? []).map((paper, index) =>
        normalizePaper(paper, index),
      ),
    [result?.papers],
  );
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(
    null,
  );
  const selectObject = useUiStore((state) => state.selectObject);
  const setContextTab = useUiStore((state) => state.setContextTab);
  const t = useTranslations();
  const handleSelectPaper = (paper: ResearchPaper) => {
    setSelectedPaper(paper);
    selectObject(paper.id);
    setContextTab("papers");
  };

  if (!result) {
    if (query.isError)
      return (
        <div className={styles.report}>
          <InlineAlert tone="error">{t("report.noReport")}</InlineAlert>
        </div>
      );
    return (
      <div className={`${styles.report} gap-y-6`}>
        <p role="status" className="text-xs">
          {t("common.loading")}
        </p>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <article className={styles.report}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("report.synthesis")}</h1>
          <ReportSummary result={result} />
        </div>
        <ExportMenu taskId={taskId} />
      </header>
      <Tabs defaultValue="report" className={styles.tabsRoot}>
        <TabsList aria-label={t("report.views")} className={styles.tabs}>
          <TabsTrigger value="report" className={styles.tab}>
            {t("report.reportTab")}
          </TabsTrigger>
          <TabsTrigger value="papers" className={styles.tab}>
            {t("report.papersTab", { count: papers.length })}
          </TabsTrigger>
          <TabsTrigger value="run" className={styles.tab}>
            {t("report.runTab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="report" className={styles.content}>
          <div className={styles.readingLayout}>
            <ReportToc headings={headingIndex.headings} />
            <div className={styles.readingBody}>
              <ReportDocument
                markdown={result.report_markdown}
                headingIndex={headingIndex}
                variant="report"
                result={result}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="papers" className={styles.content}>
          <div className={styles.paperLayout}>
            <PaperList
              papers={papers}
              selectedPaperId={selectedPaper?.id}
              onSelect={handleSelectPaper}
            />
            <div className={styles.paperDetail}>
              <PaperDetail
                paper={selectedPaper}
                citations={(result.citations ?? [])
                  .filter((citation) => citation.paper_id === selectedPaper?.id)
                  .map((citation) => ({
                    citationId: citation.citation_id,
                    displayNumber: citation.display_number,
                  }))}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="run" className={styles.content}>
          <section className={styles.run}>
            <h2>{t("report.runTab")}</h2>
            <dl className={styles.statistics}>
              {Object.entries(result.statistics ?? {})
                .filter(
                  ([key]) =>
                    !["critique_score", "critique_round"].includes(key),
                )
                .map(([key, value]) => (
                  <div key={key} className={styles.statistic}>
                    <dt>
                      {key in statisticLabels
                        ? t(
                            statisticLabels[
                              key as keyof typeof statisticLabels
                            ],
                          )
                        : key}
                    </dt>
                    <dd>
                      {typeof value === "string" || typeof value === "number"
                        ? String(value)
                        : t("common.notAvailable")}
                    </dd>
                  </div>
                ))}
            </dl>
            <details className={styles.replayDisclosure}>
              <summary>{t("report.runReplay")}</summary>
              <AgentReplay taskId={taskId} />
            </details>
          </section>
        </TabsContent>
      </Tabs>
    </article>
  );
}
