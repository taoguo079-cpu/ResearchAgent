"use client";

import {
  PET_CELL,
  type PetAnimationSpec,
  type PetAnimationState,
} from "@/features/pet/pet-manifest";
import type { PetAssetStatus } from "@/features/pet/use-pet-animation";
import { PET_DISPLAY_SIZES } from "@/features/pet/use-draggable-pet";
import type { PetSize } from "@/features/preferences/preferences-store";

export function PetSprite({
  state,
  frame,
  size,
  displayWidth,
  spec,
  assetStatus = "ready",
  fallbackPosterSrc,
}: {
  state: PetAnimationState;
  frame: number;
  size: PetSize;
  displayWidth?: number;
  spec: PetAnimationSpec;
  assetStatus?: PetAssetStatus;
  fallbackPosterSrc?: string;
}) {
  const dimensions =
    displayWidth === undefined
      ? PET_DISPLAY_SIZES[size]
      : {
          width: displayWidth,
          height: (displayWidth * PET_CELL.height) / PET_CELL.width,
        };
  const safeFrame = Math.min(Math.max(0, frame), spec.frameCount - 1);
  const atlasFrame = safeFrame + (spec.frameOffset ?? 0);
  const column = atlasFrame % spec.columns;
  const row = Math.floor(atlasFrame / spec.columns);
  const showPoster = assetStatus !== "ready";
  const posterSrc =
    assetStatus === "error"
      ? (fallbackPosterSrc ?? spec.posterSrc)
      : spec.posterSrc;
  return (
    <span
      aria-hidden="true"
      data-pet-frame={safeFrame}
      data-pet-action={state}
      data-pet-asset={assetStatus}
      className="block bg-no-repeat"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        backgroundImage: `url(${showPoster ? posterSrc : spec.src})`,
        backgroundSize: showPoster
          ? `${dimensions.width}px ${dimensions.height}px`
          : `${dimensions.width * spec.columns}px ${dimensions.height * spec.rows}px`,
        backgroundPosition: showPoster
          ? "0 0"
          : `${-column * dimensions.width}px ${-row * dimensions.height}px`,
      }}
    />
  );
}
