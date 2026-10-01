import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

import type { PetManifest } from "../features/pet/pet-manifest";
import type { AppPreferencesV1 } from "../features/preferences/preferences-store";
import type { ResearchStage, TaskStatus } from "../lib/events/types";

const TASK_ID = "pet-runtime-fixture";
const STAGES: ResearchStage[] = [
  "orchestrate",
  "search",
  "filter",
  "read",
  "analyze",
  "synthesize",
  "critic",
];

type PetTestWindow = Window & {
  petTestStream?: EventTarget;
  petTestSequence: number;
};

const realManifest = JSON.parse(
  readFileSync("public/pets/fintech-robot/manifest.json", "utf8"),
) as PetManifest;

function assetPattern(src: string) {
  return new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

async function failActionAtlas(
  page: Page,
  failedAtlas: keyof PetManifest["states"],
) {
  // Serve the production manifest and authentic sprite sheets. Only inject the
  // requested single-image failure; all other resources use the real server.
  const spec = realManifest.states[failedAtlas];
  await page.route(`**${spec.src}`, (route) => route.fulfill({ status: 404 }));
}

async function expectActionAtlas(page: Page, state: string) {
  const spec = realManifest.states[state as keyof PetManifest["states"]];
  const sprite = page.locator("[data-pet-frame]");
  await expect(sprite).toHaveAttribute("data-pet-asset", "ready");
  await expect(sprite).toHaveAttribute("data-pet-action", state);
  await expect(sprite).toHaveCSS("background-image", assetPattern(spec.src));
  await expect(sprite).toHaveCSS(
    "background-size",
    `${96 * spec.columns}px ${104 * spec.rows}px`,
  );
  await expect(sprite).toHaveAttribute(
    "data-pet-frame",
    String(spec.posterFrame),
  );
}

async function persistPet(
  page: Page,
  overrides: Partial<AppPreferencesV1["pet"]> = {},
) {
  await page.addInitScript(
    (pet) => {
      // Seed once so a reload exercises the position saved by the real drag hook.
      if (localStorage.getItem("research-agent.preferences.v1")) return;
      localStorage.setItem(
        "research-agent.preferences.v1",
        JSON.stringify({
          version: 1,
          state: {
            version: 1,
            research: {
              maxPapers: 15,
              sources: ["arxiv", "semantic_scholar", "pubmed", "crossref"],
            },
            pet,
          },
        }),
      );
    },
    {
      visible: true,
      size: "medium",
      motion: "static",
      dragLocked: false,
      position: { xRatio: 1, yRatio: 1 },
      ...overrides,
    },
  );
}

async function mockPetTask(page: Page, status: TaskStatus = "queued") {
  const snapshot = {
    id: TASK_ID,
    client_request_id: "pet-runtime-client",
    query: "Pet runtime regression fixture",
    title: "Pet runtime regression fixture",
    status,
    effective_locale: "en",
    current_stage: null,
    last_sequence: 0,
    statistics: {},
    stages: [],
    available_actions: status === "queued" ? ["cancel"] : [],
    created_at: "2026-10-01T00:00:00Z",
    started_at: null,
    completed_at: null,
  };
  await page.route("**/api/v1/settings/deepseek", (route) =>
    route.fulfill({
      json: {
        provider: "deepseek",
        default_model: "deepseek-v4-flash",
        api_key_required: false,
        api_key_configured: false,
      },
    }),
  );
  await page.route("**/api/v1/research/history*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/research/tasks/active", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route(`**/api/v1/research/tasks/${TASK_ID}`, (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.addInitScript(() => {
    const target = window as unknown as PetTestWindow;
    target.petTestSequence = 0;
    // Only the transport is replaced. Events still use the production reducer,
    // task cache, runtime bridge, state resolver, sprite, and drag handlers.
    class PetTestEventSource extends EventTarget {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readyState = 1;
      constructor(public url: string | URL) {
        super();
        target.petTestStream = this;
        queueMicrotask(() => this.onopen?.());
      }
      close() {
        this.readyState = 2;
      }
    }
    window.EventSource = PetTestEventSource as unknown as typeof EventSource;
  });
}

async function emitTaskEvent(
  page: Page,
  eventType: string,
  stage: ResearchStage | null = null,
) {
  await page.evaluate(
    ({ taskId, eventType, stage }) => {
      const target = window as unknown as PetTestWindow;
      if (!target.petTestStream)
        throw new Error("Pet fixture stream is not open");
      target.petTestStream.dispatchEvent(
        new MessageEvent(eventType, {
          data: JSON.stringify({
            schema_version: 1,
            task_id: taskId,
            sequence: ++target.petTestSequence,
            event_type: eventType,
            stage,
            level: "info",
            payload: {},
            occurred_at: new Date().toISOString(),
          }),
        }),
      );
    },
    { taskId: TASK_ID, eventType, stage },
  );
}

test("all research phases follow events and drag keeps priority during a phase change", async ({
  page,
}) => {
  await persistPet(page);
  await mockPetTask(page);
  await page.goto(`/en/research/${TASK_ID}`, { waitUntil: "domcontentloaded" });
  const pet = page.locator("[data-pet-state]");
  await expect(pet).toHaveAttribute("data-pet-state", "idle");
  await expectActionAtlas(page, "idle");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as unknown as PetTestWindow).petTestStream),
      ),
    )
    .toBe(true);
  await emitTaskEvent(page, "task.started");
  for (const stage of STAGES) {
    await emitTaskEvent(page, "stage.started", stage);
    await expect(pet).toHaveAttribute("data-pet-state", stage);
    await expectActionAtlas(page, stage);
  }

  const box = await pet.boundingBox();
  if (!box) throw new Error("Pet has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 70, box.y - 70, { steps: 3 });
  await expect(pet).toHaveAttribute("data-pet-state", "dragging");
  await expectActionAtlas(page, "dragging");
  await emitTaskEvent(page, "stage.started", "search");
  await expect(pet).toHaveAttribute("data-pet-state", "dragging");
  await page.mouse.up();
  await expect(pet).toHaveAttribute("data-pet-state", "search");
  await expect(page).toHaveURL(new RegExp(`/research/${TASK_ID}$`));

  const movedBox = await pet.boundingBox();
  if (!movedBox) throw new Error("Pet disappeared after dragging");
  await page.mouse.move(
    movedBox.x + movedBox.width / 2,
    movedBox.y + movedBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(movedBox.x - 20, movedBox.y - 20, { steps: 2 });
  await emitTaskEvent(page, "task.cancellation_requested");
  await expect(pet).toHaveAttribute("data-pet-state", "dragging");
  await page.mouse.up();
  await expect(pet).toHaveAttribute("data-pet-state", "failed");
  await expectActionAtlas(page, "failed");
});

test("rapid phase changes select the latest authentic atlas and full animation advances", async ({
  page,
}) => {
  await persistPet(page, { motion: "full" });
  await mockPetTask(page);
  await page.goto(`/en/research/${TASK_ID}`, { waitUntil: "domcontentloaded" });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as unknown as PetTestWindow).petTestStream),
      ),
    )
    .toBe(true);
  await emitTaskEvent(page, "task.started");
  await page.evaluate(
    ({ taskId, stages }) => {
      const target = window as unknown as PetTestWindow;
      for (const stage of stages) {
        target.petTestStream?.dispatchEvent(
          new MessageEvent("stage.started", {
            data: JSON.stringify({
              schema_version: 1,
              task_id: taskId,
              sequence: ++target.petTestSequence,
              event_type: "stage.started",
              stage,
              level: "info",
              payload: {},
              occurred_at: new Date().toISOString(),
            }),
          }),
        );
      }
    },
    { taskId: TASK_ID, stages: [...STAGES, ...STAGES] },
  );
  const sprite = page.locator("[data-pet-frame]");
  await expect(sprite).toHaveAttribute("data-pet-action", "critic");
  await expect(sprite).toHaveAttribute("data-pet-asset", "ready");
  await expect(sprite).toHaveCSS(
    "background-image",
    assetPattern(realManifest.states.critic.src),
  );
  const frame = await sprite.getAttribute("data-pet-frame");
  await expect
    .poll(() => sprite.getAttribute("data-pet-frame"))
    .not.toBe(frame);
});

