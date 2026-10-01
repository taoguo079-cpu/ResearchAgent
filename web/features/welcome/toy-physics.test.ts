import { describe, expect, it } from "vitest";
import { releaseVelocity } from "./toy-physics";
describe("throw sampling", () => {
  it("ignores old movement and pauses while capping extreme throws", () => {
    expect(
      releaseVelocity(
        [
          { x: 0, y: 0, time: 0 },
          { x: 80, y: 0, time: 80 },
        ],
        80,
      ),
    ).toEqual({ x: 1000, y: 0 });
    expect(
      releaseVelocity(
        [
          { x: 0, y: 0, time: 0 },
          { x: 80, y: 0, time: 20 },
        ],
        100,
      ),
    ).toEqual({ x: 0, y: 0 });
    expect(
      releaseVelocity(
        [
          { x: 0, y: 0, time: 0 },
          { x: 10, y: 0, time: 4 },
        ],
        4,
      ),
    ).toEqual({ x: 0, y: 0 });
    const fast = releaseVelocity(
      [
        { x: 0, y: 0, time: 0 },
        { x: 1000, y: 1000, time: 10 },
      ],
      10,
    );
    expect(Math.hypot(fast.x, fast.y)).toBeCloseTo(4200);
  });
});
