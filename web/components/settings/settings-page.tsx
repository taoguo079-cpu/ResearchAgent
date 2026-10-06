"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";

import { WorkspacePage } from "@/components/shell/workspace-page";
import { DeepSeekSettingsSection } from "@/components/settings/deepseek-settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACADEMIC_SOURCES,
  DEFAULT_APP_PREFERENCES,
  usePreferencesStore,
} from "@/features/preferences/preferences-store";
import companionManifest from "@/public/research-robot/manifest.json";

import styles from "./settings-page.module.css";

const settingsSchema = z.object({
  maxPapers: z.number().int().min(3).max(15),
  sources: z.array(z.enum(ACADEMIC_SOURCES)).min(1),
  visible: z.boolean(),
  size: z.enum(["small", "medium", "large"]),
  motion: z.enum(["system", "full", "reduced", "static"]),
  dragLocked: z.boolean(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

function valuesFromStore(
  research: (typeof DEFAULT_APP_PREFERENCES)["research"],
  pet: (typeof DEFAULT_APP_PREFERENCES)["pet"],
): SettingsValues {
  return {
    maxPapers: research.maxPapers,
    sources: research.sources,
    visible: pet.visible,
    size: pet.size,
    motion: pet.motion,
    dragLocked: pet.dragLocked,
  };
}

export function SettingsPage() {
  const t = useTranslations("settings");
  const research = usePreferencesStore((state) => state.research);
  const pet = usePreferencesStore((state) => state.pet);
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);
  const setResearchPreferences = usePreferencesStore(
    (state) => state.setResearchPreferences,
  );
  const setPetPreferences = usePreferencesStore(
    (state) => state.setPetPreferences,
  );
  const resetPetPosition = usePreferencesStore(
    (state) => state.resetPetPosition,
  );
  const resetPreferences = usePreferencesStore(
    (state) => state.resetPreferences,
  );
  const [saved, setSaved] = useState(false);
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: valuesFromStore(research, pet),
  });

  useEffect(() => {
    if (hasHydrated && !form.formState.isDirty) {
      form.reset(valuesFromStore(research, pet));
    }
  }, [form, form.formState.isDirty, hasHydrated, pet, research]);

  const values = useWatch({ control: form.control });

  function save(next: SettingsValues) {
    setResearchPreferences({
      maxPapers: next.maxPapers,
      sources: next.sources,
    });
    setPetPreferences({
      visible: next.visible,
      size: next.size,
      motion: next.motion,
      dragLocked: next.dragLocked,
    });
    form.reset(next);
    setSaved(true);
  }

  function restoreDefaults() {
    resetPreferences();
    const defaults = valuesFromStore(
      DEFAULT_APP_PREFERENCES.research,
      DEFAULT_APP_PREFERENCES.pet,
    );
    form.reset(defaults);
    setSaved(true);
  }

  return (
    <WorkspacePage>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <h1 className={`entry-serif ${styles.pageTitle}`}>{t("title")}</h1>
          <p className={styles.pageDescription}>{t("description")}</p>
        </header>

        <div className={styles.settingsGrid}>
          <DeepSeekSettingsSection />
          <form
            aria-label={t("research.title")}
            className={styles.preferencesForm}
            onChange={() => setSaved(false)}
            onSubmit={(event) => void form.handleSubmit(save)(event)}
          >
            <SettingsSection
              title={t("research.title")}
              description={t("research.description")}
            >
              <div className={styles.researchFields}>
                <div>
                  <label className={styles.fieldLabel}>
                    {t("research.maxPapers")}
                    <Input
                      className={`${styles.input} ${styles.paperInput}`}
                      type="number"
                      min={3}
                      max={15}
                      aria-invalid={Boolean(form.formState.errors.maxPapers)}
                      aria-describedby={
                        form.formState.errors.maxPapers
                          ? "settings-max-papers-error"
                          : undefined
                      }
                      {...form.register("maxPapers", { valueAsNumber: true })}
                    />
                  </label>
                  {form.formState.errors.maxPapers ? (
                    <p
                      id="settings-max-papers-error"
                      className={styles.fieldError}
                    >
                      {t("research.maxPapersError")}
                    </p>
                  ) : null}
                </div>
                <fieldset
                  aria-describedby={
                    form.formState.errors.sources
                      ? "settings-sources-error"
                      : undefined
                  }
                >
                  <legend className={styles.fieldLabel}>
                    {t("research.sources")}
                  </legend>
                  <div className={styles.sourceOptions}>
                    {ACADEMIC_SOURCES.map((source) => (
                      <label key={source} className={styles.checkField}>
                        <input
                          type="checkbox"
                          value={source}
                          aria-invalid={Boolean(form.formState.errors.sources)}
                          {...form.register("sources")}
                        />
                        {t(`research.source.${source}`)}
                      </label>
                    ))}
                  </div>
                  {form.formState.errors.sources ? (
                    <p
                      id="settings-sources-error"
                      className={styles.fieldError}
                    >
                      {t("research.sourcesError")}
                    </p>
                  ) : null}
                </fieldset>
              </div>
            </SettingsSection>

            <SettingsSection
              title={t("pet.title")}
              description={t("pet.description")}
            >
              <div className={styles.companionFields}>
                <Image
                  src={companionManifest.assets.completed.posterSrc}
                  width={companionManifest.assets.completed.posterWidth}
                  height={companionManifest.assets.completed.posterHeight}
                  alt=""
                  aria-hidden="true"
                  className={styles.companionRobot}
                  unoptimized
                />
                <div className={styles.companionControls}>
                  <div className={styles.toggleRow}>
                    <ToggleField
                      label={t("pet.visible")}
                      registration={form.register("visible")}
                    />
                    <ToggleField
                      label={t("pet.dragLocked")}
                      registration={form.register("dragLocked")}
                    />
                  </div>
                  <div className={styles.selectRow}>
                    <SelectField
                      label={t("pet.size")}
                      registration={form.register("size")}
                    >
                      <option value="small">{t("pet.sizes.small")}</option>
                      <option value="medium">{t("pet.sizes.medium")}</option>
                      <option value="large">{t("pet.sizes.large")}</option>
                    </SelectField>
                    <SelectField
                      label={t("pet.motion")}
                      registration={form.register("motion")}
                    >
                      <option value="system">{t("pet.motions.system")}</option>
                      <option value="full">{t("pet.motions.full")}</option>
                      <option value="reduced">
                        {t("pet.motions.reduced")}
                      </option>
                      <option value="static">{t("pet.motions.static")}</option>
                    </SelectField>
                  </div>
                  <Button
                    className={styles.resetPosition}
                    type="button"
                    variant="ghost"
                    onClick={resetPetPosition}
                  >
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    {t("pet.resetPosition")}
                  </Button>
                </div>
              </div>
              <p className={styles.previewNote}>
                {t("pet.preview", {
                  visibility: t(
                    (values.visible ?? pet.visible)
                      ? "pet.shown"
                      : "pet.hidden",
                  ),
                  size: t(`pet.sizes.${values.size ?? pet.size}`),
                  motion: t(`pet.motions.${values.motion ?? pet.motion}`),
                })}
              </p>
            </SettingsSection>

            <div className={styles.preferenceActions}>
              <div className={styles.actionButtons}>
                <Button className={styles.primaryButton} type="submit">
                  {t("save")}
                </Button>
                <Button
                  className={styles.secondaryButton}
                  type="button"
                  variant="secondary"
                  onClick={restoreDefaults}
                >
                  {t("restoreDefaults")}
                </Button>
              </div>
              {saved ? (
                <p role="status" className={styles.success}>
                  {t("saved")}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </WorkspacePage>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.sectionTitle}>
        {title}
      </h2>
      <p className={styles.sectionDescription}>{description}</p>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function ToggleField({
  label,
  registration,
}: {
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className={styles.checkField}>
      <input type="checkbox" {...registration} />
      {label}
    </label>
  );
}

function SelectField({
  label,
  registration,
  children,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.fieldLabel}>
      {label}
      <select className={styles.select} {...registration}>
        {children}
      </select>
    </label>
  );
}
