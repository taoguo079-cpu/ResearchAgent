"use client";

import { useEffect, type ReactNode } from "react";

import { ContextPanel } from "@/components/shell/context-panel";
import { ReportSidebar } from "@/components/shell/report-sidebar";
import { TaskSidebar } from "@/components/shell/task-sidebar";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { useUiStore } from "@/stores/ui-store";
import { TaskConversation } from "@/components/research/task-conversation";
import { TaskEventsProvider } from "@/features/tasks/hooks/use-task-events";
import { TaskCancellationProvider } from "@/components/research/task-cancellation";
import { exitTaskZen } from "@/features/tasks/task-zen-mode";
import {
  ReportNavigationProvider,
  useReportNavigation,
} from "@/features/report/report-navigation";
import styles from "./workspace-shell.module.css";

export function ResearchShell({
  children,
  taskId,
}: {
  children: ReactNode;
  taskId?: string;
}) {
  const content = (
    <ResearchShellLayout taskId={taskId}>{children}</ResearchShellLayout>
  );
  return taskId ? (
    <TaskEventsProvider taskId={taskId}>
      <TaskCancellationProvider key={taskId} taskId={taskId}>
        <ReportNavigationProvider key={taskId}>
          {content}
        </ReportNavigationProvider>
      </TaskCancellationProvider>
    </TaskEventsProvider>
  ) : (
    content
  );
}

function ResearchShellLayout({
  children,
  taskId,
}: {
  children: ReactNode;
  taskId?: string;
}) {
  const storedTaskSidebarOpen = useUiStore((state) => state.isTaskSidebarOpen);
  const navigation = useReportNavigation();
  const isReportReading = Boolean(
    navigation?.report && navigation.activeTab === "report",
  );
  const isTaskSidebarOpen = navigation?.report
    ? navigation.isTaskSidebarOpen
    : storedTaskSidebarOpen;
  const isContextPanelOpen = useUiStore((state) => state.isContextPanelOpen);
  const zenTaskId = useUiStore((state) => state.zenTaskId);
  const isZen = Boolean(taskId && zenTaskId === taskId);

  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    useUiStore.getState().setZenTaskId(null);
    return () => {
      if (useUiStore.getState().zenTaskId === taskId) {
        useUiStore.getState().setZenTaskId(null);
      }
    };
  }, [taskId]);

  useEffect(() => {
    if (!isZen || !taskId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exitTaskZen(taskId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZen, taskId]);

  return (
    <div
      className={styles.shell}
      data-zen={isZen || undefined}
      data-sidebar={isTaskSidebarOpen ? "open" : "closed"}
      data-left-rail={isReportReading || isTaskSidebarOpen ? "open" : "closed"}
      data-context={isContextPanelOpen ? "open" : "closed"}
    >
      <div style={{ display: isZen ? "none" : "contents" }}>
        {isReportReading ? (
          <ReportSidebar taskId={taskId} />
        ) : isTaskSidebarOpen ? (
          <TaskSidebar
            taskId={taskId}
            onCollapse={
              navigation?.report ? navigation.toggleTaskSidebar : undefined
            }
          />
        ) : null}
      </div>
      <main className={styles.main}>
        <div hidden={isZen} className={styles.headerSlot}>
          <WorkspaceHeader taskId={taskId} />
        </div>
        {taskId ? (
          <TaskConversation key={taskId} taskId={taskId}>
            {children}
          </TaskConversation>
        ) : (
          <div className={styles.content}>{children}</div>
        )}
      </main>
      <div style={{ display: isZen ? "none" : "contents" }}>
        {isContextPanelOpen ? <ContextPanel taskId={taskId} /> : null}
      </div>
    </div>
  );
}
