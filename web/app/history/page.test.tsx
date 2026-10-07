import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HistoryPage from "@/app/history/page";
import { Providers } from "@/app/providers";

describe("history page Swiss navigation", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows history, local edition metadata and navigation without a theme toggle or illustration", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => undefined),
    );

    render(
      <Providers locale="en">
        <HistoryPage />
      </Providers>,
    );

    expect(
      screen.queryByRole("button", { name: "Switch to dark theme" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Research history" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/LOCAL/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
