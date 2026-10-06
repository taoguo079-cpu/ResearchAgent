import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import styles from "./papers.module.css";

export type PaperSort = "relevance" | "citations" | "year";

export function PaperFilters({
  query,
  source,
  sort,
  selectedOnly,
  citedOnly,
  fromYear,
  toYear,
  sources,
  onQueryChange,
  onSourceChange,
  onSortChange,
  onSelectedOnlyChange,
  onCitedOnlyChange,
  onFromYearChange,
  onToYearChange,
  yearRangeInvalid,
}: {
  query: string;
  source: string;
  sort: PaperSort;
  selectedOnly: boolean;
  citedOnly: boolean;
  fromYear: string;
  toYear: string;
  sources: string[];
  onQueryChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSortChange: (value: PaperSort) => void;
  onSelectedOnlyChange: (value: boolean) => void;
  onCitedOnlyChange: (value: boolean) => void;
  onFromYearChange: (value: string) => void;
  onToYearChange: (value: string) => void;
  yearRangeInvalid?: boolean;
}) {
  const t = useTranslations("papers");
  return (
    <div className={styles.filters}>
      <div className={styles.search}>
        <Input
          aria-label={t("search")}
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <label className={styles.field}>
        {t("source")}
        <select
          aria-label={t("source")}
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
          className={styles.control}
        >
          <option value="all">{t("allSources")}</option>
          {sources.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {t("sort")}
        <select
          aria-label={t("sort")}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as PaperSort)}
          className={styles.control}
        >
          <option value="relevance">{t("relevance")}</option>
          <option value="citations">{t("citations")}</option>
          <option value="year">{t("year")}</option>
        </select>
      </label>
      <div className={styles.secondaryFilters}>
        <label className={styles.field}>
          {t("fromYear")}
          <input
            aria-label={t("fromYear")}
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear()}
            value={fromYear}
            onChange={(event) => onFromYearChange(event.target.value)}
            className={styles.control}
          />
        </label>
        <label className={styles.field}>
          {t("toYear")}
          <input
            aria-label={t("toYear")}
            type="number"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear()}
            value={toYear}
            onChange={(event) => onToYearChange(event.target.value)}
            className={styles.control}
          />
        </label>
        <div className={styles.flags}>
          <label className={styles.flag}>
            <input
              aria-label={t("selectedOnly")}
              type="checkbox"
              checked={selectedOnly}
              onChange={(event) => onSelectedOnlyChange(event.target.checked)}
            />{" "}
            {t("selectedOnly")}
          </label>
          <label className={styles.flag}>
            <input
              aria-label={t("citedOnly")}
              type="checkbox"
              checked={citedOnly}
              onChange={(event) => onCitedOnlyChange(event.target.checked)}
            />{" "}
            {t("citedOnly")}
          </label>
          {yearRangeInvalid ? (
            <span role="alert" className="text-xs text-[var(--color-error)]">
              {t("yearRangeInvalid")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
