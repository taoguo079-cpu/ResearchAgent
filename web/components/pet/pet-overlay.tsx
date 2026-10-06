"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { NativeRobotAnimation } from "@/components/robot/native-robot-animation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PET_ANIMATIONS, resolvePetState } from "@/features/pet/pet-manifest";
import {
  PET_DISPLAY_SIZES,
  useDraggablePet,
} from "@/features/pet/use-draggable-pet";
import { usePreferencesStore } from "@/features/preferences/preferences-store";
import { useRouter } from "@/i18n/navigation";
import { useUiStore } from "@/stores/ui-store";

export function PetOverlay() {
  const t = useTranslations("pet");
  const router = useRouter();
  const pet = usePreferencesStore((state) => state.pet);
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);
  const isZen = useUiStore((state) => state.zenTaskId !== null);
  const openSettings = useCallback(() => router.push("/settings"), [router]);
  const draggable = useDraggablePet({
    size: pet.size,
    locked: pet.dragLocked,
    onClick: openSettings,
    enabled: hasHydrated && pet.visible && !isZen,
  });

  const animationState = resolvePetState({
    dragging: draggable.dragging,
    moving: draggable.moving,
  });

  if (!hasHydrated || isZen) return null;

  if (!pet.visible) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t("openSettings")}
            onClick={openSettings}
            className="fixed bottom-5 left-5 z-40 grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-control)] text-[var(--color-text-muted)] shadow-[var(--shadow-float)] hover:bg-[var(--color-control-hover)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          >
            <Settings aria-hidden="true" className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{t("openSettings")}</TooltipContent>
      </Tooltip>
    );
  }

  if (!draggable.position) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-pet-state={animationState}
          data-physics={
            draggable.dragging
              ? "dragging"
              : draggable.moving
                ? "flying"
                : "resting"
          }
          aria-label={t("accessibleLabel", {
            state: t(`states.${animationState}`),
          })}
          className="fixed z-40 cursor-grab select-none rounded-xl bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] active:cursor-grabbing"
          style={{
            left: draggable.position.x,
            top: draggable.position.y,
            width: PET_DISPLAY_SIZES[pet.size].width,
            height: PET_DISPLAY_SIZES[pet.size].height,
            transform: `rotate(${draggable.angle}rad)`,
            willChange:
              draggable.dragging || draggable.moving
                ? "transform, left, top"
                : undefined,
            touchAction: "none",
          }}
          {...draggable.pointerHandlers}
        >
          <NativeRobotAnimation action={PET_ANIMATIONS[animationState]} />
        </button>
      </TooltipTrigger>
      {!draggable.dragging && !draggable.moving ? (
        <TooltipContent>{t("hint")}</TooltipContent>
      ) : null}
    </Tooltip>
  );
}
