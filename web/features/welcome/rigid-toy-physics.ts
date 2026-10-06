import type * as Rapier from "@dimforge/rapier3d-compat";
import type { Point } from "./toy-physics";

export type RapierModule = Omit<typeof Rapier, "default" | "RAPIER">;
export const TOY_MAX_SPEED = 4200;
export const TOY_RESTITUTION = 0.48;
export const TOY_REST_DELAY = 0.4;
export const clampToy = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));
export const toyRotation = (angle: number) => ({
  x: 0,
  y: 0,
  z: Math.sin(angle / 2),
  w: Math.cos(angle / 2),
});

/** Shared unchanged body configuration from the original main welcome scene. */
export function createToyBody(
  rapier: RapierModule,
  world: Rapier.World,
  mass: number,
  inertia: number,
  x: number,
  y: number,
  gravity = 1,
) {
  return world.createRigidBody(
    rapier.RigidBodyDesc.dynamic()
      .setTranslation(x, y, 0)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, true)
      .setGravityScale(gravity)
      .setCcdEnabled(true)
      .setLinearDamping(0.35)
      .setAngularDamping(2)
      .setAdditionalMassProperties(
        mass,
        { x: 0, y: 0, z: 0 },
        { x: inertia, y: inertia, z: inertia },
        { x: 0, y: 0, z: 0, w: 1 },
      ),
  );
}

export function releaseToyBody(body: Rapier.RigidBody, velocity: Point) {
  const speed = Math.hypot(velocity.x, velocity.y);
  const factor = Math.min(1, TOY_MAX_SPEED / Math.max(1, speed));
  body.setLinvel(
    { x: velocity.x * factor, y: -velocity.y * factor, z: 0 },
    true,
  );
  body.setAngvel({ x: 0, y: 0, z: clampToy(-velocity.x / 2200, -2, 2) }, true);
}

export function hasStableToyMotion(vx: number, vy: number, spin: number) {
  return Math.hypot(vx, vy) < 14 && Math.abs(spin) < 0.15;
}
