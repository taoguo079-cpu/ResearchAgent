import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";

const { replace, physics } = vi.hoisted(() => ({
  replace: vi.fn(),
  physics: {
    options: null as unknown as {
      onEvent: (event: "toys-stable") => void;
      onDrag: () => void;
      onTap: (type: string, time: number) => void;
    },
    still: true,
  },
}));
vi.mock("@/features/welcome/use-welcome-toys", async () => {
  const React = await import("react");
  return {
    useWelcomeToys: (options: typeof physics.options) => {
      physics.options = options;
      return {
        page: React.useRef(null),
        robot: React.useRef(null),
        magnifier: React.useRef(null),
        guidance: React.useRef(null),
        handlers: () => ({}),
        canActivate: () => physics.still,
        connect: () => {},
      };
    },
  };
});
vi.mock("next/dynamic", async () => {
  const React = await import("react");
  return {
    default: () =>
      function MockScene({ onReady }: { onReady: () => void }) {
        React.useEffect(onReady, [onReady]);
        return <div data-testid="welcome-scene" />;
      },
  };
});
vi.mock("@/i18n/navigation", async (original) => ({
  ...(await original<typeof import("@/i18n/navigation")>()),
  useRouter: () => ({ replace }),
}));
import { Providers } from "@/app/providers";
import { WelcomePage } from "./welcome-page";
import { WELCOME_SESSION_KEY } from "@/features/welcome/welcome-state";

function renderWelcome() {
  return render(
    <StrictMode>
      <Providers enforceDeepSeekSetup>
        <WelcomePage />
      </Providers>
    </StrictMode>,
  );
}
async function greet() {
  fireEvent.click(await screen.findByRole("button", { name: /点击屏幕/ }));
  const robot = await screen.findByRole("button", { name: /科研伙伴；双击/ });
  act(() => physics.options.onEvent("toys-stable"));
  return robot;
}
describe("neon welcome page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    sessionStorage.clear();
    replace.mockReset();
    physics.still = true;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it("shows the title immediately and loads a scene without backend requests or the old story", async () => {
    renderWelcome();
    expect(
      screen.getByRole("heading", { name: "Research Agent" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("welcome-atmosphere")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await screen.findByTestId("welcome-scene");
    await waitFor(() =>
      expect(screen.getByRole("main")).toHaveAttribute(
        "data-intro-phase",
        "ready",
      ),
    );
    expect(screen.queryByTestId("welcome-story")).not.toBeInTheDocument();
    expect(screen.queryByTestId("welcome-magnifier")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("one click drops a magnifier then a robot; extra clicks do not duplicate them", async () => {
    renderWelcome();
    const trigger = await screen.findByRole("button", { name: /点击屏幕/ });
    for (let i = 0; i < 5; i++) fireEvent.click(trigger);
    expect(screen.getAllByTestId("welcome-magnifier")).toHaveLength(1);
    expect(screen.queryByTestId("welcome-robot")).not.toBeInTheDocument();
    await screen.findByTestId("welcome-robot");
    expect(screen.getAllByTestId("welcome-robot")).toHaveLength(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => physics.options.onEvent("toys-stable"));
    expect(screen.getByRole("status")).toHaveTextContent("Hi");
  });
  it("requires robot activation, remembers completion and navigates exactly once", async () => {
    renderWelcome();
    const robot = await greet();
    fireEvent.click(robot, { detail: 1 });
    expect(
      screen.queryByRole("button", { name: "你想研究什么问题吗" }),
    ).not.toBeInTheDocument();
    fireEvent.doubleClick(robot);
    const button = screen.getByRole("button", { name: "你想研究什么问题吗" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(sessionStorage.getItem(WELCOME_SESSION_KEY)).toBe("complete");
    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace"),
    );
  });
  it("skips before loading a completed introduction under Strict Mode", async () => {
    sessionStorage.setItem(WELCOME_SESSION_KEY, "complete");
    renderWelcome();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace"),
    );
    expect(screen.queryByTestId("welcome-scene")).not.toBeInTheDocument();
  });
  it("provides an immediate skip even when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    renderWelcome();
    fireEvent.click(screen.getByRole("button", { name: /跳过开场/ }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace"),
    );
  });
  it("hides guidance during dragging and restores it only after the robot stops", async () => {
    renderWelcome();
    const robot = await greet();
    fireEvent.doubleClick(robot);
    act(() => physics.options.onDrag());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "你想研究什么问题吗" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Research Agent" }),
    ).toBeInTheDocument();
    physics.still = false;
    fireEvent.click(robot, { detail: 1 });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    physics.still = true;
    fireEvent.click(robot, { detail: 1 });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "你想研究什么问题吗" }),
    ).toBeInTheDocument();
  });
  it("supports keyboard and double touch activation", async () => {
    renderWelcome();
    const robot = await greet();
    act(() => {
      physics.options.onTap("touch", 100);
      physics.options.onTap("touch", 300);
    });
    expect(
      screen.getByRole("button", { name: "你想研究什么问题吗" }),
    ).toBeInTheDocument();
    act(() => physics.options.onDrag());
    fireEvent.click(robot, { detail: 0 });
    expect(
      screen.getByRole("button", { name: "你想研究什么问题吗" }),
    ).toHaveFocus();
  });
});
