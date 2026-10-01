"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  LEGACY_PET_MANIFEST,
  PET_MANIFEST_SRC,
  parsePetManifest,
  type PetAnimationSpec,
  type PetAnimationState,
  type PetManifest,
} from "@/features/pet/pet-manifest";
import type { PetMotion } from "@/features/preferences/preferences-store";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function systemReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export function usePetManifest() {
  const [manifest, setManifest] = useState<PetManifest | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(PET_MANIFEST_SRC, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Pet manifest unavailable");
        return response.json();
      })
      .then((value: unknown) => {
        const parsed = parsePetManifest(value);
        if (!controller.signal.aborted) setManifest(parsed);
      })
      .catch(() => {
        // The existing character stays active until the complete source gate passes.
        if (!controller.signal.aborted) setManifest(LEGACY_PET_MANIFEST);
      });
    return () => controller.abort();
  }, []);
  return manifest;
}

export type PetAssetStatus = "loading" | "ready" | "error";

/** Load only the current action; switching actions cannot revive a stale request. */
export function usePetAsset(
  spec: PetAnimationSpec | undefined,
): PetAssetStatus {
  const [asset, setAsset] = useState<{
    src: string;
    status: PetAssetStatus;
  } | null>(null);

  useEffect(() => {
    if (!spec) return;
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (!disposed) setAsset({ src: spec.src, status: "ready" });
    };
    image.onerror = () => {
      if (!disposed) setAsset({ src: spec.src, status: "error" });
    };
    image.src = spec.src;
    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [spec]);

  return spec && asset?.src === spec.src ? asset.status : "loading";
}

export function usePetAnimation({
  state,
  motion,
  spec,
  enabled = true,
  forceStatic = false,
  onComplete,
}: {
  state: PetAnimationState;
  motion: PetMotion;
  spec?: PetAnimationSpec;
  enabled?: boolean;
  forceStatic?: boolean;
  onComplete?: () => void;
}) {
  const systemReduced = useSyncExternalStore(
    subscribeReducedMotion,
    systemReducedMotion,
    () => false,
  );
  const shouldBeStatic = forceStatic || motion === "static" || systemReduced;
  const [playback, setPlayback] = useState<{
    state: PetAnimationState;
    motion: PetMotion;
    spec: PetAnimationSpec | undefined;
    static: boolean;
    enabled: boolean;
    frame: number;
  }>(() => ({
    state,
    motion,
    spec,
    static: shouldBeStatic,
    enabled,
    frame: !enabled || shouldBeStatic ? (spec?.posterFrame ?? 0) : 0,
  }));
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let elapsed = 0;
    let completedLoops = 0;
    let finished = false;
    let previousTime: number | null = null;
    let animationFrame = 0;
    const durationFactor = motion === "reduced" ? 2 : 1;

    const publishFrame = () => {
      if (disposed) return;
      setPlayback({
        state,
        motion,
        spec,
        static: shouldBeStatic,
        enabled,
        frame: !enabled || shouldBeStatic ? (spec?.posterFrame ?? 0) : frame,
      });
    };
    queueMicrotask(publishFrame);
    if (!spec || !enabled || (shouldBeStatic && spec.loop)) {
      return () => {
        disposed = true;
      };
    }

    const tick = (time: number) => {
      if (disposed || finished) return;
      if (document.visibilityState === "hidden") {
        previousTime = null;
        return;
      }
      if (previousTime !== null) elapsed += time - previousTime;
      previousTime = time;
      const initialFrame = frame;
      while (elapsed >= spec.frameDurationsMs[frame] * durationFactor) {
        elapsed -= spec.frameDurationsMs[frame] * durationFactor;
        if (frame < spec.frameCount - 1) {
          frame += 1;
          continue;
        }
        completedLoops += 1;
        if (spec.loop || completedLoops < (spec.repeat ?? 1)) {
          frame = 0;
        } else {
          finished = true;
          break;
        }
      }
      if (frame !== initialFrame && !shouldBeStatic) publishFrame();
      if (finished) {
        onCompleteRef.current?.();
      } else {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const visibilityChanged = () => {
      cancelAnimationFrame(animationFrame);
      previousTime = null;
      if (document.visibilityState !== "hidden" && !finished) {
        animationFrame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    if (document.visibilityState !== "hidden") {
      animationFrame = requestAnimationFrame(tick);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [enabled, motion, shouldBeStatic, spec, state]);

  return playback.state === state &&
    playback.motion === motion &&
    playback.spec === spec &&
    playback.static === shouldBeStatic &&
    playback.enabled === enabled
    ? playback.frame
    : !enabled || shouldBeStatic
      ? (spec?.posterFrame ?? 0)
      : 0;
}
