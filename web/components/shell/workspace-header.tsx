"use client";

import { PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useTranslations } from "next-intl";

import { StopResearchButton } from "@/components/research/task-cancellation";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTask } from "@/features/tasks/hooks/use-task";
import { useUiStore } from "@/stores/ui-store";
import styles from "./workspace-shell.module.css";

export function WorkspaceHeader({ taskId }: { taskId?: string }) {
  const t = useTranslations();
  const isTaskSidebarOpen = useUiStore((state) => state.isTaskSidebarOpen);
  const isContextPanelOpen = useUiStore((state) => state.isContextPanelOpen);
  const toggleTaskSidebar = useUiStore((state) => state.toggleTaskSidebar);
  const toggleContextPanel = useUiStore((state) => state.toggleContextPanel);
  const setZenTaskId = useUiStore((state) => state.setZenTaskId);
  const taskQuery = useTask(taskId ?? "");
  const title = taskId
    ? (taskQuery.data?.title ?? t("task.researchTask"))
    : t("common.newResearch");

  return (
    <header className={styles.header}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!isTaskSidebarOpen ? (
          <Button
            aria-label={t("navigation.expandTaskSidebar")}
            onClick={toggleTaskSidebar}
            size="icon"
            variant="ghost"
            className="shrink-0"
          >
            <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p
              title={title}
              className="min-w-0 truncate text-[15px] font-semibold text-[var(--color-text)]"
            >
              {title}
            </p>
            {taskId ? (
              <Badge variant="info" className="shrink-0 whitespace-nowrap">
                {t("task.workspace")}
              </Badge>
            ) : null}
          </div>
          {taskId ? (
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              {taskQuery.data?.query ?? taskId}
              <span className="ml-2 text-[var(--color-text-subtle)]">
                {t("common.taskId")}: {taskId}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 [&>button]:shrink-0">
        {taskId ? (
          <Button
            id={`enter-zen-${taskId}`}
            aria-label={t("task.enterZen")}
            disabled={!taskQuery.data}
            onClick={() => setZenTaskId(taskId)}
            size="sm"
            variant="ghost"
          >
            {t("task.zen")}
          </Button>
        ) : null}
        <StopResearchButton />
        <Button
          aria-label={
            isContextPanelOpen
              ? t("common.collapseContext")
              : t("common.expandContext")
          }
          onClick={toggleContextPanel}
          size="icon"
          variant="ghost"
        >
          {isContextPanelOpen ? (
            <PanelRightClose aria-hidden="true" className="h-4 w-4" />
          ) : (
            <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
        <ThemeToggle />
        <LanguageSwitcher locked={Boolean(taskId)} />
      </div>
    </header>
  );
}
