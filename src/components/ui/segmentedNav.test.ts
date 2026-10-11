import { describe, expect, it } from "vitest";
import { nextIndex } from "./segmentedNav";

describe("nextIndex", () => {
  it("moves forward and wraps", () => {
    expect(nextIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextIndex("ArrowDown", 2, 3)).toBe(0);
  });
  it("moves back and wraps", () => {
    expect(nextIndex("ArrowLeft", 2, 3)).toBe(1);
    expect(nextIndex("ArrowUp", 0, 3)).toBe(2);
  });
  it("jumps to the ends", () => {
    expect(nextIndex("Home", 2, 4)).toBe(0);
    expect(nextIndex("End", 0, 4)).toBe(3);
  });
  it("ignores other keys", () => {
    expect(nextIndex("Enter", 0, 3)).toBeNull();
    expect(nextIndex("a", 1, 3)).toBeNull();
  });
});
