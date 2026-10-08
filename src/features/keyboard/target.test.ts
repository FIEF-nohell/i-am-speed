import { describe, expect, it } from "vitest";
import { targetFor } from "./target";

describe("targetFor", () => {
  it("returns key and finger for plain, shifted and altgr chars", () => {
    expect(targetFor("f")).toMatchObject({
      codes: ["KeyF"],
      finger: "leftIndex",
      hint: "left index",
    });
    expect(targetFor("J")?.codes).toEqual(["KeyJ", "ShiftLeft"]);
    expect(targetFor("J")?.hint).toBe("right index, with left shift");
    expect(targetFor("@")?.codes).toEqual(["KeyQ", "AltRight"]);
    expect(targetFor(" ")?.codes).toEqual(["Space"]);
  });
  it("is null for dead or missing chars", () => {
    expect(targetFor("^")).toBeNull();
    expect(targetFor(null)).toBeNull();
  });
});
