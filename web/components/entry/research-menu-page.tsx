"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { EntryLanguageSwitcher } from "@/components/entry/entry-language-switcher";
import { EntryTransitionLink } from "@/components/entry/entry-transition-link";
import { Link } from "@/i18n/navigation";
import styles from "./research-menu-page.module.css";

export default function ResearchMenuPage() {
  const t = useTranslations("entry");
  return (
    <main className={styles.page} data-testid="research-menu">
      <div className={styles.canvas}>
        <header className={styles.header}>
          <Link href="/workspace" className={styles.brand}>
            Research Agent
          </Link>
          <div className={styles.language}>
            <EntryLanguageSwitcher />
          </div>
        </header>
        <h1 className={styles.title}>{t("menuTitle")}</h1>
        <section className={styles.content} aria-label={t("menuTitle")}>
          <div className={styles.description}>
            <p>{t("partner")}</p>
            <p>{t("tagline")}</p>
          </div>
          <nav className={styles.actions} aria-label={t("menuTitle")}>
            <EntryTransitionLink href="/research/new" className={styles.action}>
              <span className={styles.number} aria-hidden="true">
                01
              </span>
              <span className={styles.label}>{t("newResearch")}</span>
              <ArrowRight aria-hidden="true" size={24} />
            </EntryTransitionLink>
            <Link href="/history" className={styles.action}>
              <span className={styles.number} aria-hidden="true">
                02
              </span>
              <span className={styles.label}>{t("history")}</span>
              <ArrowRight aria-hidden="true" size={24} />
            </Link>
            <Link href="/settings" className={styles.action}>
              <span className={styles.number} aria-hidden="true">
                03
              </span>
              <span className={styles.label}>{t("settings")}</span>
              <ArrowRight aria-hidden="true" size={24} />
            </Link>
          </nav>
        </section>
        <footer className={`${styles.metadata} swiss-meta`}>
          <span>{new Date().getFullYear()}</span>
          <span>{t("location")}</span>
        </footer>
      </div>
    </main>
  );
}
