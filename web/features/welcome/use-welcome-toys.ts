"use client";

import { useCallback, useLayoutEffect, useRef, type PointerEvent } from "react";
import { releaseVelocity, type Point, type ToyId } from "./toy-physics";
import type { NeonPhysics } from "./neon-physics";

type Options = {
  magnifier: boolean;
  robot: boolean;
  reduced: boolean;
  onEvent: (event: "toys-stable") => void;
  onDrag: () => void;
  onTap: (pointerType: string, time: number) => void;
};
type Gesture = {
  id: ToyId;
  pointer: number;
  target: HTMLButtonElement;
  start: Point;
  origin: Point;
  moved: boolean;
  wasStill: boolean;
  samples: (Point & { time: number })[];
};

export function useWelcomeToys(options: Options) {
  const page = useRef<HTMLElement>(null),
    robot = useRef<HTMLButtonElement>(null),
    magnifier = useRef<HTMLButtonElement>(null),
    guidance = useRef<HTMLDivElement>(null);
  const engine = useRef<NeonPhysics | null>(null),
    latest = useRef(options),
    gesture = useRef<Gesture | null>(null),
    suppressUntil = useRef(0);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const paint = useCallback(() => {
    const physics = engine.current;
    if (!physics) return;
    for (const id of ["magnifier", "robot"] as const) {
      const node = id === "robot" ? robot.current : magnifier.current;
      const toy = physics.toys[id];
      if (!node || !toy) continue;
      node.style.width = `${Math.max(44, toy.width)}px`;
      node.style.height = `${Math.max(44, toy.height)}px`;
      node.style.left = `${toy.x}px`;
      node.style.top = `${toy.y}px`;
      node.style.transform = `translate(-50%, -50%) rotate(${toy.angle}rad)`;
      node.dataset.motion = toy.dragging
        ? "dragging"
        : id === "magnifier" && physics.held
          ? "held"
          : toy.sleeping
            ? "still"
            : "moving";
      node.dataset.heldHand =
        id === "magnifier" ? (physics.held?.hand ?? "") : "";
      node.dataset.vx = String(Math.round(toy.vx));
      node.dataset.vy = String(Math.round(toy.vy));
      const visual = node.firstElementChild as HTMLElement | null;
      if (visual) {
        visual.style.display = "block";
        visual.style.width = `${toy.width}px`;
        visual.style.height = `${toy.height}px`;
      }
    }
    const node = guidance.current,
      toy = physics.toys.robot;
    if (node && toy) {
      const ext = physics.extents(toy);
      node.style.left = `${Math.max(16, Math.min(physics.width - node.offsetWidth - 16, toy.x - node.offsetWidth / 2))}px`;
      const above = toy.y - ext.top - node.offsetHeight - 14;
      const titleBottom =
        physics.height / 2 -
        physics.layout.anchor.y -
        physics.titleOffset.y +
        physics.layout.height / 2;
      const below = Math.max(toy.y + ext.bottom + 16, titleBottom + 30);
      // When a toy rests on the letters, a top-clamped bubble would cover it.
      // Use the open area below the title on phones and short screens instead.
      const preferred =
        above >= 48
          ? above
          : Math.min(below, physics.height - node.offsetHeight - 80);
      node.style.top = `${Math.max(16, Math.min(physics.height - node.offsetHeight - 16, preferred))}px`;
    }
    if (page.current) {
      page.current.dataset.titleContacts = String(physics.contacts.title);
      page.current.dataset.toyContacts = String(physics.contacts.toys);
      page.current.dataset.titleOffset = String(
        Math.round(
          Math.hypot(physics.titleOffset.x, physics.titleOffset.y) * 100,
        ) / 100,
      );
    }
  }, []);
  const connect = useCallback(
    (physics: NeonPhysics | null) => {
      engine.current = physics;
      if (!physics) return;
      physics.onUpdate = paint;
      physics.onStable = () => latest.current.onEvent("toys-stable");
      physics.resize(
        page.current?.clientWidth ?? 1280,
        page.current?.clientHeight ?? 800,
      );
      physics.setReduced(latest.current.reduced);
      if (latest.current.magnifier) physics.spawn("magnifier");
      if (latest.current.robot) physics.spawn("robot");
      paint();
    },
    [paint],
  );
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (page.current)
        engine.current?.resize(
          page.current.clientWidth,
          page.current.clientHeight,
        );
      paint();
    });
    if (page.current) observer.observe(page.current);
    const cancel = () => {
      const active = gesture.current;
      gesture.current = null;
      if (active?.moved)
        engine.current?.release(active.id, { x: 0, y: 0 }, false);
      if (active?.target.hasPointerCapture(active.pointer))
        active.target.releasePointerCapture(active.pointer);
      if (active) suppressUntil.current = performance.now() + 450;
    };
    const visibility = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [paint]);
  useLayoutEffect(() => {
    const physics = engine.current;
    if (!physics) return;
    physics.setReduced(options.reduced);
    if (options.magnifier) physics.spawn("magnifier");
    if (options.robot) physics.spawn("robot");
    paint();
  }, [options.magnifier, options.robot, options.reduced, paint]);
  useLayoutEffect(() => {
    paint();
  });
  const canActivate = useCallback(
    () =>
      !!engine.current?.toys.robot?.sleeping &&
      !gesture.current?.moved &&
      performance.now() >= suppressUntil.current,
    [],
  );
  function handlers(id: ToyId) {
    const finish = (
      event: PointerEvent<HTMLButtonElement>,
      cancelled = false,
    ) => {
      event.stopPropagation();
      const active = gesture.current;
      if (!active || active.pointer !== event.pointerId) return;
      gesture.current = null;
      if (active.moved) {
        const now = performance.now();
        if (!cancelled)
          active.samples.push({
            x: event.clientX,
            y: event.clientY,
            time: now,
          });
        engine.current?.release(
          id,
          cancelled ? { x: 0, y: 0 } : releaseVelocity(active.samples, now),
          !cancelled,
        );
        suppressUntil.current = now + 450;
      } else if (!active.wasStill)
        suppressUntil.current = performance.now() + 450;
      else if (!cancelled && id === "robot" && canActivate())
        latest.current.onTap(event.pointerType, event.timeStamp);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      paint();
    };
    return {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        event.stopPropagation();
        if (gesture.current || event.button !== 0 || !event.isPrimary) return;
        const toy = engine.current?.toys[id];
        if (!toy) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = {
          id,
          pointer: event.pointerId,
          target: event.currentTarget,
          start: { x: event.clientX, y: event.clientY },
          origin: { x: toy.x, y: toy.y },
          moved: false,
          wasStill: toy.sleeping,
          samples: [
            { x: event.clientX, y: event.clientY, time: performance.now() },
          ],
        };
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const active = gesture.current;
        if (!active || active.pointer !== event.pointerId || active.id !== id)
          return;
        event.stopPropagation();
        const now = performance.now();
        active.samples.push({ x: event.clientX, y: event.clientY, time: now });
        active.samples = active.samples.filter(
          (sample) => now - sample.time <= 100,
        );
        if (
          !active.moved &&
          Math.hypot(
            event.clientX - active.start.x,
            event.clientY - active.start.y,
          ) > 6
        ) {
          active.moved = true;
          engine.current?.grab(id);
          latest.current.onDrag();
        }
        if (!active.moved) return;
        event.preventDefault();
        engine.current?.drag(
          id,
          active.origin.x + event.clientX - active.start.x,
          active.origin.y + event.clientY - active.start.y,
        );
        paint();
      },
      onPointerUp: finish,
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) =>
        finish(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) =>
        finish(event, true),
    };
  }
  return { page, robot, magnifier, guidance, connect, handlers, canActivate };
}
