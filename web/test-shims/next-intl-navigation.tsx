import {
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

type Href =
  | string
  | { pathname: string; query?: Record<string, string | number | undefined> };

export function Link({
  href,
  children,
  onNavigate,
  onClick,
  replace: _replace,
  prefetch: _prefetch,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  children?: ReactNode;
  replace?: boolean;
  prefetch?: boolean | "auto" | null;
  onNavigate?: (event: { preventDefault: () => void }) => void;
}) {
  // These Next.js-only options must not be forwarded as DOM attributes.
  void _replace;
  void _prefetch;
  const target = typeof href === "string" ? href : href.pathname;
  return (
    <a
      href={target}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank" ||
          props.download !== undefined
        )
          return;
        onNavigate?.({ preventDefault: () => event.preventDefault() });
      }}
    >
      {children}
    </a>
  );
}

export function useRouter() {
  return useMemo(
    () => ({
      push: (href: Href) => {
        window.history.pushState(
          {},
          "",
          typeof href === "string" ? href : href.pathname,
        );
        window.dispatchEvent(new Event("test-navigation"));
      },
      replace: (href: Href) => {
        window.history.replaceState(
          {},
          "",
          typeof href === "string" ? href : href.pathname,
        );
        window.dispatchEvent(new Event("test-navigation"));
      },
      back: () => window.history.back(),
      forward: () => window.history.forward(),
      refresh: () => undefined,
      prefetch: async () => undefined,
    }),
    [],
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("test-navigation", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("test-navigation", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function usePathname() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => "/",
  );
}

export function redirect(href: Href): never {
  throw new Error(
    `Redirected to ${typeof href === "string" ? href : href.pathname}`,
  );
}

export function getPathname({ href }: { href: Href }) {
  return typeof href === "string" ? href : href.pathname;
}

export function createNavigation() {
  return { Link, redirect, usePathname, useRouter, getPathname };
}
