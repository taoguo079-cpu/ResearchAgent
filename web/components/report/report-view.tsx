"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Minimize2 } from "lucide-react";

import { PaperDetail } from "@/components/papers/paper-detail";
import { PaperList } from "@/components/papers/paper-list";
import { ExportMenu } from "@/components/report/export-menu";
import { ReportDocument } from "@/components/report/report-document";
import { ReportSummary } from "@/components/report/report-summary";
import { AgentReplay } from "@/components/replay/agent-replay";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskResult } from "@/features/tasks/hooks/use-task-result";
import { exitTaskZen } from "@/features/tasks/task-zen-mode";
import {
  normalizePaper,
  type ResearchPaper,
} from "@/features/papers/paper-model";
import type { ResearchTaskResultResponse } from "@/lib/api/client";
import { useUiStore } from "@/stores/ui-store";
import { buildReportHeadingIndex } from "@/lib/markdown/report-headings";
import {
  useReportNavigation,
  type ReportTab,
} from "@/features/report/report-navigation";
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
  const navigation = useReportNavigation();
  const isReportRegistered = Boolean(navigation?.report);
  const hasResult = Boolean(result);
  const publishReport = navigation?.publishReport;
  const clearReport = navigation?.clearReport;
  const [localTab, setLocalTab] = useState<ReportTab>("report");
  const activeTab = navigation?.activeTab ?? localTab;
  const setActiveTab = navigation?.setActiveTab ?? setLocalTab;
  const isZen = useUiStore((state) => state.zenTaskId === taskId);
  const [readingMode, setReadingMode] = useState<{
    zen: boolean;
    tab: Exclude<ReportTab, "run">;
  }>({ zen: isZen, tab: activeTab === "papers" ? "papers" : "report" });
  if (readingMode.zen !== isZen) {
    setReadingMode({
      zen: isZen,
      tab: activeTab === "papers" ? "papers" : "report",
    });
  }
  const visibleTab = isZen ? readingMode.tab : activeTab;
  const exitRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (isZen) exitRef.current?.focus();
  }, [isZen, isReportRegistered, hasResult]);
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
  const loading = !result && !query.isError;
  useLayoutEffect(() => {
    publishReport?.({ headingIndex, loading });
  }, [publishReport, headingIndex, loading]);
  useLayoutEffect(() => () => clearReport?.(), [clearReport]);
  const selectObject = useUiStore((state) => state.selectObject);
  const setContextTab = useUiStore((state) => state.setContextTab);
  const t = useTranslations();
  const handleSelectPaper = (paper: ResearchPaper) => {
    setSelectedPaper(paper);
    selectObject(paper.id);
    setContextTab("papers");
  };
  const exitControl = isZen ? (
    <Button
      ref={exitRef}
      className={styles.exitZen}
      variant="ghost"
      onClick={() => exitTaskZen(taskId)}
      aria-label={t("task.exitZen")}
    >
      <Minimize2 aria-hidden="true" className="h-4 w-4" />
      {t("task.exitZen")}
    </Button>
  ) : null;

  if (!result) {
    if (query.isError)
      return (
        <div className={styles.report}>
          {exitControl}
          <InlineAlert tone="error">{t("report.noReport")}</InlineAlert>
        </div>
      );
    return (
      <div className={`${styles.report} gap-y-6`}>
        {exitControl}
        <p role="status" className="text-xs">
          {t("common.loading")}
        </p>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <article className={styles.report} data-zen={isZen || undefined}>
      <header className={styles.header} hidden={isZen}>
        <div>
          <h1 className={styles.title}>{t("report.synthesis")}</h1>
          <ReportSummary result={result} />
        </div>
        <ExportMenu taskId={taskId} />
      </header>
      <Tabs
        value={visibleTab}
        onValueChange={(value) => {
          if (isZen) {
            if (value === "report" || value === "papers")
              setReadingMode({ zen: true, tab: value });
          } else setActiveTab(value as ReportTab);
        }}
        className={styles.tabsRoot}
      >
        <div className={styles.readingToolbar}>
          <TabsList aria-label={t("report.views")} className={styles.tabs}>
            <TabsTrigger value="report" className={styles.tab}>
              {t("report.reportTab")}
            </TabsTrigger>
            <TabsTrigger value="papers" className={styles.tab}>
              {t("report.papersTab", { count: papers.length })}
            </TabsTrigger>
            {!isZen ? (
              <TabsTrigger value="run" className={styles.tab}>
                {t("report.runTab")}
              </TabsTrigger>
            ) : null}
          </TabsList>
          {exitControl}
        </div>
        <TabsContent value="report" className={styles.content}>
          <div className={styles.readingLayout}>
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
