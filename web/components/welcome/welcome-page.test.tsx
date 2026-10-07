import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/",
}));
vi.mock("@/components/entry/entry-language-switcher", () => ({
  EntryLanguageSwitcher: () => <button type="button">English</button>,
}));

import { WELCOME_SESSION_KEY } from "@/features/welcome/welcome-state";
import { EntryTransitionProvider } from "@/components/entry/entry-transition-provider";
import { getMessages } from "@/i18n/messages";
import { WelcomePage } from "./welcome-page";

function renderWelcome(locale: "zh-CN" | "en" = "en", animated = false) {
  return render(
    <StrictMode>
      <NextIntlClientProvider
        locale={locale}
        messages={getMessages(locale)}
        timeZone="UTC"
      >
        {animated ? (
          <EntryTransitionProvider>
            <WelcomePage />
          </EntryTransitionProvider>
        ) : (
          <WelcomePage />
        )}
      </NextIntlClientProvider>
    </StrictMode>,
  );
}

describe("brand welcome page", () => {
  beforeEach(() => {
    sessionStorage.clear();
    replace.mockReset();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the typographic brand and entry button immediately without decorative assets", () => {
    renderWelcome();
    expect(
      screen.getByRole("heading", { name: "Research Agent" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.queryByTestId("brand-robot")).not.toBeInTheDocument();
    expect(document.querySelector("[data-design-vector]")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "NEXT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("remembers completion and navigates exactly once when NEXT is clicked", () => {
    renderWelcome();
    const next = screen.getByRole("button", { name: "NEXT" });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(sessionStorage.getItem(WELCOME_SESSION_KEY)).toBe("complete");
    expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace");
  });

  it("remembers NEXT, navigates immediately once and allows retry after a timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderWelcome("en", true);
    const next = screen.getByRole("button", { name: "NEXT" });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(sessionStorage.getItem(WELCOME_SESSION_KEY)).toBe("complete");
    expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
    fireEvent.click(next);
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it("skips a completed welcome without a transition mask", async () => {
    sessionStorage.setItem(WELCOME_SESSION_KEY, "complete");
    renderWelcome("en", true);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace"),
    );
    expect(screen.queryByTestId("entry-transition")).not.toBeInTheDocument();
  });

  it("skips a completed welcome on return under Strict Mode", async () => {
    sessionStorage.setItem(WELCOME_SESSION_KEY, "complete");
    renderWelcome();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace"),
    );
  });

  it("allows entry when reading and writing storage are restricted", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    renderWelcome();
    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace");
  });

  it("supports keyboard entry without interacting with the decoration", async () => {
    const user = userEvent.setup();
    renderWelcome();
    const next = screen.getByRole("button", { name: "NEXT" });
    next.focus();
    await user.keyboard("{Enter}");
    expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace");
  });

  it("uses the Chinese entry labels with the same navigation", () => {
    renderWelcome("zh-CN");
    expect(screen.getByText("你的 AI 科研伙伴")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/workspace");
  });
});
