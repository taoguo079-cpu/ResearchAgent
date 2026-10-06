import { render, screen } from "@testing-library/react";
import { useLocale, useTranslations } from "next-intl";
import { describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: null as string | null }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => route.pathname,
}));

import { Providers } from "./providers";

function LocaleProbe() {
  const locale = useLocale();
  const t = useTranslations("entry");
  return (
    <p data-testid="locale" data-locale={locale}>
      {t("newResearch")}
    </p>
  );
}

describe("persistent root locale", () => {
  it("updates translations and document language when a client navigation changes the prefix", () => {
    window.history.replaceState({}, "", "/");
    route.pathname = "/en/workspace";
    const view = render(
      <Providers locale="en">
        <LocaleProbe />
      </Providers>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("NEW RESEARCH");
    route.pathname = "/workspace";
    view.rerender(
      <Providers locale="en">
        <LocaleProbe />
      </Providers>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("新建研究");
    expect(document.documentElement.lang).toBe("zh-CN");
    route.pathname = "/en/research/new";
    view.rerender(
      <Providers locale="en">
        <LocaleProbe />
      </Providers>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("NEW RESEARCH");
    expect(document.documentElement.lang).toBe("en");
  });

  it("uses the requested locale before the client pathname is available", () => {
    route.pathname = null;
    render(
      <Providers locale="en">
        <LocaleProbe />
      </Providers>,
    );
    expect(screen.getByTestId("locale")).toHaveAttribute("data-locale", "en");
  });
});
