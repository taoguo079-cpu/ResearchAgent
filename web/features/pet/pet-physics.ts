import type * as Rapier from "@dimforge/rapier3d-compat";

import {
  clampToy,
  createToyBody,
  hasStableToyMotion,
  releaseToyBody,
  TOY_MAX_SPEED,
  TOY_RESTITUTION,
  TOY_REST_DELAY,
  toyRotation,
  type RapierModule,
} from "@/features/welcome/rigid-toy-physics";
import {
  FIXED_STEP,
  GRAVITY,
  type Point,
} from "@/features/welcome/toy-physics";

type Dimensions = { width: number; height: number };
export type PetPhysicsPose = Point & {
  angle: number;
  moving: boolean;
};

let rapierRuntime: Promise<RapierModule> | null = null;
function loadRapier() {
  rapierRuntime ??= import("@dimforge/rapier3d-compat").then(async (module) => {
    await module.default.init();
    return module.default;
  });
  return rapierRuntime;
}

/** The welcome scene's fixed-step Rapier body, without its title or 3D canvas. */
export class PetPhysics {
  readonly world: Rapier.World;
  readonly body: Rapier.RigidBody;
  readonly collider: Rapier.Collider;
  private boundaries: Rapier.RigidBody[] = [];
  private target: Point | null = null;
  private stableTime = 0;
  private dragging = false;
  private reduced = false;
  private margin = 24;
  width: number;
  height: number;

  constructor(
    private readonly rapier: RapierModule,
    readonly dimensions: Dimensions,
    viewport: Dimensions,
    initial: Point,
  ) {
    this.width = viewport.width;
    this.height = viewport.height;
    this.world = new rapier.World({ x: 0, y: -GRAVITY, z: 0 });
    this.world.timestep = FIXED_STEP;
    const mass = 1.4;
    const inertia =
      (mass * (dimensions.width ** 2 + dimensions.height ** 2)) / 12;
    const point = this.worldPoint(initial);
    this.body = createToyBody(
      rapier,
      this.world,
      mass,
      inertia,
      point.x,
      point.y,
    );
    this.collider = this.world.createCollider(
      rapier.ColliderDesc.cuboid(
        dimensions.width / 2,
        dimensions.height / 2,
        20,
      )
        .setDensity(0)
        .setFriction(0.65)
        .setRestitution(TOY_RESTITUTION)
        .setContactSkin(0.1),
      this.body,
    );
    this.resize(viewport, initial);
  }

  private worldPoint(topLeft: Point) {
    return {
      x: topLeft.x + this.dimensions.width / 2 - this.width / 2,
      y: this.height / 2 - topLeft.y - this.dimensions.height / 2,
      z: 0,
    };
  }

  get pose(): PetPhysicsPose {
    const point = this.body.translation();
    const rotation = this.body.rotation();
    return {
      x: point.x + this.width / 2 - this.dimensions.width / 2,
      y: this.height / 2 - point.y - this.dimensions.height / 2,
      angle: -2 * Math.atan2(rotation.z, rotation.w),
      moving: !this.dragging && !this.body.isSleeping(),
    };
  }

