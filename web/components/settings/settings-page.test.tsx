import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "@/components/settings/settings-page";
import {
  ACADEMIC_SOURCES,
  DEFAULT_APP_PREFERENCES,
  resetPreferencesStoreForTests,
  usePreferencesStore,
} from "@/features/preferences/preferences-store";
import { getMessages } from "@/i18n/messages";

vi.mock("@/components/shell/workspace-page", () => ({
  WorkspacePage: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));

function renderSettings() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={getMessages("en")}>
        <SettingsPage />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    resetPreferencesStoreForTests();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          provider: "deepseek",
          default_model: "deepseek-v4-flash",
          api_key_required: true,
          api_key_configured: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetPreferencesStoreForTests();
  });

  it("saves research preferences independently of credentials and legacy companion preferences", async () => {
    usePreferencesStore.getState().setPetPreferences({
      visible: true,
      size: "large",
      motion: "static",
      dragLocked: true,
    });
    const legacyPet = usePreferencesStore.getState().pet;
    renderSettings();
    await screen.findByText("Configured");
    const user = userEvent.setup();
    const keyInput = screen.getByLabelText("Replace API key");
    await user.type(keyInput, "sk-unsaved-replacement");
    await user.clear(screen.getByLabelText("Maximum papers"));
    await user.type(screen.getByLabelText("Maximum papers"), "7");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Settings saved",
    );
    expect(usePreferencesStore.getState().research.maxPapers).toBe(7);
    expect(usePreferencesStore.getState().pet).toEqual(legacyPet);
    expect(screen.queryByLabelText("Show companion")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Size")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Motion")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(keyInput).toHaveValue("sk-unsaved-replacement");
    expect(
      vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);

    await user.clear(screen.getByLabelText("Maximum papers"));
    expect(screen.queryByText("Settings saved")).not.toBeInTheDocument();
  });

  it("keeps saved preferences when every source is deselected", async () => {
    renderSettings();
    await screen.findByText("Configured");
    const user = userEvent.setup();
    for (const label of ["arXiv", "Semantic Scholar", "PubMed", "Crossref"]) {
      await user.click(screen.getByLabelText(label));
    }
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(
      await screen.findByText("Select at least one source."),
    ).toBeInTheDocument();
    expect(usePreferencesStore.getState().research.sources).toEqual(
      ACADEMIC_SOURCES,
    );
    expect(screen.queryByText("Settings saved")).not.toBeInTheDocument();
    expect(screen.getByLabelText("arXiv")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("restores research defaults while preserving legacy companion values and unsaved credentials", async () => {
    usePreferencesStore
      .getState()
      .setResearchPreferences({ maxPapers: 3, sources: ["arxiv"] });
    usePreferencesStore.getState().setPetPreferences({
      visible: false,
      size: "large",
      motion: "static",
      dragLocked: true,
    });
    usePreferencesStore.getState().setPetPosition({ xRatio: 0.2, yRatio: 0.3 });
    const legacyPet = usePreferencesStore.getState().pet;
    renderSettings();
    await screen.findByText("Configured");
    const user = userEvent.setup();
    const keyInput = screen.getByLabelText("Replace API key");
    await user.type(keyInput, "sk-unsaved-credential");
    await user.click(screen.getByRole("button", { name: "Restore defaults" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Maximum papers")).toHaveValue(15);
    });
    expect(usePreferencesStore.getState().research).toEqual(
      DEFAULT_APP_PREFERENCES.research,
    );
    expect(usePreferencesStore.getState().pet).toEqual(legacyPet);
    expect(keyInput).toHaveValue("sk-unsaved-credential");
    expect(screen.getByRole("status")).toHaveTextContent("Settings saved");
  });

  it.each(["2", "16"])(
    "rejects a maximum paper count of %s without overwriting research defaults",
    async (count) => {
      renderSettings();
      await screen.findByText("Configured");
      const user = userEvent.setup();
      const paperInput = screen.getByLabelText("Maximum papers");
      await user.clear(paperInput);
      await user.type(paperInput, count);
      // Bypass the browser's native constraint check to exercise schema validation.
      fireEvent.submit(screen.getByRole("form", { name: "Research defaults" }));
      expect(
        await screen.findByText("Enter a whole number from 3 to 15."),
      ).toBeInTheDocument();
      expect(usePreferencesStore.getState().research).toEqual(
        DEFAULT_APP_PREFERENCES.research,
      );
      expect(screen.queryByText("Settings saved")).not.toBeInTheDocument();
    },
  );
});
