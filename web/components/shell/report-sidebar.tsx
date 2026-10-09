"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { ReportToc } from "@/components/report/report-toc";
import { TaskSidebar } from "@/components/shell/task-sidebar";
import { useReportNavigation } from "@/features/report/report-navigation";
import { useUiStore } from "@/stores/ui-store";
import styles from "./workspace-shell.module.css";

export function ReportSidebar({ taskId }: { taskId?: string }) {
  const navigation = useReportNavigation();
  const expandRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const isZen = useUiStore((state) =>
    Boolean(taskId && state.zenTaskId === taskId),
  );
  const isOpen = navigation?.isTaskSidebarOpen ?? false;
  const closeTaskSidebar = navigation?.closeTaskSidebar;
  const close = useCallback(() => {
    closeTaskSidebar?.();
    requestAnimationFrame(() => expandRef.current?.focus());
  }, [closeTaskSidebar]);

  useLayoutEffect(() => {
    if (isOpen && !isZen) collapseRef.current?.focus();
  }, [isOpen, isZen]);

  useEffect(() => {
    if (!isOpen || isZen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isZen, close]);

  if (!navigation?.report) return null;

  return (
    <div className={styles.reportSidebar} data-testid="report-sidebar">
      <div
        className={styles.reportTocSlot}
        inert={isOpen}
        aria-hidden={isOpen || undefined}
        style={{ visibility: isOpen ? "hidden" : undefined }}
      >
        <ReportToc
          headings={navigation.report.headingIndex.headings}
          loading={navigation.report.loading}
          onExpandTaskSidebar={navigation.toggleTaskSidebar}
          expandButtonRef={expandRef}
        />
      </div>
      {isOpen ? (
        <div className={styles.reportTaskOverlay}>
          <TaskSidebar
            taskId={taskId}
            onCollapse={close}
            collapseButtonRef={collapseRef}
          />
        </div>
      ) : null}
    </div>
  );
}
