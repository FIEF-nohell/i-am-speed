import { describe, expect, it } from "vitest";
import { LESSONS } from "@/features/lessons/curriculum";
import { ZEN_SOURCE, retryHref, sourceKind, sourceLabel } from "./source";

describe("sourceKind", () => {
  it("recognises zen, tests and lessons", () => {
    expect(ZEN_SOURCE).toBe("zen");
    expect(sourceKind("zen")).toBe("zen");
    expect(sourceKind("test:time-30")).toBe("test");
    expect(sourceKind("test:words-10")).toBe("test");
    expect(sourceKind("home-01")).toBe("lesson");
  });
  it("treats near-misses as lessons, never as zen", () => {
    expect(sourceKind("zen2")).toBe("lesson");
    expect(sourceKind("Zen")).toBe("lesson");
    expect(sourceKind("")).toBe("lesson");
  });
});

describe("sourceLabel", () => {
  it("uses the lesson title for a known lesson", () => {
    const l = LESSONS[0];
    expect(sourceLabel(l.id)).toBe(l.title);
  });
  it("falls back to the raw id for an unknown lesson", () => {
    expect(sourceLabel("gone-99")).toBe("gone-99");
  });
  it("describes tests and zen", () => {
    expect(sourceLabel("test:time-30")).toBe("free test, 30s");
    expect(sourceLabel("test:words-25")).toBe("free test, 25 words");
    expect(sourceLabel("test:odd")).toBe("free test");
    expect(sourceLabel("zen")).toBe("zen");
  });
});

describe("retryHref", () => {
  it("routes each kind to its runner", () => {
    expect(retryHref("home-01")).toBe("/lesson/home-01/");
    expect(retryHref("test:time-15")).toBe("/test/");
    expect(retryHref("zen")).toBe("/zen/");
  });
  it("sends unknown lessons to the free test", () => {
    expect(retryHref("gone-99")).toBe("/test/");
  });
  it("every curriculum lesson routes to its own page", () => {
    for (const l of LESSONS) expect(retryHref(l.id)).toBe(`/lesson/${l.id}/`);
  });
});
