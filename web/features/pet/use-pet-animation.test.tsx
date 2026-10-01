import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LEGACY_PET_MANIFEST,
  PET_ANIMATION_STATES,
  PET_CELL,
  PET_MANIFEST_SRC,
  type PetAnimationSpec,
  type PetAnimationState,
  type PetManifest,
} from "@/features/pet/pet-manifest";
import {
  usePetAnimation,
  usePetAsset,
  usePetManifest,
} from "@/features/pet/use-pet-animation";
import type { PetMotion } from "@/features/preferences/preferences-store";

const spec: PetAnimationSpec = {
  src: "/pets/fintech-robot/atlases/search.webp",
  posterSrc: "/pets/fintech-robot/posters/search.webp",
  columns: 12,
  rows: 1,
  frameCount: 3,
  frameDurationsMs: [100, 250, 150],
  loop: true,
  posterFrame: 1,
};

describe("usePetAnimation", () => {
  let requests: Map<number, FrameRequestCallback>;
  let nextRequest: number;
  let reduced: boolean;
  let visibility: DocumentVisibilityState;
  let motionListeners: Set<() => void>;

  beforeEach(() => {
    requests = new Map();
    nextRequest = 1;
    reduced = false;
    visibility = "visible";
    motionListeners = new Set();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextRequest++;
      requests.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => requests.delete(id));
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibility,
    );
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_event: string, listener: () => void) =>
        motionListeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) =>
        motionListeners.delete(listener),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function tick(time: number) {
    await act(async () => {
      const pending = [...requests.values()];
      requests.clear();
      pending.forEach((callback) => callback(time));
    });
  }

  it("preserves variable frame durations including the final frame before looping", async () => {
    const { result } = renderHook(() =>
      usePetAnimation({ state: "search", motion: "full", spec }),
    );
    await tick(0);
    await tick(99);
    expect(result.current).toBe(0);
    await tick(100);
    expect(result.current).toBe(1);
    await tick(349);
    expect(result.current).toBe(1);
    await tick(350);
    expect(result.current).toBe(2);
    await tick(499);
    expect(result.current).toBe(2);
    await tick(500);
    expect(result.current).toBe(0);
  });

  it("slows every frame to twice its duration in reduced mode", async () => {
    const { result } = renderHook(() =>
      usePetAnimation({ state: "search", motion: "reduced", spec }),
    );
    await tick(0);
    await tick(199);
    expect(result.current).toBe(0);
    await tick(200);
    expect(result.current).toBe(1);
    await tick(699);
    expect(result.current).toBe(1);
    await tick(700);
    expect(result.current).toBe(2);
  });

  it("finishes exactly two full celebration rounds and calls completion once in Strict Mode", async () => {
    const onComplete = vi.fn();
    const completedSpec = { ...spec, loop: false, repeat: 2 };
    const { result } = renderHook(
      () =>
        usePetAnimation({
          state: "completed",
          motion: "full",
          spec: completedSpec,
          onComplete,
        }),
      { wrapper: StrictMode },
    );
    await tick(0);
    await tick(500);
    expect(result.current).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();
    await tick(999);
    expect(result.current).toBe(2);
    expect(onComplete).not.toHaveBeenCalled();
    await tick(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    await tick(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(requests.size).toBe(0);
  });

  it("holds the midpoint in static mode while terminal duration still completes", async () => {
    const onComplete = vi.fn();
    const completedSpec = { ...spec, loop: false, repeat: 2 };
    const { result } = renderHook(() =>
      usePetAnimation({
        state: "completed",
        motion: "static",
        spec: completedSpec,
        onComplete,
      }),
    );
    expect(result.current).toBe(spec.posterFrame);
    await tick(0);
    await tick(999);
    expect(result.current).toBe(spec.posterFrame);
    expect(onComplete).not.toHaveBeenCalled();
    await tick(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("reacts to system reduced motion changes with a static midpoint", async () => {
    const { result } = renderHook(() =>
      usePetAnimation({ state: "search", motion: "full", spec }),
    );
    await tick(0);
    await tick(350);
    expect(result.current).toBe(2);
    await act(async () => {
      reduced = true;
      motionListeners.forEach((listener) => listener());
    });
    expect(result.current).toBe(spec.posterFrame);
    expect(requests.size).toBe(0);
    await act(async () => {
      reduced = false;
      motionListeners.forEach((listener) => listener());
    });
    expect(result.current).toBe(0);
  });

  it("pauses playback and completion clocks while the tab is hidden", async () => {
    const onComplete = vi.fn();
    const completedSpec = { ...spec, loop: false, repeat: 2 };
    const { result } = renderHook(() =>
      usePetAnimation({
        state: "completed",
        motion: "full",
        spec: completedSpec,
        onComplete,
      }),
    );
    await tick(0);
    await tick(100);
    expect(result.current).toBe(1);
    await act(async () => {
      visibility = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(requests.size).toBe(0);
    await tick(10000);
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => {
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await tick(10000);
    await tick(10249);
    expect(result.current).toBe(1);
    await tick(10250);
    expect(result.current).toBe(2);
    await tick(10900);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("resets immediately on rapid state switches and waits for asset readiness", async () => {
    const { result, rerender } = renderHook(
      ({ state, enabled }: { state: PetAnimationState; enabled: boolean }) =>
        usePetAnimation({ state, motion: "full", spec, enabled }),
      { initialProps: { state: "search" as PetAnimationState, enabled: true } },
    );
    await tick(0);
    await tick(350);
    expect(result.current).toBe(2);
    rerender({ state: "dragging", enabled: true });
    expect(result.current).toBe(0);
    rerender({ state: "analyze", enabled: false });
    expect(result.current).toBe(spec.posterFrame);
    await tick(5000);
    expect(result.current).toBe(spec.posterFrame);
    expect(requests.size).toBe(0);
    rerender({ state: "analyze", enabled: true });
    expect(result.current).toBe(0);
    await tick(5000);
    await tick(5100);
    expect(result.current).toBe(1);
  });

  it("cancels an unfinished celebration when the state changes", async () => {
    const onComplete = vi.fn();
    const completedSpec = { ...spec, loop: false, repeat: 2 };
    const { rerender } = renderHook(
      ({ state, motion }: { state: PetAnimationState; motion: PetMotion }) =>
        usePetAnimation({
          state,
          motion,
          spec: state === "completed" ? completedSpec : spec,
          onComplete,
        }),
      {
        initialProps: {
          state: "completed" as PetAnimationState,
          motion: "full" as PetMotion,
        },
      },
    );
    await tick(0);
    await tick(600);
    rerender({ state: "failed", motion: "full" });
    await tick(600);
    await tick(5000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("waits during loading then completes an errored celebration using a static fallback", async () => {
    const onComplete = vi.fn();
    const completedSpec = { ...spec, loop: false, repeat: 2 };
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePetAnimation({
          state: "completed",
          motion: "static",
          spec: completedSpec,
          enabled,
          onComplete,
        }),
      { initialProps: { enabled: false } },
    );
    await tick(5000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(requests.size).toBe(0);
    rerender({ enabled: true });
    await tick(5000);
    await tick(5999);
    expect(result.current).toBe(completedSpec.posterFrame);
    expect(onComplete).not.toHaveBeenCalled();
    await tick(6000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("preserves reduced timing for two rounds while an asset error forces a static fallback", async () => {
    const onComplete = vi.fn();
    const completedSpec = { ...spec, loop: false, repeat: 2 };
    const { result } = renderHook(() =>
      usePetAnimation({
        state: "completed",
        motion: "reduced",
        spec: completedSpec,
        forceStatic: true,
        onComplete,
      }),
    );
    await tick(0);
    await tick(1000);
    expect(result.current).toBe(completedSpec.posterFrame);
    expect(onComplete).not.toHaveBeenCalled();
    await tick(1999);
    expect(result.current).toBe(completedSpec.posterFrame);
    expect(onComplete).not.toHaveBeenCalled();
    await tick(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(requests.size).toBe(0);
  });
});

describe("pet asset loading", () => {
  type ImageStub = {
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  };
  let images: ImageStub[];

  beforeEach(() => {
    images = [];
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          images.push(this);
        }
      },
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("loads the current atlas and ignores late results from the previous action", async () => {
    const read = { ...spec, src: "/pets/fintech-robot/atlases/read.webp" };
    const { result, rerender } = renderHook(
      ({ current }: { current: PetAnimationSpec }) => usePetAsset(current),
      { initialProps: { current: spec } },
    );
    expect(images[0].src).toBe(spec.src);
    expect(result.current).toBe("loading");
    const oldLoad = images[0].onload;
    rerender({ current: read });
    expect(result.current).toBe("loading");
    await act(async () => oldLoad?.());
    expect(result.current).toBe("loading");
    await act(async () => images[1].onload?.());
    expect(result.current).toBe("ready");
  });

  it("reports a failed atlas so the renderer uses the new idle poster", async () => {
    const { result } = renderHook(() => usePetAsset(spec));
    await act(async () => images[0].onerror?.());
    expect(result.current).toBe("error");
  });
});

describe("pet manifest loading", () => {
  afterEach(() => vi.unstubAllGlobals());

  function manifest(): PetManifest {
    return {
      schemaVersion: 2,
      id: "fintech-robot",
      displayName: "Fintech Robot",
      cell: { ...PET_CELL },
      previewSrc: "/pets/fintech-robot/preview.webp",
      states: Object.fromEntries(
        PET_ANIMATION_STATES.map((state) => [
          state,
          {
            ...spec,
            src: `/pets/fintech-robot/atlases/${state}.webp`,
            posterSrc: `/pets/fintech-robot/posters/${state}.webp`,
            loop: state !== "completed",
            ...(state === "completed" ? { repeat: 2 } : {}),
          },
        ]),
      ) as PetManifest["states"],
    };
  }

  it("switches only after a valid complete manifest has arrived", async () => {
    const value = manifest();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => value,
    });
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => usePetManifest());
    expect(result.current).toBeNull();
    await act(async () => {});
    expect(result.current?.id).toBe("fintech-robot");
    expect(fetcher).toHaveBeenCalledWith(PET_MANIFEST_SRC, {
      signal: expect.any(AbortSignal),
    });
  });

  it.each(["missing", "invalid", "network"])(
    "retains the existing character if the genuine source gate is %s",
    async (scenario) => {
      const fetcher =
        scenario === "network"
          ? vi.fn().mockRejectedValue(new Error("offline"))
          : vi.fn().mockResolvedValue({
              ok: scenario !== "missing",
              json: async () => ({ schemaVersion: 2, states: {} }),
            });
      vi.stubGlobal("fetch", fetcher);
      const { result } = renderHook(() => usePetManifest());
      await act(async () => {});
      expect(result.current).toBe(LEGACY_PET_MANIFEST);
    },
  );
});
