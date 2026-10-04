import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PetSprite } from "@/components/pet/pet-sprite";
import type { PetAnimationSpec } from "@/features/pet/pet-manifest";

const spec: PetAnimationSpec = {
  src: "/pets/fintech-robot/atlases/read.webp",
  posterSrc: "/pets/fintech-robot/posters/read.webp",
  columns: 12,
  rows: 2,
  frameCount: 13,
  frameDurationsMs: Array<number>(13).fill(100),
  posterFrame: 6,
  loop: true,
};

describe("PetSprite", () => {
  it("aligns responsive hero frames across atlas columns and rows", () => {
    const { container } = render(
      <PetSprite state="read" frame={12} size="large" responsive spec={spec} />,
    );
    const sprite = container.querySelector<HTMLElement>("[data-pet-frame]");
    expect(sprite?.style.width).toBe("100%");
    expect(sprite?.style.aspectRatio).toBe("192 / 208");
    expect(sprite?.style.backgroundSize).toBe("1200% 200%");
    expect(sprite?.style.backgroundPosition).toBe("0% 100%");
  });
  it("wraps frames after column 12 onto the next atlas row", () => {
    const { container } = render(
      <PetSprite state="read" frame={12} size="medium" spec={spec} />,
    );
    const sprite = container.querySelector<HTMLElement>("[data-pet-frame]");
    expect(sprite).toHaveAttribute("data-pet-frame", "12");
    expect(sprite?.style.backgroundImage).toContain(spec.src);
    expect(sprite?.style.backgroundSize).toBe("1152px 208px");
    expect(sprite?.style.backgroundPosition).toBe("0px -104px");
  });

  it("uses the current action poster while loading and the new idle poster on error", () => {
    const idlePoster = "/pets/fintech-robot/posters/idle.webp";
    const { container, rerender } = render(
      <PetSprite
        state="read"
        frame={6}
        size="medium"
        spec={spec}
        assetStatus="loading"
        fallbackPosterSrc={idlePoster}
      />,
    );
    const sprite = container.querySelector<HTMLElement>("[data-pet-frame]");
    expect(sprite?.style.backgroundImage).toContain(spec.posterSrc);
    expect(sprite?.style.backgroundSize).toBe("96px 104px");
    rerender(
      <PetSprite
        state="read"
        frame={6}
        size="medium"
        spec={spec}
        assetStatus="error"
        fallbackPosterSrc={idlePoster}
      />,
    );
    expect(sprite?.style.backgroundImage).toContain(idlePoster);
    expect(sprite?.style.backgroundImage).not.toContain("research-bot");
  });

  it.each([
    ["small", 72, 78],
    ["medium", 96, 104],
    ["large", 120, 130],
  ] as const)("preserves the %s display size", (size, width, height) => {
    const { container } = render(
      <PetSprite state="read" frame={0} size={size} spec={spec} />,
    );
    const sprite = container.querySelector<HTMLElement>("[data-pet-frame]");
    expect(sprite?.style.width).toBe(`${width}px`);
    expect(sprite?.style.height).toBe(`${height}px`);
  });
});
