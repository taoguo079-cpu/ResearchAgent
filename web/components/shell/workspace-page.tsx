"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { EntryTransitionLink } from "@/components/entry/entry-transition-link";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

import styles from "./workspace-page.module.css";

/** Shared navigation for the full-width library and preference pages. */
export function WorkspacePage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <main className={cn(styles.page, className)}>
      <nav
        className={styles.navigation}
        aria-label={t("navigation.workspaceLinks")}
      >
        <EntryTransitionLink
          href="/workspace"
          direction="backward"
          className={styles.back}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          {t("entry.backToMenu")}
        </EntryTransitionLink>
        <div className={styles.links}>
          <Link
            href="/history"
            aria-current={pathname === "/history" ? "page" : undefined}
          >
            {t("navigation.history")}
          </Link>
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            {t("settings.title")}
          </Link>
          <div className={styles.preferences}>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
