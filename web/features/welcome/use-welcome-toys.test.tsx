import { act, fireEvent, render } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWelcomeToys } from "./use-welcome-toys";
import type { NeonPhysics } from "./neon-physics";
import type { ToyId } from "./toy-physics";

const onDrag = vi.fn(),
  onEvent = vi.fn(),
  onTap = vi.fn(),
  activate = vi.fn(),
  releaseCapture = vi.fn(),
  disconnect = vi.fn();
let time = 1;
const physics = {
  width: 1280,
  height: 800,
  held: null,
  titleOffset: { x: 0, y: 0 },
  contacts: { title: 0, toys: 0 },
  onUpdate: () => {},
  onStable: () => {},
  toys: {} as Record<
    ToyId,
    {
      x: number;
      y: number;
      width: number;
      height: number;
      angle: number;
      vx: number;
      vy: number;
      dragging: boolean;
      sleeping: boolean;
    }
  >,
  resize: vi.fn(),
  setReduced: vi.fn(),
  extents: () => ({ top: 104 }),
  spawn(id: ToyId) {
    this.toys[id] ??= {
      x: 680,
      y: 696,
      width: id === "robot" ? 192 : 76,
      height: id === "robot" ? 208 : 90,
      angle: 0,
      vx: 0,
      vy: 0,
      dragging: false,
      sleeping: true,
    };
  },
  grab(id: ToyId) {
    this.toys[id].dragging = true;
    this.toys[id].sleeping = false;
  },
  drag(id: ToyId, x: number, y: number) {
    Object.assign(this.toys[id], { x, y });
    this.onUpdate();
  },
  release: vi.fn((id: ToyId) => {
    Object.assign(physics.toys[id], { dragging: false, sleeping: true });
    physics.onUpdate();
  }),
};
function Harness() {
  const {
    page: pageRef,
    robot: robotRef,
    magnifier: magnifierRef,
    connect,
    handlers,
    canActivate,
  } = useWelcomeToys({
    robot: true,
    magnifier: true,
    reduced: true,
    onDrag,
    onEvent,
    onTap,
  });
  useLayoutEffect(() => {
    connect(physics as unknown as NeonPhysics);
    return () => connect(null);
  }, [connect]);
  return (
    <main ref={pageRef}>
      <button ref={magnifierRef} data-testid="lens" {...handlers("magnifier")}>
        <span />
      </button>
      <button
        ref={robotRef}
        data-testid="robot"
        {...handlers("robot")}
        onClick={() => {
          if (canActivate()) activate();
        }}
      >
        <span />
      </button>
    </main>
  );
}
function pointer(node: HTMLElement, kind: string, x: number, y: number) {
  fireEvent(
    node,
    new PointerEvent(kind, {
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      pointerType: "touch",
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );
}
describe("3D toy pointer bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    time = 1;
    physics.toys = {} as typeof physics.toys;
    vi.spyOn(performance, "now").mockImplementation(() => time);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.stubGlobal(
      "PointerEvent",
      class extends MouseEvent {
        pointerId: number;
        isPrimary: boolean;
        pointerType: string;
        constructor(type: string, init: PointerEventInit) {
          super(type, init);
          this.pointerId = init.pointerId ?? 1;
          this.isPrimary = init.isPrimary ?? true;
          this.pointerType = init.pointerType ?? "touch";
        }
      },
    );
    Object.defineProperties(HTMLElement.prototype, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: releaseCapture },
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    for (const key of [
      "setPointerCapture",
      "hasPointerCapture",
      "releasePointerCapture",
    ])
      Reflect.deleteProperty(HTMLElement.prototype, key);
  });
  it("requires a 6px drag threshold and suppresses clicks following cancellation", () => {
    const { getByTestId, unmount } = render(<Harness />),
      robot = getByTestId("robot");
    fireEvent.click(robot);
    expect(activate).toHaveBeenCalledOnce();
    pointer(robot, "pointerdown", 680, 696);
    pointer(robot, "pointermove", 686, 696);
    expect(onDrag).not.toHaveBeenCalled();
    pointer(robot, "pointermove", 700, 600);
    pointer(robot, "pointermove", 710, 580);
    expect(onDrag).toHaveBeenCalledOnce();
    expect(robot).toHaveAttribute("data-motion", "dragging");
    pointer(robot, "pointercancel", 710, 580);
    expect(robot).toHaveAttribute("data-motion", "still");
    expect(releaseCapture).toHaveBeenCalledWith(1);
    fireEvent.click(robot);
    expect(activate).toHaveBeenCalledOnce();
    time = 500;
    fireEvent.click(robot);
    expect(activate).toHaveBeenCalledTimes(2);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it("releases a captured drag when hidden and removes its listeners on unmount", () => {
    const { getByTestId, unmount } = render(<Harness />),
      robot = getByTestId("robot");
    pointer(robot, "pointerdown", 680, 696);
    pointer(robot, "pointermove", 500, 300);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(physics.release).toHaveBeenCalledWith(
      "robot",
      { x: 0, y: 0 },
      false,
    );
    expect(releaseCapture).toHaveBeenCalledWith(1);
    unmount();
    physics.release.mockClear();
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(physics.release).not.toHaveBeenCalled();
  });
});
