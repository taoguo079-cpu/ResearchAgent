import RAPIER from "@dimforge/rapier3d-compat";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NeonPhysics } from "./neon-physics";
import { FIXED_STEP, GRAVITY } from "./toy-physics";
import { makeTitleLayout } from "./title-geometry";

const scenes: NeonPhysics[] = [];
beforeAll(async () => {
  await RAPIER.init();
});
afterEach(() => {
  for (const scene of scenes) {
    scene.dispose();
    scene.world.free();
  }
  scenes.length = 0;
});
function setup(reduced = false, width = 1280, height = 800) {
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = FIXED_STEP;
  const scene = new NeonPhysics(RAPIER, world);
  scene.resize(width, height);
  scene.setReduced(reduced);
  scenes.push(scene);
  return scene;
}
function run(scene: NeonPhysics, seconds: number) {
  for (let i = 0; i < seconds / FIXED_STEP; i++) {
    scene.beforeStep();
    scene.world.step();
    scene.sync();
  }
}
function inside(scene: NeonPhysics) {
  for (const toy of Object.values(scene.toys)) {
    const ext = scene.extents(toy);
    expect(toy.x - ext.left).toBeGreaterThanOrEqual(-0.1);
    expect(toy.x + ext.right).toBeLessThanOrEqual(scene.width + 0.1);
    if (toy.entered) expect(toy.y - ext.top).toBeGreaterThanOrEqual(-0.1);
    expect(toy.y + ext.bottom).toBeLessThanOrEqual(scene.height + 0.1);
  }
}

describe("shared neon physics", () => {
  it("drops once, contacts the title, reports rest once, and keeps all bodies inside", () => {
    const scene = setup(),
      stable = vi.fn();
    scene.onStable = stable;
    scene.spawn("magnifier");
    scene.spawn("magnifier");
    run(scene, 0.18);
    scene.spawn("robot");
    let maxOffset = 0;
    for (let i = 0; i < 14 / FIXED_STEP; i++) {
      run(scene, FIXED_STEP);
      maxOffset = Math.max(
        maxOffset,
        Math.hypot(scene.titleOffset.x, scene.titleOffset.y),
      );
      inside(scene);
    }
    expect(Object.keys(scene.toys)).toHaveLength(2);
    expect(scene.contacts.title).toBeGreaterThan(0);
    expect(maxOffset).toBeGreaterThan(0.1);
    expect(stable).toHaveBeenCalledOnce();
    expect(scene.toys.robot!.sleeping).toBe(true);
  });
  it("collides toy against toy and returns an unladen title to its anchor", () => {
    const scene = setup();
    scene.spawn("robot");
    scene.spawn("magnifier");
    const robot = scene.toys.robot!,
      lens = scene.toys.magnifier!;
    robot.body.setTranslation({ x: 0, y: -200, z: 0 }, true);
    lens.body.setTranslation({ x: -200, y: -180, z: 0 }, true);
    lens.body.setLinvel({ x: 1500, y: 0, z: 0 }, true);
    run(scene, 0.3);
    expect(scene.contacts.toys).toBeGreaterThan(0);
    scene.title.applyImpulse({ x: 1000, y: 0, z: 0 }, true);
    run(scene, 0.08);
    expect(Math.abs(scene.titleOffset.x)).toBeGreaterThan(1);
    run(scene, 3);
    expect(Math.abs(scene.titleOffset.x)).toBeLessThan(0.2);
    expect(Math.abs(scene.titleOffset.angle)).toBeLessThan(0.005);
  });
  it("uses outline segments, leaving word gaps and letter interiors open", () => {
    const scene = setup();
    const empty = new RAPIER.Ray(
      { x: 0, y: scene.layout.anchor.y, z: 50 },
      { x: 0, y: 0, z: -1 },
    );
    // Search for both actual contour hits and empty samples through the word's projected area.
    let hits = 0,
      misses = 0;
    for (let x = -scene.layout.width / 2; x < scene.layout.width / 2; x += 4) {
      empty.origin.x = x;
      const hit = scene.world.castRay(empty, 100, true);
      if (hit?.collider.parent()?.handle === scene.title.handle) hits++;
      else misses++;
    }
    // Update Rapier's scene query acceleration structure before casting.
    run(scene, FIXED_STEP);
    for (let x = -scene.layout.width / 2; x < scene.layout.width / 2; x += 4) {
      empty.origin.x = x;
      const hit = scene.world.castRay(empty, 100, true);
      if (hit?.collider.parent()?.handle === scene.title.handle) hits++;
      else misses++;
    }
    expect(hits).toBeGreaterThan(10);
    expect(misses).toBeGreaterThan(10);
  });
  it.each(["left", "right"] as const)(
    "attaches to the %s hand and releases continuously",
    (hand) => {
      const scene = setup(true);
      scene.spawn("robot");
      scene.spawn("magnifier");
      run(scene, 0.02);
      const palm = scene.hand(hand)!;
      scene.grab("magnifier");
      scene.drag(
        "magnifier",
        palm.x - 26 * scene.scale,
        palm.y - 32 * scene.scale,
      );
      scene.release("magnifier", { x: 0, y: 0 });
      expect(scene.held?.hand).toBe(hand);
      scene.grab("robot");
      scene.drag("robot", scene.width / 2, 320);
      run(scene, 0.02);
      const lens = { x: scene.toys.magnifier!.x, y: scene.toys.magnifier!.y };
      scene.grab("magnifier");
      expect(scene.held).toBeNull();
      expect(scene.toys.magnifier!.x).toBeCloseTo(lens.x, 1);
      expect(scene.toys.magnifier!.y).toBeCloseTo(lens.y, 1);
      scene.release("magnifier", { x: 4000, y: -1000 });
      run(scene, 0.05);
      expect(scene.toys.magnifier!.sleeping).toBe(true);
      inside(scene);
    },
  );
  it("resizes into narrow and short layouts without overflow and disposes its bodies", () => {
    const scene = setup(true);
    scene.spawn("robot");
    scene.spawn("magnifier");
    for (const [width, height] of [
      [320, 640],
      [844, 390],
    ]) {
      scene.resize(width, height);
      run(scene, 0.05);
      inside(scene);
      expect(scene.layout.width).toBeLessThan(width);
    }
    const count = scene.world.bodies.len();
    expect(count).toBe(6);
    scene.dispose();
    expect(scene.world.bodies.len()).toBe(0);
    expect(makeTitleLayout(320, 640).height).toBeLessThan(200);
  });
  it("CCD catches a fast throw at a letter and the viewport wall", () => {
    const scene = setup();
    scene.spawn("magnifier");
    const lens = scene.toys.magnifier!;
    const segment = scene.layout.segments.find(
      (segment) =>
        Math.abs(segment.x) < scene.layout.width / 3 && segment.y > 20,
    )!;
    lens.body.setTranslation(
      { x: segment.x, y: scene.layout.anchor.y + 150, z: 0 },
      true,
    );
    lens.body.setLinvel({ x: 0, y: -4200, z: 0 }, true);
    run(scene, 0.1);
    expect(scene.contacts.title).toBeGreaterThan(0);
    lens.body.setTranslation({ x: scene.width / 2 - 100, y: -100, z: 0 }, true);
    lens.body.setLinvel({ x: 4200, y: 0, z: 0 }, true);
    run(scene, 0.1);
    expect(lens.vx).toBeLessThan(0);
    inside(scene);
  });
});
