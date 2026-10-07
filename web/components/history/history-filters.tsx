import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import styles from "./history.module.css";

export type HistorySort = "recent" | "score";

export function HistoryFilters({
  query,
  status,
  sort,
  onQueryChange,
  onStatusChange,
  onSortChange,
}: {
  query: string;
  status: string;
  sort: HistorySort;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: HistorySort) => void;
}) {
  const t = useTranslations("history");
  return (
    <div className={styles.filters}>
      <label className={styles.filterLabel}>
        <span>{t("search")}</span>
        <span className={styles.searchField}>
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className={styles.searchInput}
          />
        </span>
      </label>
      <label className={styles.filterLabel}>
        <span>{t("status")}</span>
        <span className={styles.selectField}>
          <select
            aria-label={t("status")}
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className={styles.select}
          >
            <option value="all">{t("allStatuses")}</option>
            <option value="completed">{t("completed")}</option>
            <option value="running">{t("running")}</option>
            <option value="failed">{t("failed")}</option>
            <option value="cancelled">{t("cancelled")}</option>
            <option value="interrupted">{t("interrupted")}</option>
          </select>
          <ChevronDown aria-hidden="true" size={15} />
        </span>
      </label>
      <label className={styles.filterLabel}>
        <span>{t("sort")}</span>
        <span className={styles.selectField}>
          <select
            aria-label={t("sort")}
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as HistorySort)
            }
            className={styles.select}
          >
            <option value="recent">{t("recent")}</option>
            <option value="score">{t("qualityScore")}</option>
          </select>
          <ChevronDown aria-hidden="true" size={15} />
        </span>
      </label>
    </div>
  );
}
