import type * as Rapier from "@dimforge/rapier3d-compat";
import { makeTitleLayout, type TitleLayout } from "./title-geometry";
import {
  FIXED_STEP,
  releaseVelocity,
  type Hand,
  type Point,
  type Toy,
  type ToyId,
} from "./toy-physics";

type RuntimeToy = Toy & {
  body: Rapier.RigidBody;
  colliders: Rapier.Collider[];
  target: Point | null;
};
type RapierModule = Omit<typeof Rapier, "default" | "RAPIER">;
const MAX_SPEED = 4200;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const rotation = (angle: number) => ({
  x: 0,
  y: 0,
  z: Math.sin(angle / 2),
  w: Math.cos(angle / 2),
});

/** One Rapier world drives both the 3D meshes and their accessible DOM controls. */
export class NeonPhysics {
  toys: Partial<Record<ToyId, RuntimeToy>> = {};
  width = 0;
  height = 0;
  scale = 1;
  reduced = false;
  layout!: TitleLayout;
  title!: Rapier.RigidBody;
  titleOffset = { x: 0, y: 0, angle: 0 };
  contacts = { title: 0, toys: 0 };
  held: { hand: Hand; angle: number } | null = null;
  onUpdate: () => void = () => {};
  onStable: () => void = () => {};
  private joint: Rapier.ImpulseJoint | null = null;
  private boundaries: Rapier.RigidBody[] = [];
  private titleInertia = 1;
  private announced = false;
  private contactPairs = new Set<string>();
  private disposed = false;
  constructor(
    readonly rapier: RapierModule,
    readonly world: Rapier.World,
  ) {
    this.resize(1280, 800);
  }

