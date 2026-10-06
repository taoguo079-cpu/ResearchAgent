import { useTranslations } from "next-intl";

import type { ReportHeading } from "@/lib/markdown/report-headings";
import type { CSSProperties } from "react";
import styles from "./report-view.module.css";

export function ReportToc({ headings }: { headings: ReportHeading[] }) {
  const t = useTranslations("report");
  if (!headings.length) return null;
  return (
    <nav aria-label={t("contents")} className={styles.toc}>
      <h2>{t("contents")}</h2>
      <ol>
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={
              {
                "--toc-indent": `${Math.max(0, heading.level - 1) * 10}px`,
              } as CSSProperties
            }
          >
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
