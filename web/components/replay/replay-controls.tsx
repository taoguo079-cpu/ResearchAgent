"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import styles from "./replay.module.css";

export function ReplayControls({
  isPlaying,
  speed,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onSpeedChange,
}: {
  isPlaying: boolean;
  speed: 1 | 2 | 4;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
}) {
  const t = useTranslations("replay");
  return (
    <div className={styles.controls}>
      <Button
        aria-label={t("previous")}
        size="icon"
        variant="ghost"
        onClick={onPrevious}
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        aria-label={isPlaying ? t("pause") : t("play")}
        size="icon"
        variant="primary"
        onClick={isPlaying ? onPause : onPlay}
      >
        {isPlaying ? (
          <Pause aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Play aria-hidden="true" className="h-4 w-4" />
        )}
      </Button>
      <Button
        aria-label={t("next")}
        size="icon"
        variant="ghost"
        onClick={onNext}
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Button>
      <div className={styles.speeds} aria-label={t("speed")}>
        {[1, 2, 4].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={t("speedValue", { value })}
            aria-pressed={speed === value}
            onClick={() => onSpeedChange(value as 1 | 2 | 4)}
          >
            {value}×
          </button>
        ))}
      </div>
    </div>
  );
}
