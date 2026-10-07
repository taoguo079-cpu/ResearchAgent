import { expect, test } from "@playwright/test";
import type { CreateTaskRequest } from "../lib/api/client";

import { mockEntryBackend } from "./three-page-helpers";

test("native textarea accepts new lines and rejects whitespace and questions over 2000 characters", async ({
  page,
}) => {
  await mockEntryBackend(page);
  const requests: CreateTaskRequest[] = [];
  await page.route("**/api/v1/research/tasks", (route) => {
    requests.push(route.request().postDataJSON() as CreateTaskRequest);
    return route.fulfill({
      status: 500,
      json: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Fixture",
          retryable: true,
          request_id: "input-validation",
        },
      },
    });
  });
  await page.goto("/en/research/new");
  const input = page.getByLabel("Research question");
  const send = page.getByRole("button", { name: /send to agent/i });
  await expect(input).toHaveAttribute("rows", "4");
  await expect(input).toHaveAttribute(
    "placeholder",
    "Type your research question here...",
  );
  const retiredPlaceholder = page.locator(
    '[data-design-text="question-placeholder"]',
  );
  await expect(retiredPlaceholder).toHaveCount(0);
  expect(
    await input.evaluate(
      (element) => getComputedStyle(element, "::placeholder").opacity,
    ),
  ).toBe("1");
  await input.fill("A question");
  await expect(retiredPlaceholder).toHaveCount(0);
  await input.fill("");
  await expect(retiredPlaceholder).toHaveCount(0);
  await input.fill("   ");
  await send.click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Enter a research question", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);

  await input.fill("x".repeat(2001));
  await send.click();
  await expect(
    page.getByText("Research questions must be 2,000 characters or fewer"),
  ).toBeVisible();
  expect(requests).toHaveLength(0);

  await input.fill("First line");
  await input.press("End");
  await input.press("Enter");
  await input.pressSequentially("Second line");
  await expect(input).toHaveValue("First line\nSecond line");
  expect(requests).toHaveLength(0);
  await input.fill("x".repeat(2000));
  await send.click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].query).toHaveLength(2000);
});

test("in-flight shortcuts cannot duplicate submission and a retry keeps text and request identity", async ({
  page,
}) => {
  await mockEntryBackend(page);
  const requests: CreateTaskRequest[] = [];
  let releaseFirstRequest: () => void = () => undefined;
  const firstRequestHeld = new Promise<void>((resolve) => {
    releaseFirstRequest = resolve;
  });
  await page.route("**/api/v1/research/tasks", async (route) => {
    requests.push(route.request().postDataJSON() as CreateTaskRequest);
    if (requests.length === 1) await firstRequestHeld;
    await route.fulfill({
      status: 500,
      json: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Fixture retry",
          retryable: true,
          request_id: "input-retry",
        },
      },
    });
  });
  await page.goto("/en/research/new");
  const input = page.getByLabel("Research question");
  await input.fill("  Preserve this research question  ");
  await input.press("Control+Enter");
  await expect.poll(() => requests.length).toBe(1);
  await expect(page.getByRole("button", { name: /Starting/ })).toBeDisabled();
  await input.press("Control+Enter");
  await input.press("Meta+Enter");
  expect(requests).toHaveLength(1);
  releaseFirstRequest();
  await expect(
    page.getByText(
      "We could not create the task. Your question is still here; please try again.",
    ),
  ).toBeVisible();
  await expect(input).toHaveValue("  Preserve this research question  ");
  await page.getByRole("button", { name: /send to agent/i }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].client_request_id).toBe(requests[0].client_request_id);
  expect(requests[1].query).toBe("Preserve this research question");
  expect(requests[1].options?.output_language).toBe("en");
});

test("creation conflict keeps the question and offers the existing task in the chosen locale", async ({
  page,
}) => {
  await mockEntryBackend(page);
  await page.route("**/api/v1/research/tasks", (route) =>
    route.fulfill({
      status: 409,
      json: {
        error: {
          code: "ACTIVE_TASK_EXISTS",
          message: "Already running",
          retryable: false,
          request_id: "input-conflict",
          details: { task_id: "existing-task" },
        },
      },
    }),
  );
  await page.goto("/en/research/new");
  const input = page.getByLabel("Research question");
  await input.fill("My next question");
  await page.getByRole("button", { name: /send to agent/i }).click();
  await expect(
    page.getByText("An active research task is already running.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(input).toHaveValue("My next question");
  await expect(
    page.getByRole("link", { name: "Return to active task" }),
  ).toHaveAttribute("href", "/en/research/existing-task");
});
