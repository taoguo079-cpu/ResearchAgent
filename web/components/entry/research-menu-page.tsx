"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { BrandRobot } from "@/components/entry/brand-robot";
import { EntryLanguageSwitcher } from "@/components/entry/entry-language-switcher";
import { DesignText } from "@/components/entry/design-text";
import { Link } from "@/i18n/navigation";
import styles from "./entry.module.css";

function SearchDrawing() {
  return (
    <Image
      src="/brand-robot/search-drawing.svg"
      width={132}
      height={200}
      alt=""
      aria-hidden="true"
      unoptimized
    />
  );
}

function BookDrawing() {
  return (
    <svg
      viewBox="0 0 150 115"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      <path d="M74 24C54 10 31 6 20 7v84c20 0 37 6 54 16V24Zm5 0c20-14 43-18 54-17v84c-20 0-37 6-54 16V24Z" />
      <path d="M13 27H4v77c18-3 38-2 54 3M139 27h9v77c-18-3-38-2-54 3M14 24v73c17-1 31 2 46 7m78-80v73c-17-1-31 2-46 7" />
    </svg>
  );
}

export default function ResearchMenuPage() {
  const t = useTranslations("entry");
  return (
    <main className={styles.menuPage} data-testid="research-menu">
      <div className={styles.menuCanvas}>
        <h1 className="sr-only">{t("menuTitle")}</h1>
        <div className={styles.languagePosition}>
          <EntryLanguageSwitcher />
        </div>
        <nav className={styles.menuLinks} aria-label={t("menuTitle")}>
          <Link href="/research/new" className={styles.newResearchLink}>
            <span className={styles.searchDrawing}>
              <SearchDrawing />
            </span>
            <span className={`${styles.newResearchPill} entry-pixel`}>
              <DesignText asset="menu-new" className={styles.newResearchLabel}>
                {t("newResearch")}
              </DesignText>
            </span>
          </Link>
          <Link href="/history" className={styles.historyLink}>
            <span className={styles.bookDrawing}>
              <BookDrawing />
            </span>
            <span className={`${styles.historyPill} entry-serif`}>
              <svg
                className={styles.historyOutline}
                viewBox="0 0 500 95"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect
                  x="2.5"
                  y="2.5"
                  width="495"
                  height="90"
                  rx="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeDasharray="29 6"
                />
              </svg>
              <DesignText asset="menu-history" className={styles.historyLabel}>
                {t("history")}
              </DesignText>
            </span>
          </Link>
        </nav>
        <BrandRobot action="idle" className={styles.menuRobot} />
        <Link
          href="/settings"
          className={styles.settings}
          aria-label={t("settings")}
          title={t("settings")}
        >
          <Settings aria-hidden="true" fill="currentColor" strokeWidth="2.5" />
          <span className={styles.gearCenter} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
