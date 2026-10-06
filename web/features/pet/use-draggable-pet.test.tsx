import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createPetPhysics } from "@/features/pet/pet-physics";

import {
  pixelsToRatios,
  ratiosToPixels,
  useDraggablePet,
} from "@/features/pet/use-draggable-pet";
import {
  resetPreferencesStoreForTests,
  usePreferencesStore,
} from "@/features/preferences/preferences-store";

function Harness({ onOpen }: { onOpen: () => void }) {
  const draggable = useDraggablePet({
    size: "medium",
    locked: false,
    onClick: onOpen,
  });
  return (
    <button
      type="button"
      data-ready={draggable.position ? "true" : "false"}
      data-physics={draggable.physicsReady ? "true" : "false"}
      data-moving={draggable.moving ? "true" : "false"}
      data-dragging={draggable.dragging ? "true" : "false"}
      data-x={draggable.position?.x}
      data-y={draggable.position?.y}
      {...draggable.pointerHandlers}
    >
      pet
    </button>
  );
}

describe("useDraggablePet", () => {
  let clock = 0;
  let sequence = 0;
  let frames = new Map<number, FrameRequestCallback>();
  beforeAll(async () => {
    const scene = await createPetPhysics(
      { width: 96, height: 104 },
      { width: 1024, height: 768 },
      { x: 600, y: 500 },
    );
    scene.dispose();
  });
  beforeEach(() => {
    clock = 0;
    sequence = 0;
    frames = new Map();
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++sequence, callback);
      return sequence;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    resetPreferencesStoreForTests();
    Object.defineProperty(HTMLButtonElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLButtonElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function advance(milliseconds: number) {
    act(() => {
      const count = Math.ceil(milliseconds / (1000 / 60));
      for (let i = 0; i < count; i++) {
        clock += 1000 / 60;
        const queued = [...frames.values()];
        frames.clear();
        queued.forEach((callback) => callback(clock));
      }
    });
  }

  it("opens settings for a short click", async () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    const pet = screen.getByRole("button", { name: "pet" });
    await waitFor(() => expect(pet).toHaveAttribute("data-physics", "true"));
    fireEvent.pointerDown(pet, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(pet, { pointerId: 1, clientX: 102, clientY: 102 });
    fireEvent.click(pet, { detail: 1 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("throws with pointer velocity, bounces inside the viewport, and persists after rest without opening settings", async () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    const pet = screen.getByRole("button", { name: "pet" });
    await waitFor(() => expect(pet).toHaveAttribute("data-physics", "true"));
    const originalX = Number(pet.dataset.x);
    fireEvent.pointerDown(pet, {
      pointerId: 2,
      isPrimary: true,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    clock = 20;
    fireEvent.pointerMove(pet, { pointerId: 2, clientX: 40, clientY: 40 });
    advance(16);
    clock += 20;
    fireEvent.pointerMove(pet, { pointerId: 2, clientX: -60, clientY: 0 });
    advance(16);
    expect(pet).toHaveAttribute("data-dragging", "true");
    clock += 10;
    fireEvent.pointerUp(pet, { pointerId: 2, clientX: -90, clientY: -10 });
    fireEvent.click(pet, { detail: 1 });
    expect(onOpen).not.toHaveBeenCalled();
    expect(pet).toHaveAttribute("data-moving", "true");
    const releasedX = Number(pet.dataset.x);
    advance(100);
    expect(Number(pet.dataset.x)).toBeLessThan(releasedX);
    expect(Number(pet.dataset.x)).toBeLessThan(originalX);
    advance(15000);
    expect(pet).toHaveAttribute("data-moving", "false");
    expect(frames.size).toBe(0);
    expect(Number(pet.dataset.x)).toBeGreaterThanOrEqual(0);
    expect(Number(pet.dataset.x) + 96).toBeLessThanOrEqual(window.innerWidth);
    expect(Number(pet.dataset.y)).toBeGreaterThanOrEqual(0);
    expect(Number(pet.dataset.y) + 104).toBeLessThanOrEqual(window.innerHeight);
    expect(usePreferencesStore.getState().pet.position).not.toEqual({
      xRatio: 1,
      yRatio: 1,
    });
    fireEvent.click(pet, { detail: 0 });
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("round-trips and clamps positions after viewport changes", () => {
    const viewport = { width: 800, height: 600 };
    const pixels = ratiosToPixels(
      { xRatio: 0.25, yRatio: 0.75 },
      "large",
      viewport,
    );
    expect(pixelsToRatios(pixels, "large", viewport)).toEqual({
      xRatio: 0.25,
      yRatio: 0.75,
    });
    expect(
      ratiosToPixels({ xRatio: 1, yRatio: 1 }, "large", {
        width: 100,
        height: 100,
      }),
    ).toEqual({ x: 0, y: 0 });
  });
});
