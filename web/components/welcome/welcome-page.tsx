"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Component,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePreferencesStore } from "@/features/preferences/preferences-store";
import { useWelcomeToys } from "@/features/welcome/use-welcome-toys";
import {
  INITIAL_WELCOME_STATE,
  WELCOME_SESSION_KEY,
  welcomeReducer,
} from "@/features/welcome/welcome-state";
import { useRouter } from "@/i18n/navigation";
import styles from "./welcome-page.module.css";
import sceneStyles from "./welcome-scene.module.css";

const WelcomeScene = dynamic(
  () => import("./welcome-scene").then((module) => module.WelcomeScene),
  { ssr: false },
);

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Welcome scene failed to initialize", error);
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function readReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function WelcomePage() {
  const t = useTranslations("welcome");
  const router = useRouter();
  const [state, dispatch] = useReducer(welcomeReducer, INITIAL_WELCOME_STATE);
  const [sceneReady, setSceneReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [robotVisible, setRobotVisible] = useState(false);
  const [guidance, setGuidance] = useState<"initial" | "hidden" | "restored">(
    "initial",
  );
  const [breaking, setBreaking] = useState(false);
  const systemReduced = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => false,
  );
  const motion = usePreferencesStore((preferences) => preferences.pet.motion);
  const reduced = systemReduced || motion === "static" || motion === "reduced";
  const navigated = useRef(false),
    entering = useRef(false),
    keyboardUsed = useRef(false);
  const enterButton = useRef<HTMLButtonElement>(null);
  const lastTap = useRef<number | null>(null);
  const { phase } = state;
  const hasMagnifier =
    ["dropping", "greeting", "invitation", "leaving"].includes(phase) &&
    !failed;
  const hasRobot = hasMagnifier && robotVisible;
  const hasGreeting =
    guidance !== "hidden" && ["greeting", "invitation"].includes(phase);
  const hasInvitation = hasGreeting && phase === "invitation";
  const {
    page: pageRef,
    robot: robotRef,
    magnifier: magnifierRef,
    guidance: guidanceRef,
    connect,
    handlers,
    canActivate,
  } = useWelcomeToys({
    magnifier: hasMagnifier,
    robot: hasRobot,
    reduced,
    onEvent() {
      dispatch("TOYS_STABLE");
    },
    onDrag() {
      lastTap.current = null;
      if (hasGreeting && !reduced) setBreaking(true);
      setGuidance("hidden");
    },
    onTap(pointerType, time) {
      if (pointerType !== "touch" || guidance === "hidden") return;
      if (lastTap.current !== null && time - lastTap.current <= 350) {
        lastTap.current = null;
        dispatch("REVEAL");
      } else lastTap.current = time;
    },
  });
  const goToWorkspace = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace("/workspace");
  }, [router]);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      try {
        if (sessionStorage.getItem(WELCOME_SESSION_KEY) === "complete") {
          goToWorkspace();
          return;
        }
      } catch {
        /* Storage restrictions do not block the introduction. */
      }
      dispatch("CHECKED");
    });
    return () => {
      disposed = true;
    };
  }, [goToWorkspace]);
  useEffect(() => {
    if (phase !== "dropping") return;
    const timeout = window.setTimeout(
      () => setRobotVisible(true),
      reduced ? 0 : 180,
    );
    return () => window.clearTimeout(timeout);
  }, [phase, reduced]);
  useEffect(() => {
    if (phase !== "leaving") return;
    const timeout = window.setTimeout(goToWorkspace, reduced ? 60 : 220);
    return () => window.clearTimeout(timeout);
  }, [phase, reduced, goToWorkspace]);
  useEffect(() => {
    if (!breaking) return;
    const timeout = window.setTimeout(() => setBreaking(false), 220);
    return () => window.clearTimeout(timeout);
  }, [breaking]);
  useEffect(() => {
    if (!keyboardUsed.current) return;
    if (phase === "greeting") robotRef.current?.focus();
    if (hasInvitation) enterButton.current?.focus();
  }, [phase, hasInvitation, robotRef]);
  const onReady = useCallback(() => {
    setSceneReady(true);
    dispatch("READY");
  }, []);
  const onFailure = useCallback(() => {
    setFailed(true);
    setSceneReady(false);
  }, []);
  function activateRobot(keyboard = false, double = false) {
    if (!canActivate() || !["greeting", "invitation"].includes(phase)) return;
    if (guidance === "hidden") {
      setBreaking(false);
      setGuidance("restored");
      dispatch("REVEAL");
    } else if (keyboard || double) dispatch("REVEAL");
  }
  function enter(skip = false) {
    if (entering.current || (!skip && !hasInvitation)) return;
    entering.current = true;
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, "complete");
    } catch {
      /* Entry also works without storage. */
    }
    dispatch(skip ? "SKIP" : "ENTER");
  }
  return (
    <main
      ref={pageRef}
      className={styles.page}
      data-intro-phase={phase}
      data-reduced-motion={reduced}
      data-scene-ready={sceneReady}
      data-scene-failed={failed}
      data-guidance={hasGreeting ? "visible" : breaking ? "breaking" : "hidden"}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && phase === "leaving")
          goToWorkspace();
      }}
    >
      <h1 className={styles.accessibleTitle}>Research Agent</h1>
      <div
        className={sceneStyles.atmosphere}
        data-testid="welcome-atmosphere"
        aria-hidden="true"
      >
        <div className={sceneStyles.wash} />
        <div className={sceneStyles.grid} />
        <div className={sceneStyles.stars} />
        <div className={sceneStyles.floorLight} />
        <div className={sceneStyles.floorLine} />
      </div>
      {!sceneReady && (
        <div
          className={styles.placeholder}
          data-testid="welcome-title-placeholder"
          aria-hidden="true"
        >
          <span>Research </span>
          <span>Agent</span>
        </div>
      )}
      {phase !== "checking" && !failed && (
        <SceneBoundary onFailure={onFailure}>
          <WelcomeScene
            connect={connect}
            onReady={onReady}
            onFailure={onFailure}
          />
        </SceneBoundary>
      )}
      <div className={styles.microLabel} aria-hidden="true">
        {t("sceneLabel")}
      </div>
      {["checking", "loading", "ready"].includes(phase) && (
        <p className={styles.introHint}>
          {t(failed ? "fallback" : "dropHint")}
          <span className={styles.hintLine} aria-hidden="true" />
        </p>
      )}
      {["loading", "ready", "dropping"].includes(phase) && !failed && (
        <button
          type="button"
          className={styles.screenTrigger}
          aria-label={t("screenLabel")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ")
              keyboardUsed.current = true;
          }}
          onClick={() => dispatch("ADVANCE")}
        />
      )}
      {hasMagnifier && (
        <button
          ref={magnifierRef}
          type="button"
          className={`${styles.toy} ${styles.lensToy}`}
          aria-label={t("magnifierLabel")}
          data-testid="welcome-magnifier"
          {...handlers("magnifier")}
          onClick={(event) => event.stopPropagation()}
        >
          <span aria-hidden="true" />
        </button>
      )}
      {hasRobot && (
        <button
          ref={robotRef}
          type="button"
          className={styles.toy}
          aria-label={t("robotLabel")}
          aria-describedby={hasGreeting ? "welcome-greeting" : undefined}
          data-testid="welcome-robot"
          disabled={phase === "leaving"}
          {...handlers("robot")}
          onDoubleClick={(event) => {
            event.stopPropagation();
            activateRobot(false, true);
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (event.detail === 0) keyboardUsed.current = true;
            activateRobot(event.detail === 0);
          }}
        >
          <span aria-hidden="true" />
        </button>
      )}
      {(hasGreeting || breaking) && (
        <div
          ref={guidanceRef}
          className={`${styles.guidance} ${breaking && !hasGreeting ? styles.breaking : ""}`}
          data-testid={breaking && !hasGreeting ? "welcome-shards" : undefined}
          aria-hidden={!hasGreeting}
        >
          {hasInvitation && (
            <div className={styles.invitation}>
              <button
                ref={enterButton}
                type="button"
                className={styles.enterButton}
                onClick={(event) => {
                  event.stopPropagation();
                  enter();
                }}
              >
                {t("enter")}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
          <div
            id={hasGreeting ? "welcome-greeting" : undefined}
            className={styles.bubble}
            role={hasGreeting ? "status" : undefined}
            aria-live={hasGreeting ? "polite" : undefined}
          >
            <p className={styles.greeting}>{t("greeting")}</p>
            <p className={styles.hint}>
              {t(guidance === "restored" ? "playHint" : "hint")}
            </p>
          </div>
        </div>
      )}
      <p className={styles.cornerNote} aria-hidden="true">
        {t("footer")}
      </p>
      <button
        className={styles.skip}
        type="button"
        onClick={() => enter(true)}
        disabled={phase === "leaving"}
      >
        {t("skip")} <span aria-hidden="true">↗</span>
      </button>
    </main>
  );
}
