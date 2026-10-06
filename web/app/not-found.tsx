"use client";

import { useTranslations } from "next-intl";
import { BrandRobot } from "@/components/entry/brand-robot";

import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils/cn";
import { Link } from "@/i18n/navigation";
import styles from "@/components/shell/not-found.module.css";

export default function NotFound() {
  const t = useTranslations();
  return (
    <main className={styles.page}>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
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
      <BrandRobot action="search" className={styles.robot} />
    </main>
  );
}
