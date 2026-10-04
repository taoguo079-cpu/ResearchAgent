"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

import { BrandRobot } from "@/components/entry/brand-robot";
import { EntryLanguageSwitcher } from "@/components/entry/entry-language-switcher";
import { DesignText } from "@/components/entry/design-text";
import designText from "@/public/design-text/manifest.json";
import { WELCOME_SESSION_KEY } from "@/features/welcome/welcome-state";
import { useRouter } from "@/i18n/navigation";
import styles from "./welcome-page.module.css";

export function WelcomePage() {
  const t = useTranslations("welcome");
  const router = useRouter();
  const navigated = useRef(false);
  const goToWorkspace = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace("/workspace");
  }, [router]);

  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      try {
        if (sessionStorage.getItem(WELCOME_SESSION_KEY) === "complete") {
          goToWorkspace();
        }
      } catch {
        // The entry button remains available when browser storage is restricted.
      }
    });
    return () => {
      disposed = true;
    };
  }, [goToWorkspace]);

  function enter() {
    if (navigated.current) return;
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, "complete");
    } catch {
      // Entering the workspace does not depend on browser storage.
    }
    goToWorkspace();
  }

  function placement(asset: keyof typeof designText.assets) {
    const glyph = designText.assets[asset];
    return {
      position: "absolute" as const,
      left: `${(glyph.x / 1366) * 100}%`,
      top: `${(glyph.y / 768) * 100}%`,
      width: `${(glyph.width / 1366) * 100}%`,
      height: `${(glyph.height / 768) * 100}%`,
    };
  }

  return (
    <main className={styles.page} data-entry-page="welcome">
      <div className={styles.canvas}>
        <div className={styles.partner}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Search strokeWidth={1.8} />
          </span>
          <p>
            <DesignText asset="home-partner">{t("partner")}</DesignText>
          </p>
        </div>
        <div className={styles.language}>
          <EntryLanguageSwitcher />
        </div>

        <p className={styles.tagline}>
          <DesignText
            asset="home-data"
            forceVector
            style={placement("home-data")}
          >
            Data
          </DesignText>
          <DesignText
            asset="home-power"
            forceVector
            style={placement("home-power")}
          >
            is power
          </DesignText>
        </p>

        <BrandRobot action="search" className={styles.robot} />

        <h1 className={styles.brandTitle} aria-label="Research Agent">
          <DesignText
            asset="home-research"
            forceVector
            style={placement("home-research")}
          >
            Research
          </DesignText>
          <DesignText
            asset="home-agent"
            forceVector
            style={placement("home-agent")}
          >
            Agent
          </DesignText>
        </h1>

        <button
          className={`${styles.nextButton} entry-pixel`}
          type="button"
          onClick={enter}
        >
          <DesignText asset="home-next" className={styles.nextLabel}>
            {t("next")}
          </DesignText>
        </button>
      </div>
    </main>
  );
}
