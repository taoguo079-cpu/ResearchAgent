"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

import { EntryLanguageSwitcher } from "@/components/entry/entry-language-switcher";
import { useEntryNavigation } from "@/components/entry/entry-transition-provider";
import { WELCOME_SESSION_KEY } from "@/features/welcome/welcome-state";
import { useRouter } from "@/i18n/navigation";
import styles from "./welcome-page.module.css";

export function WelcomePage() {
  const t = useTranslations("welcome");
  const entryT = useTranslations("entry");
  const composerT = useTranslations("composer");
  const router = useRouter();
  const { navigate } = useEntryNavigation();
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
    navigated.current = true;
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, "complete");
    } catch {
      // Entering the workspace does not depend on browser storage.
    }
    void navigate("/workspace", { replace: true }).finally(() => {
      // A failed or timed-out transition leaves NEXT available for retry.
      navigated.current = false;
    });
  }

  return (
    <main className={styles.page} data-entry-page="welcome">
      <div className={styles.canvas}>
        <header className={styles.header}>
          <p className={styles.partner}>{t("partner")}</p>
          <div className={styles.language}>
            <EntryLanguageSwitcher />
          </div>
        </header>
        <h1 className={styles.brandTitle} aria-label="Research Agent">
          <span>Research</span>
          <span>Agent</span>
        </h1>
        <aside className={styles.description}>
          <p>{composerT("description")}</p>
          <p>{entryT("tagline")}</p>
        </aside>
        <button className={styles.nextButton} type="button" onClick={enter}>
          {t("next")}
          <ArrowRight aria-hidden="true" size={20} />
        </button>
        <footer className={`${styles.metadata} swiss-meta`}>
          <span>{new Date().getFullYear()}</span>
          <span>{entryT("location")}</span>
        </footer>
      </div>
    </main>
  );
}
