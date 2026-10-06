"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";

import { usePreferencesStore } from "@/features/preferences/preferences-store";
import { usePathname, useRouter } from "@/i18n/navigation";
import styles from "./entry-transition.module.css";

export type EntryPath = "/" | "/workspace" | "/research/new";
export type EntryDirection = "forward" | "backward";
type NavigateOptions = { replace?: boolean; direction?: EntryDirection };
type Phase = "direct" | "waiting" | "overlapping";
type Transition = { phase: Phase; direction: EntryDirection };
type Navigation = {
  source: string;
  target: EntryPath;
  locale: string;
  dispatch: () => void;
  dispatched: boolean;
  committed: boolean;
  commit: () => void;
  resolve: () => void;
  view?: ViewTransition;
};
type EntryNavigation = {
  busy: boolean;
  navigate: (href: EntryPath, options?: NavigateOptions) => Promise<void>;
};
type TransitionContext = {
  busy: boolean;
  start: (
    href: EntryPath,
    options: NavigateOptions,
    dispatch: () => void,
    locale: string,
  ) => Promise<void>;
  cancelForLocale: (locale: string) => void;
};

const EntryTransitionContext = createContext<TransitionContext | null>(null);
const ROUTE_TIMEOUT_MS = 5000;
const ANIMATION_MS = 900;

function normalizePath(pathname: string) {
  return (
    pathname.replace(/^\/(?:en|zh-CN)(?=\/|$)/, "").replace(/\/$/, "") || "/"
  );
}

function isEntryNavigation(source: string, target: EntryPath) {
  return (
    (source === "/" && target === "/workspace") ||
    (source === "/workspace" && target === "/research/new") ||
    (source === "/research/new" && target === "/workspace")
  );
}

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clearViewStyles() {
  document.documentElement.classList.remove(styles.active);
  delete document.documentElement.dataset.entryDirection;
}

