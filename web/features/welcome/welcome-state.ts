export const WELCOME_SESSION_KEY = "research-agent.welcome.v1";

export type WelcomePhase =
  | "checking"
  | "loading"
  | "ready"
  | "dropping"
  | "greeting"
  | "invitation"
  | "leaving";

export type WelcomeState = { phase: WelcomePhase; dropQueued: boolean };
export type WelcomeEvent =
  "CHECKED" | "READY" | "ADVANCE" | "TOYS_STABLE" | "REVEAL" | "ENTER" | "SKIP";

export const INITIAL_WELCOME_STATE: WelcomeState = {
  phase: "checking",
  dropQueued: false,
};

export function welcomeReducer(
  state: WelcomeState,
  event: WelcomeEvent,
): WelcomeState {
  switch (event) {
    case "CHECKED":
      return state.phase === "checking"
        ? { ...state, phase: "loading" }
        : state;
    case "READY":
      return state.phase === "loading"
        ? { ...state, phase: state.dropQueued ? "dropping" : "ready" }
        : state;
    case "ADVANCE":
      if (state.phase === "loading") return { ...state, dropQueued: true };
      if (state.phase === "ready") return { ...state, phase: "dropping" };
      return state;
    case "TOYS_STABLE":
      return state.phase === "dropping"
        ? { ...state, phase: "greeting" }
        : state;
    case "REVEAL":
      return state.phase === "greeting"
        ? { ...state, phase: "invitation" }
        : state;
    case "ENTER":
      return state.phase === "invitation"
        ? { ...state, phase: "leaving" }
        : state;
    case "SKIP":
      return { ...state, phase: "leaving" };
  }
}
