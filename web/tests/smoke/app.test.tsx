import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => null,
  useSearchParams: () => new URLSearchParams(),
}));

import Home from "@/app/workspace/page";
import { Providers } from "@/app/providers";

describe("home page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    window.history.replaceState({}, "", "/workspace");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
  });

  it("renders the menu and routes each action to its page", () => {
    render(
      <Providers locale="en">
        <Home />
      </Providers>,
    );

    expect(
      screen.getByRole("heading", { name: "Research Agent", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Every discovery begins with a question."),
    ).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("is power")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new research/i })).toHaveAttribute(
      "href",
      "/research/new",
    );
    expect(screen.getByRole("link", { name: "history" })).toHaveAttribute(
      "href",
      "/history",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(document.querySelector("[data-pet-state]")).toBeNull();
  });
});
