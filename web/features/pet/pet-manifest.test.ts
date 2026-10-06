import { expect, it } from "vitest";

import { PET_ANIMATIONS, resolvePetState } from "@/features/pet/pet-manifest";

it("uses relaxing at rest and flying throughout pointer dragging or physical motion", () => {
  expect(resolvePetState({ dragging: false, moving: false })).toBe("completed");
  expect(resolvePetState({ dragging: true, moving: false })).toBe("dragging");
  expect(resolvePetState({ dragging: false, moving: true })).toBe("dragging");
  expect(resolvePetState({ dragging: true, moving: true })).toBe("dragging");
  expect(PET_ANIMATIONS).toEqual({
    completed: "completed",
    dragging: "flying",
  });
});
