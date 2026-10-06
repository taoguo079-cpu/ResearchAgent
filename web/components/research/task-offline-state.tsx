import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./workspace-task.module.css";

export function TaskOfflineState() {
  const t = useTranslations("task");
  return (
    <div className={styles.offline}>
      <WifiOff aria-hidden="true" className="h-4 w-4" />
      {t("offline")}
    </div>
  );
}
