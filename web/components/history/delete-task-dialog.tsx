"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskSnapshotResponse } from "@/lib/api/client";
import { useTranslations } from "next-intl";

import styles from "./history.module.css";

export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onConfirm,
}: {
  task: TaskSnapshotResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  if (!task) return null;
  return (
    <DeleteTaskForm
      key={task.id}
      task={task}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}

function DeleteTaskForm({
  task,
  open,
  onOpenChange,
  onConfirm,
}: {
  task: TaskSnapshotResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const pendingRef = useRef(false);

  async function confirm() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setFailed(false);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setFailed(true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pendingRef.current) onOpenChange(next);
      }}
    >
      <DialogContent
        closeLabel={t("common.close")}
        showCloseButton={!pending}
        className={styles.dialog}
        aria-busy={pending}
      >
        <DialogTitle className={styles.dialogTitle}>
          {t("history.deleteTitle")}
        </DialogTitle>
        <DialogDescription className={styles.dialogDescription}>
          {t("history.deleteDescription", { title: task.title })}
        </DialogDescription>
        {failed ? (
          <InlineAlert tone="error" className={styles.dialogError}>
            {t("history.deleteError")}
          </InlineAlert>
        ) : null}
        <div className={styles.dialogActions}>
          <Button
            type="button"
            variant="secondary"
            className={styles.dialogButton}
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className={styles.dialogButton}
            onClick={() => void confirm()}
            disabled={pending}
          >
            {pending ? t("common.loading") : t("common.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
