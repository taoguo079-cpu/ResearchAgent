"use client";

import { ArrowRight, BookOpen, Search, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandRobot } from "@/components/entry/brand-robot";
import { EntryLanguageSwitcher } from "@/components/entry/entry-language-switcher";
import { DesignText } from "@/components/entry/design-text";
import { EntryTransitionLink } from "@/components/entry/entry-transition-link";
import { Link } from "@/i18n/navigation";
import styles from "./research-menu-page.module.css";

export default function ResearchMenuPage() {
  const t = useTranslations("entry");
  return (
    <main className={styles.page} data-testid="research-menu">
      <div className={styles.canvas}>
        <header className={styles.header}>
          <p className={styles.partner}>
            <span className={styles.partnerIcon} aria-hidden="true">
              <Search strokeWidth={1.8} />
            </span>
            {t("partner")}
          </p>
          <div className={styles.utilities}>
            <Link
              href="/settings"
              className={styles.settings}
              title={t("settings")}
            >
              <Settings aria-hidden="true" size={18} />
              {t("settings")}
            </Link>
            <EntryLanguageSwitcher />
          </div>
        </header>

        <section className={styles.hero} aria-labelledby="workspace-title">
          <div className={styles.copy}>
            <h1
              id="workspace-title"
              className={styles.title}
              aria-label="Research Agent"
            >
              <span className="entry-serif">Research</span>
              <span className="entry-pixel">Agent</span>
            </h1>
            <p className={styles.tagline}>{t("tagline")}</p>
            <p className={styles.motto}>
              <DesignText
                asset="home-data"
                forceVector
                className={styles.mottoData}
                style={{ width: 125, height: 41 }}
              >
                Data
              </DesignText>{" "}
              <DesignText
                asset="home-power"
                forceVector
                style={{ width: 160.5, height: 46 }}
              >
                is power
              </DesignText>
            </p>
            <nav className={styles.actions} aria-label={t("menuTitle")}>
              <EntryTransitionLink
                href="/research/new"
                className={styles.newResearch}
              >
                <span className="entry-pixel">{t("newResearch")}</span>
                <ArrowRight aria-hidden="true" size={22} />
              </EntryTransitionLink>
              <Link href="/history" className={styles.history}>
                <BookOpen aria-hidden="true" size={22} />
                {t("history")}
              </Link>
            </nav>
          </div>
          <div className={styles.illustration}>
            <BrandRobot action="idle" className={styles.robot} />
          </div>
        </section>
      </div>
    </main>
  );
}
