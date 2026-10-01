import { describe, expect, it } from "vitest";
import { INITIAL_WELCOME_STATE, welcomeReducer } from "./welcome-state";

describe("welcome state", () => {
  it("queues one click made before WASM is ready and drops both toys on initialization", () => {
    let state = welcomeReducer(INITIAL_WELCOME_STATE, "CHECKED");
    state = welcomeReducer(state, "ADVANCE");
    expect(state).toEqual({ phase: "loading", dropQueued: true });
    state = welcomeReducer(state, "READY");
    expect(state.phase).toBe("dropping");
    expect(welcomeReducer(state, "ADVANCE")).toBe(state);
    expect(welcomeReducer(state, "REVEAL")).toBe(state);
    state = welcomeReducer(state, "TOYS_STABLE");
    expect(welcomeReducer(state, "REVEAL").phase).toBe("invitation");
  });
  it("allows skipping every phase but only accepts the research invitation when revealed", () => {
    expect(welcomeReducer(INITIAL_WELCOME_STATE, "ENTER")).toBe(
      INITIAL_WELCOME_STATE,
    );
    expect(welcomeReducer(INITIAL_WELCOME_STATE, "SKIP").phase).toBe("leaving");
  });
});
