import { vi } from "vitest";

// Model the browser's old snapshot, asynchronous DOM update, and animation finish.
export function mockViewTransitions() {
  const original = Object.getOwnPropertyDescriptor(
    document,
    "startViewTransition",
  );
  const views: ViewTransition[] = [];
  const start = vi.fn((update: () => Promise<void>) => {
    let readyResolve = () => {};
    let readyReject: (reason: unknown) => void = () => {};
    let finishedResolve = () => {};
    let updateResolve = () => {};
    let skipped = false;
    let updated = false;
    let animationTimer: ReturnType<typeof setTimeout> | undefined;
    const ready = new Promise<void>((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });
    const finished = new Promise<void>((resolve) => {
      finishedResolve = resolve;
    });
    const updateCallbackDone = new Promise<void>((resolve) => {
      updateResolve = resolve;
    });
    const view = {
      ready,
      finished,
      updateCallbackDone,
      types: new Set<string>(),
      skipTransition: vi.fn(() => {
        skipped = true;
        readyReject(new Error("Transition skipped"));
        if (updated) {
          clearTimeout(animationTimer);
          finishedResolve();
        }
      }),
    } as unknown as ViewTransition;
    views.push(view);
    setTimeout(() => {
      void Promise.resolve(update()).then(() => {
        updated = true;
        updateResolve();
        if (skipped) {
          finishedResolve();
        } else {
          readyResolve();
          animationTimer = setTimeout(finishedResolve, 900);
        }
      });
    }, 16);
    return view;
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: start,
  });
  return {
    start,
    views,
    restore: () => {
      if (original)
        Object.defineProperty(document, "startViewTransition", original);
      else Reflect.deleteProperty(document, "startViewTransition");
    },
  };
}
