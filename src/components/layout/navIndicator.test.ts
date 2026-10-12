import { describe, expect, it } from "vitest";
import { INITIAL_INDICATOR, nextIndicator, type IndicatorState } from "./navIndicator";

const shown: IndicatorState = { x: 10, w: 40, visible: true, glide: false };

describe("nextIndicator", () => {
  it("fades out in place without a box", () => {
    expect(nextIndicator(shown, null, "route")).toEqual({ ...shown, visible: false, glide: false });
  });
  it("snaps on init and resize", () => {
    expect(nextIndicator(INITIAL_INDICATOR, { x: 5, w: 20 }, "init")).toEqual({
      x: 5,
      w: 20,
      visible: true,
      glide: false,
    });
    expect(nextIndicator(shown, { x: 7, w: 20 }, "resize").glide).toBe(false);
  });
  it("glides on a route change when already visible", () => {
    expect(nextIndicator(shown, { x: 90, w: 30 }, "route")).toEqual({
      x: 90,
      w: 30,
      visible: true,
      glide: true,
    });
  });
  it("appears in place on a route change when hidden", () => {
    const hidden = { ...shown, visible: false };
    expect(nextIndicator(hidden, { x: 90, w: 30 }, "route")).toEqual({
      x: 90,
      w: 30,
      visible: true,
      glide: false,
    });
  });
  it("returns the same object when nothing changed", () => {
    expect(nextIndicator(shown, { x: 10, w: 40 }, "resize")).toBe(shown);
    expect(nextIndicator(INITIAL_INDICATOR, null, "init")).toBe(INITIAL_INDICATOR);
  });
});
