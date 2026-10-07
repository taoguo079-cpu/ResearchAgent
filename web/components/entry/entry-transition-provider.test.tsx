import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMessages } from "@/i18n/messages";
import { mockViewTransitions } from "@/test-shims/view-transition";
import { EntryTransitionLink } from "./entry-transition-link";
import {
  EntryTransitionProvider,
  useEntryNavigation,
} from "./entry-transition-provider";

let native: ReturnType<typeof mockViewTransitions>;

function Controls() {
  const { navigate, busy } = useEntryNavigation();
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
      <output>{busy ? "Pending navigation" : "Ready"}</output>
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
  native = mockViewTransitions();
  vi.stubGlobal("matchMedia", undefined);
});

afterEach(() => {
  native.restore();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("immediate entry navigation", () => {
  it("dispatches replace immediately and deduplicates simultaneous input without an overlay", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/workspace");
    expect(native.start).not.toHaveBeenCalled();
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    expect(screen.getByText("NEXT").closest("[inert]")).toBeNull();
    await advance(0);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it.each(["/workspace", "/en/workspace", "/zh-CN/workspace"])(
    "recognizes %s and immediately pushes the question route",
    async (source) => {
      window.history.replaceState({}, "", source);
      const push = vi.spyOn(window.history, "pushState");
      renderNavigation(source.includes("zh-CN") ? "zh-CN" : "en");
      fireEvent.click(screen.getByText("New research"));
      fireEvent.click(screen.getByText("New research"));
      expect(push).toHaveBeenCalledTimes(1);
      expect(window.location.pathname).toBe("/research/new");
      expect(native.start).not.toHaveBeenCalled();
      await advance(0);
      expect(screen.getByText("Ready")).toBeInTheDocument();
    },
  );

  it("returns to the menu immediately", async () => {
    window.history.replaceState({}, "", "/research/new");
    renderNavigation();
    fireEvent.click(screen.getByText("Back to menu"));
    expect(window.location.pathname).toBe("/workspace");
    expect(native.start).not.toHaveBeenCalled();
    await advance(0);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("keeps a pending route locked and permits retry after five seconds", async () => {
    const replace = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Pending navigation")).toBeInTheDocument();
    await advance(4999);
    expect(screen.getByText("Pending navigation")).toBeInTheDocument();
    await advance(1);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it("releases the page when router dispatch throws", async () => {
    const replace = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {
        throw new Error("Router unavailable");
      });
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    await advance(0);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it("preserves modified link clicks", () => {
    window.history.replaceState({}, "", "/workspace");
    const push = vi.spyOn(window.history, "pushState");
    renderNavigation();
    fireEvent.click(screen.getByText("New research"), { ctrlKey: true });
    expect(push).not.toHaveBeenCalled();
    expect(native.start).not.toHaveBeenCalled();
  });

  it("releases pending navigation when browser history supersedes it", async () => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    act(() => {
      window.history.pushState({}, "", "/history");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await advance(0);
    expect(window.location.pathname).toBe("/history");
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("clears pending navigation timers on unmount", async () => {
    const replace = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
    const view = renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    view.unmount();
    await advance(6000);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels an old pending navigation when the interface locale changes", async () => {
    const replace = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
    const view = renderNavigation();
    fireEvent.click(screen.getByText("NEXT"));
    view.rerender(
      <StrictMode>
        <NextIntlClientProvider locale="zh-CN" messages={getMessages("zh-CN")}>
          <EntryTransitionProvider>
            <Controls />
          </EntryTransitionProvider>
        </NextIntlClientProvider>
      </StrictMode>,
    );
    await advance(0);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    fireEvent.click(screen.getByText("NEXT"));
    expect(replace).toHaveBeenCalledTimes(2);
  });
});