for (const status of ["failed", "cancelled", "interrupted"] as const) {
  test(`${status} task snapshot selects the error companion`, async ({
    page,
  }) => {
    await persistPet(page);
    await mockPetTask(page, status);
    await page.goto(`/en/research/${TASK_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("[data-pet-state]")).toHaveAttribute(
      "data-pet-state",
      "failed",
    );
  });
}

test("completion returns to idle after the animation while keeping static mode", async ({
  page,
}) => {
  await persistPet(page);
  await mockPetTask(page);
  await page.goto(`/en/research/${TASK_ID}`, { waitUntil: "domcontentloaded" });
  const pet = page.locator("[data-pet-state]");
  await expect(pet).toHaveAttribute("data-pet-state", "idle");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as unknown as PetTestWindow).petTestStream),
      ),
    )
    .toBe(true);
  await emitTaskEvent(page, "task.completed");
  await expect(pet).toHaveAttribute("data-pet-state", "completed");
  await expectActionAtlas(page, "completed");
  const sprite = pet.locator("[data-pet-frame]");
  const poster = await sprite.getAttribute("data-pet-frame");
  await page.waitForTimeout(300);
  await expect(sprite).toHaveAttribute("data-pet-frame", poster ?? "0");
  // Timing and the exact two-loop boundary are covered by the animation unit
  // tests. This check exercises the hook callback through the live overlay.
  await expect(pet).toHaveAttribute("data-pet-state", "idle", {
    timeout: 30_000,
  });
  await expectActionAtlas(page, "idle");
});

test("an unavailable action atlas holds the new idle poster and a later phase can load", async ({
  page,
}) => {
  await persistPet(page, { motion: "full" });
  await mockPetTask(page);
  await failActionAtlas(page, "search");
  await page.goto(`/en/research/${TASK_ID}`, { waitUntil: "domcontentloaded" });
  const pet = page.locator("[data-pet-state]");
  const sprite = pet.locator("[data-pet-frame]");
  await expect(sprite).toHaveAttribute("data-pet-asset", "ready");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as unknown as PetTestWindow).petTestStream),
      ),
    )
    .toBe(true);
  await emitTaskEvent(page, "task.started");
  await emitTaskEvent(page, "stage.started", "search");
  await expect(pet).toHaveAttribute("data-pet-state", "search");
  await expect(sprite).toHaveAttribute("data-pet-asset", "error");
  await expect(sprite).toHaveCSS(
    "background-image",
    assetPattern(realManifest.states.idle.posterSrc),
  );
  await expect(sprite).toHaveCSS("background-size", "96px 104px");
  const fallbackFrame = await sprite.getAttribute("data-pet-frame");
  await page.waitForTimeout(350);
  await expect(sprite).toHaveAttribute("data-pet-frame", fallbackFrame ?? "0");
  await emitTaskEvent(page, "stage.started", "read");
  await expect(sprite).toHaveAttribute("data-pet-asset", "ready");
  await expect(sprite).toHaveCSS(
    "background-image",
    assetPattern(realManifest.states.read.src),
  );
});

for (const [size, width, height] of [
  ["small", 72, 78],
  ["medium", 96, 104],
  ["large", 120, 130],
] as const) {
  test(`${size} companion clamps at both drag boundaries and restores saved position`, async ({
    page,
  }) => {
    await persistPet(page, { size });
    await mockPetTask(page);
    await page.goto("/en/workspace", { waitUntil: "domcontentloaded" });
    const pet = page.locator("[data-pet-state]");
    await expect(pet).toBeVisible();
    const initial = await pet.boundingBox();
    if (!initial) throw new Error("Pet has no bounding box");
    expect(initial.width).toBe(width);
    expect(initial.height).toBe(height);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Viewport is unavailable");

    await page.mouse.move(initial.x + width / 2, initial.y + height / 2);
    await page.mouse.down();
    await page.mouse.move(viewport.width - 1, viewport.height - 1, {
      steps: 3,
    });
    const bottomRight = await pet.boundingBox();
    if (!bottomRight) throw new Error("Pet disappeared while dragging");
    expect(bottomRight.x + width).toBeLessThanOrEqual(viewport.width);
    expect(bottomRight.y + height).toBeLessThanOrEqual(viewport.height);
    await page.mouse.move(1, 1, { steps: 5 });
    const topLeft = await pet.boundingBox();
    if (!topLeft) throw new Error("Pet disappeared while dragging");
    expect(topLeft.x).toBeGreaterThanOrEqual(0);
    expect(topLeft.y).toBeGreaterThanOrEqual(0);
    await page.mouse.up();

    const saved = await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("research-agent.preferences.v1") ?? "{}",
        ).state.pet.position,
    );
    expect(saved).toEqual({ xRatio: 0, yRatio: 0 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(pet).toBeVisible();
    const restored = await pet.boundingBox();
    if (!restored) throw new Error("Pet disappeared after reload");
    expect(restored.x).toBeCloseTo(24, 0);
    expect(restored.y).toBeCloseTo(24, 0);
  });
}

test("drag lock keeps the saved position and clicking still opens settings", async ({
  page,
}) => {
  await persistPet(page, { dragLocked: true });
  await mockPetTask(page);
  await page.goto("/en/workspace", { waitUntil: "domcontentloaded" });
  const pet = page.locator("[data-pet-state]");
  await expect(pet).toBeVisible();
  const before = await pet.boundingBox();
  if (!before) throw new Error("Pet has no bounding box");
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(30, 30, { steps: 5 });
  await expect(pet).toHaveAttribute("data-pet-state", "idle");
  expect(await pet.boundingBox()).toEqual(before);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/en\/settings$/);
});
