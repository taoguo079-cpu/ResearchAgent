import { userEvent } from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ResearchComposer,
  type CreateTaskResult,
} from "@/components/research/research-composer";
import { Providers } from "@/app/providers";
import {
  usePreferencesStore,
  resetPreferencesStoreForTests,
} from "@/features/preferences/preferences-store";
import type { CreateTaskRequest } from "@/lib/api/client";

function renderComposer(
  createTask: (request: CreateTaskRequest) => Promise<CreateTaskResult> = vi.fn(
    async () => ({
      task: { id: "task-created" },
      links: {},
    }),
  ),
) {
  const onCreated = vi.fn();
  render(
    <Providers locale="en">
      <ResearchComposer createTask={createTask} onCreated={onCreated} />
    </Providers>,
  );
  return { createTask, onCreated };
}

describe("ResearchComposer", () => {
  it("starts with the documented defaults", async () => {
    renderComposer();

    const user = userEvent.setup();
    await user.click(screen.getByText("Examples & research options"));
    await user.click(
      screen.getByRole("button", { name: /research overrides/i }),
    );
    expect(
      screen.getByRole("spinbutton", { name: /maximum papers/i }),
    ).toHaveValue(15);
    expect(
      screen.queryByRole("combobox", { name: /output language/i }),
    ).not.toBeInTheDocument();
    for (const source of ["arXiv", "Semantic Scholar", "PubMed", "Crossref"]) {
      expect(screen.getByRole("checkbox", { name: source })).toBeChecked();
    }
  });

  it("rejects empty queries and queries over 2,000 characters", async () => {
    const user = userEvent.setup();
    const { createTask } = renderComposer();
    const query = screen.getByRole("textbox", { name: /research question/i });

    await user.click(screen.getByRole("button", { name: /send to agent/i }));
    expect(createTask).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a research question/i)).toBeInTheDocument();

    fireEvent.change(query, { target: { value: " \n\t " } });
    await user.click(screen.getByRole("button", { name: /send to agent/i }));
    expect(createTask).not.toHaveBeenCalled();

    await user.clear(query);
    fireEvent.change(query, { target: { value: "a".repeat(2001) } });
    expect(query).toHaveValue("a".repeat(2001));
    await user.click(screen.getByRole("button", { name: /send to agent/i }));

    expect(screen.getByText(/2,000 characters/i)).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("accepts a trimmed research question at the 2,000 character limit", async () => {
    const { createTask } = renderComposer();
    const query = screen.getByRole("textbox", { name: /research question/i });
    expect(query).toHaveAttribute("rows", "4");
    fireEvent.change(query, { target: { value: "a".repeat(2000) } });
    fireEvent.keyDown(query, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
  });

  it("requires at least one source", async () => {
    const user = userEvent.setup();
    const { createTask } = renderComposer();

    await user.click(screen.getByText("Examples & research options"));
    await user.click(
      screen.getByRole("button", { name: /research overrides/i }),
    );
    for (const source of ["arXiv", "Semantic Scholar", "PubMed", "Crossref"]) {
      await user.click(screen.getByRole("checkbox", { name: source }));
    }
    await user.click(screen.getByText("Examples & research options"));
    await user.type(
      screen.getByRole("textbox", { name: /research question/i }),
      "Compare retrieval methods",
    );
    await user.click(screen.getByRole("button", { name: /send to agent/i }));

    expect(screen.getByText(/select at least one source/i)).toBeInTheDocument();
    expect(
      screen.getByText("Examples & research options").closest("details"),
    ).toHaveAttribute("open");
    expect(createTask).not.toHaveBeenCalled();
  });

  it("fills an example without submitting", async () => {
    const user = userEvent.setup();
    const { createTask } = renderComposer();
    const exampleLabel = "Latest advances in Transformer attention";
    const exampleQuery =
      "What advances have been made in Transformer attention since 2023?";

    await user.click(screen.getByText("Examples & research options"));
    await user.click(screen.getByRole("button", { name: exampleLabel }));

    expect(
      screen.getByRole("textbox", { name: /research question/i }),
    ).toHaveValue(exampleQuery);
    expect(createTask).not.toHaveBeenCalled();
  });

  it("uses Ctrl/Cmd+Enter to submit while ordinary Enter remains a newline", async () => {
    const user = userEvent.setup();
    const { createTask } = renderComposer();
    const query = screen.getByRole("textbox", { name: /research question/i });

    await user.type(query, "First line");
    await user.keyboard("{Enter}");
    expect(query).toHaveValue("First line\n");
    await user.type(query, "Second line");
    await user.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
  });

  it("disables duplicate submissions and routes after a 202 response", async () => {
    const user = userEvent.setup();
    let resolve:
      | ((value: {
          task: { id: string };
          links: Record<string, string>;
        }) => void)
      | undefined;
    const createTask = vi.fn(
      () =>
        new Promise<{ task: { id: string }; links: Record<string, string> }>(
          (done) => {
            resolve = done;
          },
        ),
    );
    const { onCreated } = renderComposer(createTask);
    await user.type(
      screen.getByRole("textbox", { name: /research question/i }),
      "A research question",
    );
    const button = screen.getByRole("button", { name: /send to agent/i });

    await user.click(button);
    await user.click(button);
    expect(createTask).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    resolve?.({ task: { id: "task-202" }, links: {} });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("task-202"));
  });

  it("shows an active-task entry point after a 409 response", async () => {
    const user = userEvent.setup();
    const createTask = vi.fn(async () => {
      const error = new Error("active") as Error & {
        status: number;
        details: { task_id: string };
      };
      error.status = 409;
      error.details = { task_id: "active-task" };
      throw error;
    });
    renderComposer(createTask);

    await user.type(
      screen.getByRole("textbox", { name: /research question/i }),
      "Research question",
    );
    await user.click(screen.getByRole("button", { name: /send to agent/i }));

    expect(
      await screen.findByRole("link", { name: /return to active task/i }),
    ).toHaveAttribute("href", "/research/active-task");
  });

  it("ignores submission shortcuts while an IME composition is active", async () => {
    const { createTask } = renderComposer();
    const query = screen.getByRole("textbox", { name: /research question/i });
    fireEvent.change(query, { target: { value: "研究中文输入" } });
    fireEvent.compositionStart(query);
    fireEvent.keyDown(query, { key: "Enter", ctrlKey: true });
    fireEvent.compositionEnd(query);
    fireEvent.keyDown(query, {
      key: "Enter",
      metaKey: true,
      isComposing: true,
    });
    fireEvent.keyDown(query, { key: "Enter", ctrlKey: true, keyCode: 229 });
    await Promise.resolve();
    expect(createTask).not.toHaveBeenCalled();

    fireEvent.keyDown(query, { key: "Enter", metaKey: true });
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
  });

  it("locks concurrent shortcuts even before React paints the pending state", async () => {
    const createTask = vi.fn(() => new Promise<CreateTaskResult>(() => {}));
    renderComposer(createTask);
    const query = screen.getByRole("textbox", { name: /research question/i });
    fireEvent.change(query, { target: { value: "Compare research agents" } });

    fireEvent.keyDown(query, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(query, { key: "Enter", metaKey: true });
    fireEvent.submit(query.closest("form")!);

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: /starting/i })).toBeDisabled();
  });

  it("preserves input and the request ID after a failed request and allows retry", async () => {
    const user = userEvent.setup();
    const createTask = vi
      .fn<(request: CreateTaskRequest) => Promise<CreateTaskResult>>(
        async () => ({
          task: { id: "task-retried" },
          links: {},
        }),
      )
      .mockRejectedValueOnce(new Error("offline"));
    const { onCreated } = renderComposer(createTask);
    const query = screen.getByRole("textbox", { name: /research question/i });
    await user.type(query, "  Compare retrieval methods  ");
    await user.click(screen.getByRole("button", { name: /send to agent/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not create/i,
    );
    expect(query).toHaveValue("  Compare retrieval methods  ");
    await user.click(screen.getByRole("button", { name: /send to agent/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("task-retried"));
    expect(createTask.mock.calls[0][0].query).toBe("Compare retrieval methods");
    expect(createTask.mock.calls[0][0].client_request_id).toBeTruthy();
    expect(createTask.mock.calls[1][0].client_request_id).toBe(
      createTask.mock.calls[0][0].client_request_id,
    );
  });

  it("uses saved research defaults and the interface locale in the task request", async () => {
    resetPreferencesStoreForTests();
    usePreferencesStore
      .getState()
      .setResearchPreferences({ maxPapers: 8, sources: ["pubmed"] });
    const createTask = vi.fn<
      (request: CreateTaskRequest) => Promise<CreateTaskResult>
    >(async () => ({
      task: { id: "localized" },
      links: {},
    }));
    render(
      <Providers locale="zh-CN">
        <ResearchComposer createTask={createTask} />
      </Providers>,
    );
    const query = screen.getByRole("textbox", { name: "研究问题" });
    fireEvent.change(query, { target: { value: "医学研究" } });
    fireEvent.keyDown(query, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect(createTask.mock.calls[0][0].options).toEqual({
      max_papers: 8,
      sources: ["pubmed"],
      output_language: "zh-CN",
    });
    resetPreferencesStoreForTests();
  });
});
