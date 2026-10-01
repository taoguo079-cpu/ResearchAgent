export type ToyId = "magnifier" | "robot";
export type Hand = "left" | "right";
export type Point = { x: number; y: number };
export type Toy = Point & {
  id: ToyId;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  squash: number;
  spring: number;
  sleeping: boolean;
  dragging: boolean;
  entered: boolean;
  landed: boolean;
  stableTime: number;
};
export const FIXED_STEP = 1 / 120;
export const GRAVITY = 2200;

/** Pointer velocity is based on the final 80ms; pauses and cancellation never throw. */
export function releaseVelocity(
  samples: (Point & { time: number })[],
  now: number,
): Point {
  const recent = samples.filter((sample) => now - sample.time <= 80);
  const first = recent[0],
    last = recent.at(-1);
  if (!first || !last || last.time - first.time < 8 || now - last.time > 45)
    return { x: 0, y: 0 };
  const dt = (last.time - first.time) / 1000,
    x = (last.x - first.x) / dt,
    y = (last.y - first.y) / dt;
  const factor = Math.min(1, 4200 / Math.hypot(x, y));
  return { x: x * factor, y: y * factor };
}