  resize(viewport: Dimensions, position: Point) {
    for (const boundary of this.boundaries)
      this.world.removeRigidBody(boundary);
    this.boundaries = [];
    this.width = Math.max(1, viewport.width);
    this.height = Math.max(1, viewport.height);
    this.margin = Math.max(
      0,
      Math.min(
        24,
        (this.width - this.dimensions.width) / 2,
        (this.height - this.dimensions.height) / 2,
      ),
    );
    const m = this.margin;
    for (const [x, y, hx, hy] of [
      [-this.width / 2 + m - 12, 0, 12, this.height],
      [this.width / 2 - m + 12, 0, 12, this.height],
      [0, this.height / 2 - m + 12, this.width, 12],
      [0, -this.height / 2 + m - 12, this.width, 12],
    ]) {
      const boundary = this.world.createRigidBody(
        this.rapier.RigidBodyDesc.fixed().setTranslation(x, y, 0),
      );
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(hx, hy, 100)
          .setFriction(0.65)
          .setRestitution(TOY_RESTITUTION),
        boundary,
      );
      this.boundaries.push(boundary);
    }
    this.place(position);
  }

  place(position: Point) {
    this.dragging = false;
    this.target = null;
    this.stableTime = 0;
    this.body.setBodyType(this.rapier.RigidBodyType.Dynamic, false);
    this.body.setTranslation(this.worldPoint(position), false);
    this.body.setRotation(toyRotation(0), false);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    this.body.setGravityScale(0, false);
    this.constrain();
    this.body.sleep();
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    this.collider.setRestitution(reduced ? 0 : TOY_RESTITUTION);
    if (reduced && !this.dragging) this.place(this.pose);
  }

  grab() {
    this.dragging = true;
    this.stableTime = 0;
    this.target = this.pose;
    this.body.setBodyType(
      this.rapier.RigidBodyType.KinematicPositionBased,
      true,
    );
  }

  drag(position: Point) {
    this.target = {
      x: clampToy(
        position.x,
        this.margin,
        Math.max(this.margin, this.width - this.dimensions.width - this.margin),
      ),
      y: clampToy(
        position.y,
        this.margin,
        Math.max(
          this.margin,
          this.height - this.dimensions.height - this.margin,
        ),
      ),
    };
    if (this.reduced) {
      const point = this.worldPoint(this.target);
      this.body.setTranslation(point, true);
      this.body.setNextKinematicTranslation(point);
    }
  }

  release(velocity: Point, cancelled = false) {
    this.dragging = false;
    this.target = null;
    this.stableTime = 0;
    if (cancelled || this.reduced) {
      this.place(this.pose);
      return;
    }
    this.body.setBodyType(this.rapier.RigidBodyType.Dynamic, true);
    this.body.setGravityScale(1, true);
    releaseToyBody(this.body, velocity);
  }

  private constrain() {
    const pose = this.pose;
    const cos = Math.abs(Math.cos(pose.angle));
    const sin = Math.abs(Math.sin(pose.angle));
    const halfWidth =
      (cos * this.dimensions.width + sin * this.dimensions.height) / 2;
    const halfHeight =
      (sin * this.dimensions.width + cos * this.dimensions.height) / 2;
    const cx = pose.x + this.dimensions.width / 2;
    const cy = pose.y + this.dimensions.height / 2;
    const x = clampToy(
      cx,
      halfWidth + this.margin,
      Math.max(halfWidth + this.margin, this.width - halfWidth - this.margin),
    );
    const y = clampToy(
      cy,
      halfHeight + this.margin,
      Math.max(
        halfHeight + this.margin,
        this.height - halfHeight - this.margin,
      ),
    );
    if (Math.hypot(x - cx, y - cy) <= 0.5) return;
    this.body.setTranslation(
      this.worldPoint({
        x: x - this.dimensions.width / 2,
        y: y - this.dimensions.height / 2,
      }),
      true,
    );
    if (!this.dragging) {
      const velocity = this.body.linvel();
      this.body.setLinvel(
        {
          x: x === cx ? velocity.x : -velocity.x * 0.7,
          y: y === cy ? velocity.y : -velocity.y * 0.4,
          z: 0,
        },
        true,
      );
    }
  }

  step(dt = FIXED_STEP) {
    if (this.dragging && this.target) {
      const pose = this.pose;
      const dx = this.target.x - pose.x;
      const dy = this.target.y - pose.y;
      const factor = Math.min(
        1,
        (TOY_MAX_SPEED * dt) / Math.max(0.001, Math.hypot(dx, dy)),
      );
      this.body.setNextKinematicTranslation(
        this.worldPoint({
          x: pose.x + dx * factor,
          y: pose.y + dy * factor,
        }),
      );
    }
    this.world.step();
    this.constrain();
    const velocity = this.body.linvel();
    let supported = this.body.isSleeping();
    this.world.contactPairsWith(this.collider, (other) => {
      this.world.contactPair(this.collider, other, (manifold) => {
        for (let i = 0; i < manifold.numContacts(); i++) {
          if (manifold.contactDist(i) < 0.5) supported = true;
        }
      });
    });
    const stable =
      !this.dragging &&
      supported &&
      hasStableToyMotion(velocity.x, velocity.y, this.body.angvel().z);
    this.stableTime = stable ? this.stableTime + dt : 0;
    if (this.stableTime >= TOY_REST_DELAY) this.body.sleep();
  }

  dispose() {
    this.world.free();
  }
}

export async function createPetPhysics(
  dimensions: Dimensions,
  viewport: Dimensions,
  initial: Point,
) {
  return new PetPhysics(await loadRapier(), dimensions, viewport, initial);
}
