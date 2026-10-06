"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";
import type { TaskSnapshotResponse } from "@/lib/api/client";
import { useTranslations } from "next-intl";

import styles from "./history.module.css";

export function RenameTaskDialog({
  task,
  open,
  onOpenChange,
  onConfirm,
}: {
  task: TaskSnapshotResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (title: string) => Promise<void> | void;
}) {
  if (!task) return null;
  return (
    <RenameTaskForm
      key={task.id}
      task={task}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}

function RenameTaskForm({
  task,
  open,
  onOpenChange,
  onConfirm,
}: {
  task: TaskSnapshotResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (title: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(task.title);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const pendingRef = useRef(false);
  const t = useTranslations();

  async function confirm() {
    if (pendingRef.current || !title.trim()) return;
    pendingRef.current = true;
    setPending(true);
    setFailed(false);
    try {
      await onConfirm(title.trim());
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
          {t("history.renameTitle")}
        </DialogTitle>
        <DialogDescription className={styles.dialogDescription}>
          {t("history.renameDescription")}
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <label className={styles.dialogField}>
            {t("history.newTitle")}
            <Input
              aria-label={t("history.newTitle")}
              className={styles.dialogInput}
              value={title}
              disabled={pending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          {failed ? (
            <InlineAlert tone="error" className={styles.dialogError}>
              {t("history.renameError")}
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
              type="submit"
              className={styles.dialogButton}
              disabled={pending || !title.trim()}
            >
              {pending ? t("common.loading") : t("history.saveTitle")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
