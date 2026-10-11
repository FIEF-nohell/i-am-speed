import { describe, expect, it } from "vitest";
import { isContribId, newContribId } from "./ids";

describe("contribution ids", () => {
  it("generates 20 base62 characters that are valid and unique", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const id = newContribId();
      expect(id).toMatch(/^[A-Za-z0-9]{20}$/);
      expect(isContribId(id)).toBe(true);
      ids.add(id);
    }
    expect(ids.size).toBe(200);
  });
  it("accepts legacy ids and rejects malformed ones", () => {
    expect(isContribId("legacy-0123456789abcdef")).toBe(true);
    expect(isContribId("short")).toBe(false);
    expect(isContribId("has space in it")).toBe(false);
    expect(isContribId("a".repeat(65))).toBe(false);
    expect(isContribId(42)).toBe(false);
    expect(isContribId(null)).toBe(false);
  });
});
