"use client";

import { useTranslations } from "next-intl";
import { WorkspacePage } from "@/components/shell/workspace-page";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Link } from "@/i18n/navigation";
import styles from "@/components/shell/not-found.module.css";

export default function NotFound() {
  const t = useTranslations();
  return (
    <WorkspacePage>
      <section className={styles.content}>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>{t("task.notFound")}</h1>
        <p className={styles.description}>{t("task.loadError")}</p>
        <div className={styles.actions}>
          <Link
            href="/workspace"
            className={cn(
              buttonVariants({ variant: "primary" }),
              styles.action,
            )}
          >
            {t("common.home")}
          </Link>
          <Link
            href="/history"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              styles.action,
            )}
          >
            {t("common.history")}
          </Link>
        </div>
      </section>
    </WorkspacePage>
  );
}
