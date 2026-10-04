"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { BrandRobot } from "@/components/entry/brand-robot";
import { EntryLanguageSwitcher } from "@/components/entry/entry-language-switcher";

import {
  ResearchComposer,
  ResearchComposerSkeleton,
} from "@/components/research/research-composer";
import { InlineAlert } from "@/components/ui/inline-alert";
import { buttonVariants } from "@/components/ui/button";
import { useActiveTask } from "@/features/tasks/hooks/use-active-task";
import { Link, useRouter } from "@/i18n/navigation";
import { taskStatusMessageKeys } from "@/i18n/task-labels";
import { cn } from "@/lib/utils/cn";

import styles from "./research-entry.module.css";

export default function ResearchHomePage() {
  const router = useRouter();
  const t = useTranslations();
  const activeTask = useActiveTask();

  return (
    <main className={styles.page} data-testid="research-question-page">
      <div className={styles.scene}>
        <nav className={styles.navigation}>
          <Link href="/workspace" className={styles.back}>
            <span aria-hidden="true">←</span>
            {t("entry.backToMenu")}
          </Link>
          <EntryLanguageSwitcher />
        </nav>
        <div className={styles.content}>
          {activeTask.isPending ? <ResearchComposerSkeleton /> : null}
          {!activeTask.isPending && activeTask.data ? (
            <ActiveTaskSummary task={activeTask.data} />
          ) : null}
          {!activeTask.isPending && !activeTask.data ? (
            <>
              {activeTask.isError ? (
                <InlineAlert tone="warning" className="mb-4">
                  {t("composer.activeUnavailable")}
                </InlineAlert>
              ) : null}
              <ResearchComposer
                onCreated={(taskId) =>
                  router.push(`/research/${encodeURIComponent(taskId)}`)
                }
              />
            </>
          ) : null}
        </div>
        <BrandRobot action="filter" flip className={styles.robot} />
      </div>
    </main>
  );
}

function ActiveTaskSummary({
  task,
}: {
  task: {
    id: string;
    title: string;
    query: string;
    status: keyof typeof taskStatusMessageKeys;
  };
}) {
  const t = useTranslations();
  const taskT = useTranslations("task");
  return (
    <section className={styles.active}>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-primary)]">
        {t("task.activeResearch")}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
        {task.title}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-[var(--color-text-muted)]">
        {task.query}
      </p>
      <p className="mt-4 text-xs text-[var(--color-text-subtle)]">
        {taskT("statusLabel")}: {taskT(taskStatusMessageKeys[task.status])}
      </p>
      <Link
        href={`/research/${encodeURIComponent(task.id)}`}
        className={cn(buttonVariants({ variant: "primary" }), "mt-6")}
      >
        {t("task.returnToTask")}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}
