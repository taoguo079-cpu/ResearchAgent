"use client";

import {
  useTaskExport,
  type ExportFormat,
} from "@/features/export/use-task-export";
import { useTranslations } from "next-intl";
import { Download, ChevronDown } from "lucide-react";
import styles from "./report-view.module.css";

export function ExportMenu({
  taskId,
  onExport,
}: {
  taskId: string;
  onExport?: (format: ExportFormat) => Promise<void> | void;
}) {
  const t = useTranslations("report");
  const exportTask = useTaskExport(taskId);
  async function handleExport(format: ExportFormat) {
    if (onExport) return onExport(format);
    return exportTask.download(format);
  }

  return (
    <div className={styles.export}>
      <details>
        <summary role="button">
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          {t("exportMenu")}
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        </summary>
        <div role="menu" className={styles.exportMenu}>
          {(["markdown", "bibtex", "json"] as const).map((format) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              disabled={exportTask.isExporting}
              onClick={() => void handleExport(format)}
            >
              {format === "markdown"
                ? "Markdown"
                : format === "bibtex"
                  ? "BibTeX"
                  : "JSON"}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