  private worldPoint(point: Point) {
    return { x: point.x - this.width / 2, y: this.height / 2 - point.y, z: 0 };
  }
  private addBox(
    body: Rapier.RigidBody,
    x: number,
    y: number,
    hx: number,
    hy: number,
    hz = 20,
    angle = 0,
  ) {
    const desc = this.rapier.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(x, y, 0)
      .setRotation(rotation(angle))
      .setDensity(0)
      .setFriction(0.65)
      .setRestitution(this.reduced ? 0 : 0.48)
      .setContactSkin(0.1);
    return this.world.createCollider(desc, body);
  }
  private addBall(
    body: Rapier.RigidBody,
    x: number,
    y: number,
    radius: number,
  ) {
    return this.world.createCollider(
      this.rapier.ColliderDesc.ball(radius)
        .setTranslation(x, y, 0)
        .setDensity(0)
        .setFriction(0.6)
        .setRestitution(this.reduced ? 0 : 0.48),
      body,
    );
  }
  private dynamic(
    mass: number,
    inertia: number,
    x: number,
    y: number,
    gravity = 1,
  ) {
    return this.world.createRigidBody(
      this.rapier.RigidBodyDesc.dynamic()
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

  resize(width: number, height: number) {
    width = Math.max(1, width);
    height = Math.max(1, height);
    if (this.width === width && this.height === height) return;
    const oldWidth = this.width || width,
      oldHeight = this.height || height;
    const saved = Object.values(this.toys).map((toy) => ({
      id: toy.id,
      x: toy.x / oldWidth,
      y: toy.y / oldHeight,
      sleeping: toy.sleeping,
      angle: toy.angle,
      vx: toy.vx,
      vy: toy.vy,
    }));
    const held = this.held?.hand;
    this.detach();
    for (const toy of Object.values(this.toys))
      this.world.removeRigidBody(toy.body);
    this.toys = {};
    if (this.title) this.world.removeRigidBody(this.title);
    for (const body of this.boundaries) this.world.removeRigidBody(body);
    this.boundaries = [];
    this.contactPairs.clear();
    this.width = width;
    this.height = height;
    this.scale = height <= 500 ? 0.625 : width < 640 ? 0.78 : 1;
    this.layout = makeTitleLayout(width, height);
    this.titleInertia = Math.max(
      1,
      (8 * (this.layout.width ** 2 + this.layout.height ** 2)) / 12,
    );
    this.title = this.dynamic(
      8,
      this.titleInertia,
      this.layout.anchor.x,
      this.layout.anchor.y,
      0,
    );
    this.title.setAngularDamping(0);
    this.title.setLinearDamping(0);
    for (const segment of this.layout.segments)
      this.addBox(
        this.title,
        segment.x,
        segment.y,
        segment.length / 2 + this.layout.radius * 0.4,
        this.layout.radius + Math.abs(this.layout.shear.y) * 0.45,
        this.layout.depth / 2 + 2,
        segment.angle,
      );
    if (this.reduced)
      this.title.setBodyType(this.rapier.RigidBodyType.Fixed, true);
    for (const [x, y, hx, hy] of [
      [-width / 2 - 12, 0, 12, height * 2],
      [width / 2 + 12, 0, 12, height * 2],
      [0, -height / 2 - 12, width, 12],
    ]) {
      const body = this.world.createRigidBody(
        this.rapier.RigidBodyDesc.fixed().setTranslation(x, y, 0),
      );
      this.addBox(body, 0, 0, hx, hy, 100);
      this.boundaries.push(body);
    }
    for (const previous of saved) {
      this.spawn(previous.id);
      const toy = this.toys[previous.id]!;
      toy.x = previous.x * width;
      toy.y = previous.sleeping ? height - toy.height / 2 : previous.y * height;
      toy.angle = previous.angle;
      this.constrain(toy);
      toy.body.setTranslation(this.worldPoint(toy), true);
      toy.body.setRotation(rotation(-toy.angle), true);
      toy.body.setLinvel({ x: previous.vx, y: -previous.vy, z: 0 }, true);
      if (previous.sleeping) {
        toy.body.sleep();
        toy.sleeping = true;
      }
    }
    if (held && this.toys.robot && this.toys.magnifier) this.attach(held);
    this.sync(0);
  }

  spawn(id: ToyId) {
    if (this.toys[id] || this.disposed) return;
    const width = (id === "robot" ? 192 : 76) * this.scale,
      height = (id === "robot" ? 208 : 90) * this.scale;
    // The two trajectories cross near the top contour, so the initial drop exercises contact.
    const x = this.width / 2 + (id === "robot" ? 42 : -48) * this.scale;
    const y = this.reduced ? this.height - height / 2 : -height / 2 - 12;
    const point = this.worldPoint({ x, y });
    const mass = id === "robot" ? 1.4 : 0.55;
    const body = this.dynamic(
      mass,
      (mass * (width ** 2 + height ** 2)) / 12,
      point.x,
      point.y,
    );
    const s = this.scale;
    const colliders: Rapier.Collider[] = [];
    if (id === "robot") {
      colliders.push(this.addBox(body, 0, 48 * s, 62 * s, 38 * s, 24 * s));
      colliders.push(this.addBox(body, 0, -27 * s, 47 * s, 44 * s, 22 * s));
      for (const side of [-1, 1]) {
        colliders.push(
          this.addBox(
            body,
            side * 58 * s,
            -16 * s,
            20 * s,
            7 * s,
            10 * s,
            -side * 0.33,
          ),
        );
        colliders.push(this.addBall(body, side * 72 * s, -20 * s, 12 * s));
        colliders.push(
          this.addBox(body, side * 30 * s, -89 * s, 15 * s, 15 * s, 15 * s),
        );
      }
      colliders.push(this.addBox(body, 0, 94 * s, 5 * s, 10 * s, 5 * s));
    } else {
      colliders.push(this.addBall(body, -8 * s, 12 * s, 28 * s));
      colliders.push(
        this.addBox(body, 18 * s, -23 * s, 7 * s, 25 * s, 7 * s, 0.68),
      );
    }
    const toy: RuntimeToy = {
      id,
      width,
      height,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      squash: 0,
      spring: 0,
      sleeping: false,
      dragging: false,
      entered: false,
      landed: false,
      stableTime: 0,
      body,
      colliders,
      target: null,
    };
    this.toys[id] = toy;
    if (this.reduced) this.settle(toy);
    this.onUpdate();
  }

  extents(toy: Toy) {
    const cos = Math.abs(Math.cos(toy.angle)),
      sin = Math.abs(Math.sin(toy.angle));
    let left = (cos * toy.width + sin * toy.height) / 2,
      right = left;
    let top = (sin * toy.width + cos * toy.height) / 2,
      bottom = top;
    if (toy.id === "robot" && this.held && this.toys.magnifier) {
      const lens = this.toys.magnifier;
      const ext = this.extents(lens);
      left = Math.max(left, toy.x - lens.x + ext.left);
      right = Math.max(right, lens.x - toy.x + ext.right);
      top = Math.max(top, toy.y - lens.y + ext.top);
      bottom = Math.max(bottom, lens.y - toy.y + ext.bottom);
    }
    return { left, right, top, bottom };
  }
  private constrain(toy: RuntimeToy) {
    const ext = this.extents(toy);
    toy.x = clamp(toy.x, ext.left, Math.max(ext.left, this.width - ext.right));
    toy.y = Math.min(toy.y, this.height - ext.bottom);
    if (toy.entered || toy.dragging || this.reduced)
      toy.y = Math.max(ext.top, toy.y);
  }
  private settle(toy: RuntimeToy) {
    toy.angle = toy.vx = toy.vy = toy.spin = 0;
    toy.y = this.height - toy.height / 2;
    toy.entered = toy.landed = true;
    this.constrain(toy);
    toy.body.setTranslation(this.worldPoint(toy), true);
    toy.body.setRotation(rotation(0), true);
    toy.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    toy.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    toy.body.sleep();
    toy.sleeping = true;
  }
  setReduced(reduced: boolean) {
    if (this.reduced === reduced) return;
    this.reduced = reduced;
    this.title.setBodyType(
      reduced
        ? this.rapier.RigidBodyType.Fixed
        : this.rapier.RigidBodyType.Dynamic,
      true,
    );
    this.title.setTranslation({ ...this.layout.anchor, z: 0 }, true);
    this.title.setRotation(rotation(0), true);
    for (const toy of Object.values(this.toys)) {
      for (const collider of toy.colliders)
        collider.setRestitution(reduced ? 0 : 0.48);
      if (reduced && !toy.dragging && !(toy.id === "magnifier" && this.held))
        this.settle(toy);
    }
  }
  hand(which: Hand): Point | null {
    const robot = this.toys.robot;
    if (!robot) return null;
    const x = (which === "left" ? -72 : 72) * this.scale,
      y = 20 * this.scale;
    return {
      x: robot.x + x * Math.cos(robot.angle) - y * Math.sin(robot.angle),
      y: robot.y + x * Math.sin(robot.angle) + y * Math.cos(robot.angle),
    };
  }
  private detach() {
    if (this.joint) this.world.removeImpulseJoint(this.joint, true);
    this.joint = null;
    this.held = null;
  }
  private attach(hand: Hand) {
    const lens = this.toys.magnifier!,
      robot = this.toys.robot!,
      palm = this.hand(hand)!;
    const angle = lens.angle,
      grip = { x: 26 * this.scale, y: 32 * this.scale };
    lens.x = palm.x - Math.cos(angle) * grip.x + Math.sin(angle) * grip.y;
    lens.y = palm.y - Math.sin(angle) * grip.x - Math.cos(angle) * grip.y;
    lens.body.setTranslation(this.worldPoint(lens), true);
    lens.body.setLinvel(robot.body.linvel(), true);
    const relative = lens.angle - robot.angle;
    this.joint = this.world.createImpulseJoint(
      this.rapier.JointData.fixed(
        {
          x: (hand === "left" ? -72 : 72) * this.scale,
          y: -20 * this.scale,
          z: 0,
        },
        rotation(0),
        { x: grip.x, y: -grip.y, z: 0 },
        rotation(relative),
      ),
      robot.body,
      lens.body,
      true,
    );
    this.joint.setContactsEnabled(false);
    this.held = { hand, angle: relative };
    lens.sleeping = robot.sleeping;
    if (this.reduced) this.syncHeld();
  }
  private syncHeld() {
    if (!this.held || !this.toys.robot || !this.toys.magnifier) return;
    const lens = this.toys.magnifier,
      robot = this.toys.robot,
      palm = this.hand(this.held.hand)!;
    const angle = robot.angle + this.held.angle;
    lens.angle = angle;
    lens.x =
      palm.x -
      Math.cos(angle) * 26 * this.scale +
      Math.sin(angle) * 32 * this.scale;
    lens.y =
      palm.y -
      Math.sin(angle) * 26 * this.scale -
      Math.cos(angle) * 32 * this.scale;
    lens.body.setTranslation(this.worldPoint(lens), true);
    lens.body.setRotation(rotation(-angle), true);
  }
  grab(id: ToyId) {
    const toy = this.toys[id];
    if (!toy) return;
    if (id === "magnifier") this.detach();
    toy.dragging = true;
    toy.sleeping = false;
    toy.stableTime = 0;
    toy.body.setBodyType(
      this.rapier.RigidBodyType.KinematicPositionBased,
      true,
    );
    toy.target = { x: toy.x, y: toy.y };
    this.title.wakeUp();
  }
  drag(id: ToyId, x: number, y: number) {
    const toy = this.toys[id];
    if (!toy?.dragging) return;
    const ext = this.extents(toy);
    toy.target = {
      x: clamp(x, ext.left, Math.max(ext.left, this.width - ext.right)),
      y: clamp(y, ext.top, Math.max(ext.top, this.height - ext.bottom)),
    };
    if (this.reduced) {
      toy.x = toy.target.x;
      toy.y = toy.target.y;
      toy.body.setTranslation(this.worldPoint(toy), true);
      toy.body.setNextKinematicTranslation(this.worldPoint(toy));
      this.syncHeld();
    }
  }
  release(id: ToyId, velocity: Point, canSnap = true) {
    const toy = this.toys[id];
    if (!toy) return;
    toy.dragging = false;
    toy.target = null;
    toy.stableTime = 0;
    toy.body.setBodyType(this.rapier.RigidBodyType.Dynamic, true);
    const speed = Math.hypot(velocity.x, velocity.y);
    if (id === "magnifier" && canSnap && speed < 300 && this.toys.robot) {
      const grip = {
        x:
          toy.x +
          Math.cos(toy.angle) * 26 * this.scale -
          Math.sin(toy.angle) * 32 * this.scale,
        y:
          toy.y +
          Math.sin(toy.angle) * 26 * this.scale +
          Math.cos(toy.angle) * 32 * this.scale,
      };
      const candidates = (["left", "right"] as const)
        .map((hand) => ({ hand, point: this.hand(hand)! }))
        .sort(
          (a, b) =>
            Math.hypot(a.point.x - grip.x, a.point.y - grip.y) -
            Math.hypot(b.point.x - grip.x, b.point.y - grip.y),
        );
      if (
        Math.hypot(
          candidates[0].point.x - grip.x,
          candidates[0].point.y - grip.y,
        ) <=
        26 * this.scale
      ) {
        this.attach(candidates[0].hand);
        this.onUpdate();
        return;
      }
    }
    const factor = Math.min(1, MAX_SPEED / Math.max(1, speed));
    toy.body.setLinvel(
      { x: velocity.x * factor, y: -velocity.y * factor, z: 0 },
      true,
    );
    toy.body.setAngvel(
      { x: 0, y: 0, z: clamp(-velocity.x / 2200, -2, 2) },
      true,
    );
    if (this.reduced) this.settle(toy);
    this.onUpdate();
  }

  beforeStep(dt = FIXED_STEP) {
    if (this.disposed) return;
    if (!this.reduced && !this.title.isSleeping()) {
      const point = this.title.translation(),
        velocity = this.title.linvel(),
        angle =
          2 * Math.atan2(this.title.rotation().z, this.title.rotation().w);
      this.title.resetForces(false);
      this.title.resetTorques(false);
      this.title.addForce(
        {
          x: -8 * (64 * (point.x - this.layout.anchor.x) + 16 * velocity.x),
          y: -8 * (64 * (point.y - this.layout.anchor.y) + 16 * velocity.y),
          z: 0,
        },
        false,
      );
      this.title.addTorque(
        {
          x: 0,
          y: 0,
          z: -this.titleInertia * (64 * angle + 16 * this.title.angvel().z),
        },
        false,
      );
    }
    for (const toy of Object.values(this.toys)) {
      if (toy.dragging && toy.target) {
        const dx = toy.target.x - toy.x,
          dy = toy.target.y - toy.y,
          factor = Math.min(
            1,
            (MAX_SPEED * dt) / Math.max(0.001, Math.hypot(dx, dy)),
          );
        toy.body.setNextKinematicTranslation(
          this.worldPoint({ x: toy.x + dx * factor, y: toy.y + dy * factor }),
        );
      }
    }
    if (this.reduced) this.syncHeld();
  }

  sync(dt = FIXED_STEP) {
    if (this.disposed) return;
    const title = this.title.translation();
    this.titleOffset = {
      x: title.x - this.layout.anchor.x,
      y: title.y - this.layout.anchor.y,
      angle: 2 * Math.atan2(this.title.rotation().z, this.title.rotation().w),
    };
    if (
      Math.hypot(this.titleOffset.x, this.titleOffset.y) > 28 ||
      Math.abs(this.titleOffset.angle) > 0.07
    ) {
      this.title.setTranslation(
        {
          x: this.layout.anchor.x + clamp(this.titleOffset.x, -20, 20),
          y: this.layout.anchor.y + clamp(this.titleOffset.y, -20, 20),
          z: 0,
        },
        false,
      );
      this.title.setRotation(
        rotation(clamp(this.titleOffset.angle, -0.07, 0.07)),
        false,
      );
    }
    const pairs = new Set<string>();
    for (const toy of Object.values(this.toys)) {
      const position = toy.body.translation(),
        velocity = toy.body.linvel(),
        q = toy.body.rotation();
      toy.x = position.x + this.width / 2;
      toy.y = this.height / 2 - position.y;
      toy.vx = velocity.x;
      toy.vy = -velocity.y;
      toy.angle = -2 * Math.atan2(q.z, q.w);
      toy.spin = -toy.body.angvel().z;
      const ext = this.extents(toy);
      if (toy.y >= ext.top) toy.entered = true;
      const original = { x: toy.x, y: toy.y };
      this.constrain(toy);
      if (
        Math.hypot(toy.x - original.x, toy.y - original.y) > 0.5 &&
        !toy.dragging
      ) {
        toy.body.setTranslation(this.worldPoint(toy), true);
        const vx = toy.x === original.x ? velocity.x : -velocity.x * 0.7,
          vy = toy.y === original.y ? velocity.y : -velocity.y * 0.4;
        toy.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
      }
      let supported = toy.body.isSleeping();
      for (const collider of toy.colliders)
        this.world.contactPairsWith(collider, (other) => {
          let touching = false;
          this.world.contactPair(collider, other, (manifold) => {
            for (let i = 0; i < manifold.numContacts(); i++)
              if (manifold.contactDist(i) < 0.5) touching = true;
          });
          if (!touching) return;
          supported = true;
          toy.landed = true;
          const parent = other.parent();
          if (!parent) return;
          if (parent.handle === this.title.handle) pairs.add(`title:${toy.id}`);
          if (
            parent.handle === this.toys[idOther(toy.id)]?.body.handle &&
            !this.held
          )
            pairs.add("toys");
        });
      if (
        this.reduced &&
        !toy.dragging &&
        !(toy.id === "magnifier" && this.held)
      ) {
        this.settle(toy);
        supported = true;
      }
      const stable =
        !toy.dragging &&
        supported &&
        Math.hypot(toy.vx, toy.vy) < 14 &&
        Math.abs(toy.spin) < 0.15;
      toy.stableTime = stable ? toy.stableTime + dt : 0;
      if (toy.stableTime > 0.4) toy.body.sleep();
      // A supporting spring may wake Rapier for a tiny contact correction. Keep
      // the interaction stable while motion stays below the resting threshold.
      toy.sleeping =
        !toy.dragging && (toy.body.isSleeping() || toy.stableTime >= 0.4);
    }
    for (const pair of pairs)
      if (!this.contactPairs.has(pair)) {
        if (pair === "toys") this.contacts.toys++;
        else this.contacts.title++;
      }
    this.contactPairs = pairs;
    if (
      this.held &&
      this.toys.robot?.sleeping &&
      this.toys.magnifier &&
      !this.toys.magnifier.dragging
    ) {
      this.toys.magnifier.body.sleep();
      this.toys.magnifier.sleeping = true;
    }
    if (
      !this.announced &&
      this.toys.robot?.sleeping &&
      this.toys.magnifier?.sleeping
    ) {
      this.announced = true;
      this.onStable();
    }
    this.onUpdate();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.detach();
    for (const toy of Object.values(this.toys))
      this.world.removeRigidBody(toy.body);
    for (const body of this.boundaries) this.world.removeRigidBody(body);
    this.world.removeRigidBody(this.title);
    this.toys = {};
    this.onStable = () => {};
    this.onUpdate = () => {};
  }
}
function idOther(id: ToyId): ToyId {
  return id === "robot" ? "magnifier" : "robot";
}

export { releaseVelocity };
