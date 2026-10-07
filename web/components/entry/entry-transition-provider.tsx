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
  type ReactNode,
} from "react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import styles from "./entry-transition.module.css";

export type EntryPath = "/" | "/workspace" | "/research/new";
export type EntryDirection = "forward" | "backward";
type NavigateOptions = { replace?: boolean; direction?: EntryDirection };
type Navigation = {
  source: string;
  target: EntryPath;
  locale: string;
  resolve: () => void;
};
type EntryNavigation = {
  busy: boolean;
  navigate: (href: EntryPath, options?: NavigateOptions) => Promise<void>;
};
type TransitionContext = {
  busy: boolean;
  start: (
    href: EntryPath,
    dispatch: () => void,
    locale: string,
  ) => Promise<void>;
  cancelForLocale: (locale: string) => void;
};

const EntryTransitionContext = createContext<TransitionContext | null>(null);
const ROUTE_TIMEOUT_MS = 5000;

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

export function EntryTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const navigationRef = useRef<Navigation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    const navigation = navigationRef.current;
    navigationRef.current = null;
    setBusy(false);
    navigation?.resolve();
  }, []);

  const start = useCallback(
    (href: EntryPath, dispatch: () => void, locale: string): Promise<void> => {
      if (navigationRef.current) return Promise.resolve();
      const source = normalizePath(pathname);
      if (!isEntryNavigation(source, href)) {
        try {
          dispatch();
        } catch {
          // The current page remains usable if the router is unavailable.
        }
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        navigationRef.current = { source, target: href, locale, resolve };
        setBusy(true);
        timerRef.current = setTimeout(finish, ROUTE_TIMEOUT_MS);
        try {
          dispatch();
        } catch {
          finish();
        }
      });
    },
    [pathname, finish],
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
    if (!navigation) return;
    const current = normalizePath(pathname);
    if (current === navigation.source) return;
    queueMicrotask(() => {
      if (navigationRef.current === navigation) finish();
    });
  }, [pathname, busy, finish]);

  useEffect(() => finish, [finish]);
  useEffect(() => {
    window.addEventListener("popstate", finish);
    return () => window.removeEventListener("popstate", finish);
  }, [finish]);

  const context = useMemo(
    () => ({ start, cancelForLocale, busy }),
    [start, cancelForLocale, busy],
  );

  return (
    <EntryTransitionContext.Provider value={context}>
      <div className={styles.content}>{children}</div>
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
      // The nearest locale provider owns navigation; the root provider persists.
      const dispatch = () =>
        options.replace ? router.replace(href) : router.push(href);
      if (context) return context.start(href, dispatch, locale);
      try {
        dispatch();
      } catch {
        // Navigation failures must not leave the entry button locked.
      }
      return Promise.resolve();
    },
    [context, locale, router],
  );
  return { navigate, busy: context?.busy ?? false };
}
