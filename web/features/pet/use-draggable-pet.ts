"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PetPhysics } from "@/features/pet/pet-physics";
import type { PetSize } from "@/features/preferences/preferences-store";
import { usePreferencesStore } from "@/features/preferences/preferences-store";
import {
  FIXED_STEP,
  releaseVelocity,
  type Point,
} from "@/features/welcome/toy-physics";

export const PET_DISPLAY_SIZES = {
  small: { width: 72, height: 78 },
  medium: { width: 96, height: 104 },
  large: { width: 120, height: 130 },
} as const;

const SAFE_MARGIN = 24;
const DRAG_THRESHOLD = 6;

type PixelPosition = { x: number; y: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function ratiosToPixels(
  position: { xRatio: number; yRatio: number },
  size: PetSize,
  viewport = { width: window.innerWidth, height: window.innerHeight },
): PixelPosition {
  const dimensions = PET_DISPLAY_SIZES[size];
  const widthRange = Math.max(
    0,
    viewport.width - dimensions.width - SAFE_MARGIN * 2,
  );
  const heightRange = Math.max(
    0,
    viewport.height - dimensions.height - SAFE_MARGIN * 2,
  );
  return {
    x: clamp(
      SAFE_MARGIN + position.xRatio * widthRange,
      0,
      viewport.width - dimensions.width,
    ),
    y: clamp(
      SAFE_MARGIN + position.yRatio * heightRange,
      0,
      viewport.height - dimensions.height,
    ),
  };
}

export function pixelsToRatios(
  position: PixelPosition,
  size: PetSize,
  viewport = { width: window.innerWidth, height: window.innerHeight },
) {
  const dimensions = PET_DISPLAY_SIZES[size];
  const widthRange = Math.max(
    0,
    viewport.width - dimensions.width - SAFE_MARGIN * 2,
  );
  const heightRange = Math.max(
    0,
    viewport.height - dimensions.height - SAFE_MARGIN * 2,
  );
  return {
    xRatio: widthRange
      ? clamp((position.x - SAFE_MARGIN) / widthRange, 0, 1)
      : 0,
    yRatio: heightRange
      ? clamp((position.y - SAFE_MARGIN) / heightRange, 0, 1)
      : 0,
  };
}

export function useDraggablePet({
  size,
  locked,
  onClick,
  enabled = true,
}: {
  size: PetSize;
  locked: boolean;
  onClick: () => void;
  enabled?: boolean;
}) {
  const storedPosition = usePreferencesStore((state) => state.pet.position);
  const setStoredPosition = usePreferencesStore(
    (state) => state.setPetPosition,
  );
  const [position, setPosition] = useState<PixelPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState(false);
  const [angle, setAngle] = useState(0);
  const [physicsReady, setPhysicsReady] = useState(false);
  const positionRef = useRef<PixelPosition | null>(null);
  const storedRef = useRef(storedPosition);
  const lastSavedRef = useRef(storedPosition);
  const engineRef = useRef<PetPhysics | null>(null);
  const frameRef = useRef<number | null>(null);
  const previousFrame = useRef<number | null>(null);
  const accumulator = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    target: HTMLButtonElement;
    startX: number;
    startY: number;
    origin: PixelPosition;
    moved: boolean;
    wasMoving: boolean;
    samples: (Point & { time: number })[];
  } | null>(null);
  const suppressClickRef = useRef(false);

  const publish = useCallback(() => {
    const scene = engineRef.current;
    if (!scene) return;
    const pose = scene.pose;
    positionRef.current = { x: pose.x, y: pose.y };
    setPosition((previous) =>
      previous && Math.hypot(previous.x - pose.x, previous.y - pose.y) < 0.01
        ? previous
        : { x: pose.x, y: pose.y },
    );
    setAngle(pose.angle);
    setMoving(pose.moving);
  }, []);

  const persist = useCallback(() => {
    const current = positionRef.current;
    if (!current) return;
    const next = pixelsToRatios(current, size);
    if (
      Math.abs(next.xRatio - storedRef.current.xRatio) < 0.00001 &&
      Math.abs(next.yRatio - storedRef.current.yRatio) < 0.00001
    )
      return;
    lastSavedRef.current = next;
    storedRef.current = next;
    setStoredPosition(next);
  }, [setStoredPosition, size]);

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = previousFrame.current = null;
    accumulator.current = 0;
  }, []);

  const startFrame = useCallback(() => {
    if (frameRef.current !== null || document.hidden) return;
    const tick = (time: number) => {
      const scene = engineRef.current;
      if (!scene || document.hidden) {
        cancelFrame();
        return;
      }
      accumulator.current +=
        previousFrame.current === null
          ? 1 / 60
          : Math.min(0.05, Math.max(0, (time - previousFrame.current) / 1000));
      previousFrame.current = time;
      while (accumulator.current >= FIXED_STEP) {
        scene.step();
        accumulator.current -= FIXED_STEP;
      }
      publish();
      if (dragRef.current || scene.pose.moving) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        cancelFrame();
        persist();
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [cancelFrame, persist, publish]);

  const cancelGesture = useCallback(
    (save = true) => {
      const gesture = dragRef.current;
      dragRef.current = null;
      if (gesture?.target.hasPointerCapture(gesture.pointerId)) {
        gesture.target.releasePointerCapture(gesture.pointerId);
      }
      if (gesture) suppressClickRef.current = true;
      const scene = engineRef.current;
      if (scene) scene.release({ x: 0, y: 0 }, true);
      cancelFrame();
      publish();
      setDragging(false);
      if (save) persist();
    },
    [cancelFrame, persist, publish],
  );

  useEffect(() => {
    storedRef.current = storedPosition;
    if (storedPosition === lastSavedRef.current) return;
    cancelGesture(false);
    lastSavedRef.current = storedPosition;
    const next = ratiosToPixels(storedPosition, size);
    positionRef.current = next;
    engineRef.current?.place(next);
    queueMicrotask(() => {
      setPosition(next);
      setAngle(0);
      setMoving(false);
    });
  }, [cancelGesture, size, storedPosition]);

  useEffect(() => {
    let disposed = false;
    const next = ratiosToPixels(storedRef.current, size);
    positionRef.current = next;
    queueMicrotask(() => {
      if (!disposed) {
        setPosition(next);
        setAngle(0);
        setMoving(false);
        setDragging(false);
        setPhysicsReady(false);
      }
    });
    if (!enabled)
      return () => {
        disposed = true;
      };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    void import("./pet-physics")
      .then(({ createPetPhysics }) =>
        createPetPhysics(
          PET_DISPLAY_SIZES[size],
          {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          positionRef.current ?? next,
        ),
      )
      .then((scene) => {
        if (disposed) {
          scene.dispose();
          return;
        }
        // Dragging and resizing can continue while Rapier initializes.
        scene.resize(
          { width: window.innerWidth, height: window.innerHeight },
          positionRef.current ?? next,
        );
        engineRef.current = scene;
        scene.setReduced(reduced.matches);
        if (dragRef.current && !locked) {
          scene.grab();
          startFrame();
        }
        publish();
        setPhysicsReady(true);
      })
      .catch(() => {
        // Dragging remains available if WebAssembly cannot initialize.
      });

    const resize = () => {
      const scene = engineRef.current;
      const oldViewport = scene
        ? { width: scene.width, height: scene.height }
        : { width: window.innerWidth, height: window.innerHeight };
      const ratios = positionRef.current
        ? pixelsToRatios(positionRef.current, size, oldViewport)
        : storedRef.current;
      cancelGesture();
      const nextPosition = ratiosToPixels(ratios, size);
      positionRef.current = nextPosition;
      scene?.resize(
        { width: window.innerWidth, height: window.innerHeight },
        nextPosition,
      );
      setPosition(nextPosition);
      setAngle(0);
      persist();
    };
    const visibility = () => {
      if (document.hidden) cancelGesture();
      previousFrame.current = null;
    };
    const changeMotion = () => {
      engineRef.current?.setReduced(reduced.matches);
      publish();
      if (reduced.matches && !dragRef.current) cancelFrame();
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", changeMotion);
    return () => {
      disposed = true;
      const gesture = dragRef.current;
      dragRef.current = null;
      if (gesture?.target.hasPointerCapture(gesture.pointerId)) {
        gesture.target.releasePointerCapture(gesture.pointerId);
      }
      if (gesture || engineRef.current?.pose.moving) persist();
      cancelFrame();
      engineRef.current?.dispose();
      engineRef.current = null;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", changeMotion);
    };
  }, [
    cancelFrame,
    cancelGesture,
    enabled,
    locked,
    persist,
    publish,
    size,
    startFrame,
  ]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (
        event.button !== 0 ||
        event.isPrimary === false ||
        !enabled ||
        !positionRef.current ||
        dragRef.current
      )
        return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        target: event.currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        origin: positionRef.current,
        moved: false,
        wasMoving: engineRef.current?.pose.moving ?? false,
        samples: [
          { x: event.clientX, y: event.clientY, time: performance.now() },
        ],
      };
      if (!locked) {
        engineRef.current?.grab();
        setDragging(true);
        setMoving(false);
        startFrame();
      }
    },
    [enabled, locked, startFrame],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId || locked) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const now = performance.now();
      drag.samples.push({ x: event.clientX, y: event.clientY, time: now });
      drag.samples = drag.samples.filter((sample) => now - sample.time <= 100);
      if (Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
        drag.moved = true;
      }
      if (!drag.moved) return;
      event.preventDefault();
      const dimensions = PET_DISPLAY_SIZES[size];
      const next = {
        x: clamp(
          drag.origin.x + deltaX,
          0,
          window.innerWidth - dimensions.width,
        ),
        y: clamp(
          drag.origin.y + deltaY,
          0,
          window.innerHeight - dimensions.height,
        ),
      };
      const scene = engineRef.current;
      if (scene) {
        scene.drag(next);
        publish();
      } else {
        positionRef.current = next;
        setPosition(next);
      }
    },
    [locked, publish, size],
  );

  const finishPointer = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const cancelled =
        event.type === "pointercancel" || event.type === "lostpointercapture";
      const scene = engineRef.current;
      if (scene && !locked) {
        const now = performance.now();
        if (!cancelled)
          drag.samples.push({
            x: event.clientX,
            y: event.clientY,
            time: now,
          });
        if (drag.moved) {
          scene.release(
            cancelled ? { x: 0, y: 0 } : releaseVelocity(drag.samples, now),
            cancelled,
          );
        } else {
          scene.place(scene.pose);
        }
        publish();
        if (scene.pose.moving) startFrame();
        else {
          cancelFrame();
          persist();
        }
      } else if (drag.moved) {
        persist();
      }
      suppressClickRef.current = drag.moved || drag.wasMoving || cancelled;
      setDragging(false);
    },
    [cancelFrame, locked, persist, publish, startFrame],
  );

  return {
    dragging,
    moving,
    angle,
    physicsReady,
    position,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
      onLostPointerCapture: finishPointer,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        if (
          event.detail !== 0 &&
          (suppressClickRef.current || engineRef.current?.pose.moving)
        ) {
          event.preventDefault();
          suppressClickRef.current = false;
          return;
        }
        onClick();
      },
    },
  };
}
