"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ContextPanel } from "@/components/shell/context-panel";
import { TaskSidebar } from "@/components/shell/task-sidebar";
import { WorkspaceHeader } from "@/components/shell/workspace-header";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { TaskConversation } from "@/components/research/task-conversation";
import { TaskEventsProvider } from "@/features/tasks/hooks/use-task-events";
import { TaskCancellationProvider } from "@/components/research/task-cancellation";
import { exitTaskZen } from "@/features/tasks/task-zen-mode";
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
        {content}
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
  const t = useTranslations("common");
  const isTaskSidebarOpen = useUiStore((state) => state.isTaskSidebarOpen);
  const isContextPanelOpen = useUiStore((state) => state.isContextPanelOpen);
  const toggleContextPanel = useUiStore((state) => state.toggleContextPanel);
  const zenTaskId = useUiStore((state) => state.zenTaskId);
  const isZen = Boolean(taskId && zenTaskId === taskId);
  const gridColumns = [
    isTaskSidebarOpen ? "222px" : "",
    "minmax(0,1fr)",
    isContextPanelOpen ? "310px" : "48px",
  ]
    .filter(Boolean)
    .join(" ");

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
      style={{ gridTemplateColumns: isZen ? "minmax(0,1fr)" : gridColumns }}
    >
      <div style={{ display: isZen ? "none" : "contents" }}>
        {isTaskSidebarOpen ? <TaskSidebar taskId={taskId} /> : null}
      </div>
      <main className={styles.main}>
        <div hidden={isZen}>
          <WorkspaceHeader taskId={taskId} />
        </div>
        {taskId ? (
          <TaskConversation key={taskId} taskId={taskId}>
            {children}
          </TaskConversation>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        )}
      </main>
      <div style={{ display: isZen ? "none" : "contents" }}>
        {isContextPanelOpen ? (
          <ContextPanel taskId={taskId} />
        ) : (
          <aside
            aria-label={t("expandContext")}
            className={styles.collapsedContext}
          >
            <Button
              aria-label={t("expandContext")}
              onClick={toggleContextPanel}
              size="icon"
              variant="ghost"
            >
              <span aria-hidden="true">‹</span>
            </Button>
          </aside>
        )}
      </div>
    </div>
  );
}
