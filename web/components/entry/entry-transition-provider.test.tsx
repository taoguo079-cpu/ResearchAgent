import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePreferencesStore } from "@/features/preferences/preferences-store";
import { getMessages } from "@/i18n/messages";
import { mockViewTransitions } from "@/test-shims/view-transition";
import { EntryTransitionLink } from "./entry-transition-link";
import {
  EntryTransitionProvider,
  useEntryNavigation,
} from "./entry-transition-provider";

let reduced = false;
let native: ReturnType<typeof mockViewTransitions>;
const mediaListeners = new Set<() => void>();

function Controls() {
  const { navigate } = useEntryNavigation();
  return (
    <>
      <button onClick={() => void navigate("/workspace", { replace: true })}>
        NEXT
      </button>
      <EntryTransitionLink href="/research/new">
        New research
      </EntryTransitionLink>
      <EntryTransitionLink href="/workspace" direction="backward">
        Back to menu
      </EntryTransitionLink>
    </>
  );
}

function renderNavigation(locale: "en" | "zh-CN" = "en") {
  return render(
    <StrictMode>
      <NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
        <EntryTransitionProvider>
          <Controls />
        </EntryTransitionProvider>
      </NextIntlClientProvider>
    </StrictMode>,
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  window.history.replaceState({}, "", "/");
  reduced = false;
  mediaListeners.clear();
  native = mockViewTransitions();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_event: string, listener: () => void) =>
        mediaListeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) =>
        mediaListeners.delete(listener),
    })),
  );
  usePreferencesStore.setState({
    pet: { ...usePreferencesStore.getState().pet, motion: "system" },
  });
});

afterEach(() => {
  native.restore();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("entry overlapping transition", () => {
  it("captures the old page before replace, deduplicates input, and unlocks after animation", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    fireEvent.click(screen.getByText("NEXT"));
    expect(native.start).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("entry-transition")).toHaveAttribute(
      "data-phase",
      "waiting",
    );
    expect(screen.getByText("NEXT").closest("[inert]")).not.toBeNull();
    await advance(15);
    expect(replace).not.toHaveBeenCalled();
    await advance(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/workspace");
    expect(screen.getByTestId("entry-transition")).toHaveAttribute(
      "data-phase",
      "overlapping",
    );
    await advance(900);
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    expect(screen.getByText("NEXT").closest("[inert]")).toBeNull();
    expect(document.documentElement.dataset.entryDirection).toBeUndefined();
  });

  it.each(["/workspace", "/en/workspace", "/zh-CN/workspace"])(
    "recognizes %s and pushes the input route",
    async (source) => {
      window.history.replaceState({}, "", source);
      const push = vi.spyOn(window.history, "pushState");
      renderNavigation(source.includes("zh-CN") ? "zh-CN" : "en");
      fireEvent.click(screen.getByText("New research"));
      fireEvent.click(screen.getByText("New research"));
      expect(document.documentElement.dataset.entryDirection).toBe("forward");
      await advance(16);
      expect(push).toHaveBeenCalledTimes(1);
      await advance(900);
      expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    },
  );

  it("reverses the overlap for the menu return", async () => {
    window.history.replaceState({}, "", "/research/new");
    renderNavigation();
    fireEvent.click(screen.getByText("Back to menu"));
    expect(document.documentElement.dataset.entryDirection).toBe("backward");
    await advance(16);
    expect(screen.getByTestId("entry-transition")).toHaveAttribute(
      "data-direction",
      "backward",
    );
    await advance(900);
    expect(window.location.pathname).toBe("/workspace");
  });

  it("keeps the old view while a route is pending and recovers after five seconds", async () => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    await advance(4999);
    expect(screen.getByTestId("entry-transition")).toHaveAttribute(
      "data-phase",
      "waiting",
    );
    await advance(1);
    expect(native.views[0].skipTransition).toHaveBeenCalled();
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    expect(document.documentElement.dataset.entryDirection).toBeUndefined();
    fireEvent.click(screen.getByText("NEXT"));
    expect(native.start).toHaveBeenCalledTimes(2);
  });

  it("releases the page when router dispatch throws", async () => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {
      throw new Error("Router unavailable");
    });
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    await advance(16);
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("NEXT"));
    expect(native.start).toHaveBeenCalledTimes(2);
  });

  it.each(["system", "reduced", "static"] as const)(
    "navigates directly for %s reduced motion",
    (motion) => {
      reduced = motion === "system";
      usePreferencesStore.setState({
        pet: { ...usePreferencesStore.getState().pet, motion },
      });
      renderNavigation();
      fireEvent.click(screen.getByText("NEXT"));
      expect(window.location.pathname).toBe("/workspace");
      expect(native.start).not.toHaveBeenCalled();
      expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    },
  );

  it("falls back to direct navigation when the browser API is unavailable", () => {
    Reflect.deleteProperty(document, "startViewTransition");
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    expect(window.location.pathname).toBe("/workspace");
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
  });

  it("falls back when snapshot creation throws", () => {
    native.start.mockImplementation(() => {
      throw new Error("Snapshot unavailable");
    });
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    expect(window.location.pathname).toBe("/workspace");
    expect(document.documentElement.dataset.entryDirection).toBeUndefined();
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
  });

  it("skips animation immediately if reduced motion changes before capture", async () => {
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    await act(async () => {
      reduced = true;
      mediaListeners.forEach((listener) => listener());
    });
    expect(window.location.pathname).toBe("/workspace");
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    await advance(6000);
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
  });

  it("keeps pending navigation locked when motion changes during route preparation", async () => {
    const replace = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    await advance(16);
    await act(async () => {
      reduced = true;
      mediaListeners.forEach((listener) => listener());
    });
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    await advance(5000);
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it("skips a running overlap on resize and restores usable controls", async () => {
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    await advance(16);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(native.views[0].skipTransition).toHaveBeenCalled();
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    expect(screen.getByText("NEXT").closest("[inert]")).toBeNull();
  });

  it("deduplicates reduced-motion navigation while a route is pending", async () => {
    reduced = true;
    const replace = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(1);
    await advance(5000);
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it("preserves modified clicks and direct native history navigation", () => {
    window.history.replaceState({}, "", "/workspace");
    renderNavigation();
    fireEvent.click(screen.getByText("New research"), { ctrlKey: true });
    expect(native.start).not.toHaveBeenCalled();
    act(() => {
      window.history.pushState({}, "", "/research/new");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(native.start).not.toHaveBeenCalled();
  });

  it("cancels before capture when browser history supersedes the entry navigation", async () => {
    window.history.replaceState({}, "", "/workspace");
    renderNavigation();
    fireEvent.click(screen.getByText("New research"));
    act(() => {
      window.history.pushState({}, "", "/history");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await advance(6000);
    expect(window.location.pathname).toBe("/history");
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
  });

  it("cleans up a pending snapshot on unmount without dispatching", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const view = renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    view.unmount();
    await advance(6000);
    expect(replace).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.entryDirection).toBeUndefined();
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
  });
});
