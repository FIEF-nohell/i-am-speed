import { describe, expect, it } from "vitest";
import { emptyAggregates } from "./combine";
import { canonicalJson, legacyContribId, stableHash } from "./hash";

describe("stableHash", () => {
  it("is FNV-1a 64 over the canonical text", () => {
    // The FNV-1a 64 reference value for the bytes `"a"` (with quotes) is d4272417d7c77eea.
    expect(stableHash("a")).toBe("d4272417d7c77eea");
    expect(stableHash("a")).toMatch(/^[0-9a-f]{16}$/);
  });
  it("ignores key order at every depth", () => {
    const a = { x: 1, y: { p: [1, { q: 2, r: 3 }], o: "s" } };
    const b = { y: { o: "s", p: [1, { r: 3, q: 2 }] }, x: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(stableHash(a)).toBe(stableHash(b));
  });
  it("changes when values change and keeps array order significant", () => {
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
    expect(stableHash([1, 2])).not.toBe(stableHash([2, 1]));
  });
  it("skips undefined fields like JSON does", () => {
    expect(stableHash({ a: 1, b: undefined })).toBe(stableHash({ a: 1 }));
  });
});

describe("legacyContribId", () => {
  it("is stable across key order and has the legacy shape", () => {
    const a = emptyAggregates();
    a.keys = {
      a: { attempts: 1, errors: 0, totalMs: 5, timedHits: 1 },
      b: { attempts: 2, errors: 1, totalMs: 9, timedHits: 2 },
    };
    const b = emptyAggregates();
    b.keys = {
      b: { timedHits: 2, totalMs: 9, errors: 1, attempts: 2 },
      a: { timedHits: 1, totalMs: 5, errors: 0, attempts: 1 },
    };
    expect(legacyContribId(a)).toMatch(/^legacy-[0-9a-f]{16}$/);
    expect(legacyContribId(a)).toBe(legacyContribId(b));
    b.totals.attempts = 1;
    expect(legacyContribId(a)).not.toBe(legacyContribId(b));
  });
});
