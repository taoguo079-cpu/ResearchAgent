"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import {
  useDeepSeekSettings,
  useUpdateDeepSeekSettings,
} from "@/features/settings/use-deepseek-settings";

import styles from "./settings-page.module.css";

export function DeepSeekSettingsSection() {
  const t = useTranslations("settings.deepseek");
  const settingsQuery = useDeepSeekSettings();
  const updateSettings = useUpdateDeepSeekSettings();
  const [apiKey, setApiKey] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await updateSettings.mutateAsync({ api_key: apiKey });
      setApiKey("");
    } catch {
      // The mutation state renders a safe, localized error below.
    }
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="deepseek-model-settings-title"
    >
      <div className={styles.modelHeader}>
        <div>
          <h2
            id="deepseek-model-settings-title"
            className={styles.sectionTitle}
          >
            {t("sectionTitle")}
          </h2>
          <p className={styles.sectionDescription}>{t("sectionDescription")}</p>
        </div>
        {settingsQuery.data ? (
          <Badge
            className={styles.configurationBadge}
            variant={
              settingsQuery.data.api_key_configured ? "success" : "warning"
            }
          >
            {settingsQuery.data.api_key_configured
              ? t("configured")
              : t("notConfigured")}
          </Badge>
        ) : null}
      </div>

      {settingsQuery.isPending ? (
        <p role="status" className={styles.modelStatus}>
          {t("checking")}
        </p>
      ) : settingsQuery.isError ? (
        <div className={styles.modelBody}>
          <InlineAlert tone="error">{t("unavailableError")}</InlineAlert>
          <Button
            className={`${styles.secondaryButton} ${styles.retryButton}`}
            type="button"
            variant="secondary"
            disabled={settingsQuery.isFetching}
            onClick={() => void settingsQuery.refetch()}
          >
            {settingsQuery.isFetching ? t("retrying") : t("retry")}
          </Button>
        </div>
      ) : (
        <div className={styles.modelBody}>
          <dl className={styles.modelMetadata}>
            <MetadataItem label={t("providerLabel")} value="DeepSeek" />
            <MetadataItem
              label={t("defaultModelLabel")}
              value={settingsQuery.data.default_model}
            />
          </dl>
          <form
            className={styles.modelForm}
            onSubmit={(event) => void save(event)}
          >
            <label
              htmlFor="deepseek-api-key-settings"
              className={styles.fieldLabel}
            >
              {t("replaceKeyLabel")}
            </label>
            <Input
              id="deepseek-api-key-settings"
              className={styles.input}
              type="password"
              autoComplete="off"
              maxLength={1000}
              required
              spellCheck={false}
              aria-describedby="deepseek-key-security-note"
              aria-invalid={updateSettings.isError}
              value={apiKey}
              placeholder={t("replaceKeyPlaceholder")}
              onChange={(event) => {
                setApiKey(event.target.value);
                updateSettings.reset();
              }}
            />
            <p id="deepseek-key-security-note" className={styles.securityNote}>
              {t("keyNotReturned")}
            </p>
            {updateSettings.isError ? (
              <InlineAlert tone="error" className="mt-3">
                {t("saveError")}
              </InlineAlert>
            ) : null}
            <div className={styles.modelActions}>
              <Button
                className={styles.primaryButton}
                type="submit"
                disabled={!apiKey.trim() || updateSettings.isPending}
              >
                {updateSettings.isPending ? t("updating") : t("updateKey")}
              </Button>
              {updateSettings.isSuccess ? (
                <p role="status" className={styles.success}>
                  {t("updated")}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metadataItem}>
      <dt className={styles.metadataLabel}>{label}</dt>
      <dd className={styles.metadataValue}>{value}</dd>
    </div>
  );
}
