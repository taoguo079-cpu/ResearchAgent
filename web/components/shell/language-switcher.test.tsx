import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Providers } from "@/app/providers";
import { LanguageSwitcher } from "@/components/shell/language-switcher";

describe("language switcher visibility", () => {
  it("removes the complete language area while locked and restores usable buttons when unlocked", () => {
    const { container, rerender } = render(
      <Providers locale="en">
        <LanguageSwitcher locked />
      </Providers>,
    );
    expect(container.querySelector('[aria-label="Languages"]')).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(
      <Providers locale="en">
        <LanguageSwitcher />
      </Providers>,
    );
    expect(screen.getByRole("button", { name: "中文" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "English" })).toBeEnabled();
  });
});