export function EntryTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const motion = usePreferencesStore((state) => state.pet.motion);
  const systemReduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => true,
  );
  const reduced = systemReduced || motion === "reduced" || motion === "static";
  const [transition, setTransition] = useState<Transition | null>(null);
  const navigationRef = useRef<Navigation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    const navigation = navigationRef.current;
    navigationRef.current = null;
    // Release the update promise as well as the visual overlay on cancellation.
    navigation?.commit();
    navigation?.view?.skipTransition();
    clearViewStyles();
    setTransition(null);
    navigation?.resolve();
  }, []);

  const dispatchOnce = useCallback(
    (navigation: Navigation) => {
      if (navigationRef.current !== navigation || navigation.dispatched) return;
      navigation.dispatched = true;
      try {
        navigation.dispatch();
      } catch {
        finish();
      }
    },
    [finish],
  );

  const start = useCallback(
    (
      href: EntryPath,
      options: NavigateOptions,
      dispatch: () => void,
      locale: string,
    ): Promise<void> => {
      if (navigationRef.current) return Promise.resolve();
      const source = normalizePath(pathname);
      if (!isEntryNavigation(source, href)) {
        try {
          dispatch();
        } catch {
          // Keep the original page usable if the router rejects navigation.
        }
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        let commit = () => {};
        const committed = new Promise<void>((release) => {
          commit = release;
        });
        const navigation: Navigation = {
          source,
          target: href,
          locale,
          dispatch,
          dispatched: false,
          committed: false,
          commit,
          resolve,
        };
        navigationRef.current = navigation;
        const direction = options.direction ?? "forward";
        timerRef.current = setTimeout(finish, ROUTE_TIMEOUT_MS);
        if (reduced || typeof document.startViewTransition !== "function") {
          setTransition({ phase: "direct", direction });
          dispatchOnce(navigation);
          return;
        }

        setTransition({ phase: "waiting", direction });
        document.documentElement.classList.add(styles.active);
        document.documentElement.dataset.entryDirection = direction;
        try {
          const view = document.startViewTransition(() => {
            // Navigation starts only after the browser has captured the old page.
            dispatchOnce(navigation);
            return committed;
          });
          navigation.view = view;
          void view.ready.then(
            () => {
              if (
                navigationRef.current !== navigation ||
                navigation.view !== view
              )
                return;
              if (timerRef.current !== null) clearTimeout(timerRef.current);
              timerRef.current = setTimeout(finish, ANIMATION_MS + 300);
              setTransition({ phase: "overlapping", direction });
            },
            () => {
              // A browser may skip snapshots; finished still waits for the route.
            },
          );
          void view.finished.then(
            () => {
              if (
                navigationRef.current === navigation &&
                navigation.view === view
              )
                finish();
            },
            () => {
              if (
                navigationRef.current === navigation &&
                navigation.view === view
              )
                finish();
            },
          );
        } catch {
          clearViewStyles();
          setTransition({ phase: "direct", direction });
          dispatchOnce(navigation);
        }
      });
    },
    [pathname, reduced, finish, dispatchOnce],
  );

  const cancelForLocale = useCallback(
    (locale: string) => {
      if (navigationRef.current && navigationRef.current.locale !== locale)
        finish();
    },
    [finish],
  );

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation || !transition) return;
    const current = normalizePath(pathname);
    if (current !== navigation.source && current !== navigation.target) {
      queueMicrotask(() => {
        if (navigationRef.current === navigation) finish();
      });
    } else if (current === navigation.target) {
      navigation.committed = true;
      if (transition.phase === "direct") {
        queueMicrotask(() => {
          if (navigationRef.current === navigation) finish();
        });
      } else navigation.commit();
    }
  }, [pathname, transition, finish]);

  const skipAnimation = useCallback(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const view = navigation.view;
    navigation.view = undefined;
    view?.skipTransition();
    navigation.commit();
    clearViewStyles();
    if (navigation.committed) {
      finish();
    } else {
      setTransition((current) =>
        current ? { ...current, phase: "direct" } : null,
      );
      dispatchOnce(navigation);
    }
  }, [dispatchOnce, finish]);

  useEffect(() => {
    if (!reduced || !transition || transition.phase === "direct") return;
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) skipAnimation();
    });
    return () => {
      disposed = true;
    };
  }, [reduced, transition, skipAnimation]);

  useEffect(() => finish, [finish]);

  useEffect(() => {
    window.addEventListener("popstate", finish);
    window.addEventListener("resize", skipAnimation);
    return () => {
      window.removeEventListener("popstate", finish);
      window.removeEventListener("resize", skipAnimation);
    };
  }, [finish, skipAnimation]);

  const context = useMemo(
    () => ({ start, cancelForLocale, busy: transition !== null }),
    [start, cancelForLocale, transition],
  );

  return (
    <EntryTransitionContext.Provider value={context}>
      <div className={styles.content} inert={transition !== null}>
        {children}
      </div>
      {transition &&
        transition.phase !== "direct" &&
        createPortal(
          <div
            className={styles.guard}
            aria-hidden="true"
            data-testid="entry-transition"
            data-phase={transition.phase}
            data-direction={transition.direction}
          />,
          document.body,
        )}
    </EntryTransitionContext.Provider>
  );
}

export function useEntryNavigation(): EntryNavigation {
  const context = useContext(EntryTransitionContext);
  const router = useRouter();
  const locale = useLocale();
  useEffect(() => {
    context?.cancelForLocale(locale);
  }, [context, locale]);
  const navigate = useCallback(
    (href: EntryPath, options: NavigateOptions = {}) => {
      // The page's nearest locale provider owns navigation; the root provider persists.
      const dispatch = () =>
        options.replace ? router.replace(href) : router.push(href);
      if (context) return context.start(href, options, dispatch, locale);
      dispatch();
      return Promise.resolve();
    },
    [context, locale, router],
  );
  return { navigate, busy: context?.busy ?? false };
}
