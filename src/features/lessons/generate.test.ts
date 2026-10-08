import { describe, expect, it } from "vitest";
import { readCorpus } from "@/test/corpus";
import { LANGS } from "@/features/content/types";
import { isTypeable } from "@/features/keyboard/layout/atQwertz";
import { createRng } from "@/lib/rng";
import { LESSONS, LESSON_BY_ID, PHASES } from "./curriculum";
import { generateLessonText } from "./generate";

describe("curriculum", () => {
  it("has unique stable ids and every phase has lessons", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const p of PHASES) expect(LESSONS.some((l) => l.phase === p.id), `phase ${p.id}`).toBe(true);
  });

  it("allowed sets are typeable and contain their new chars", () => {
    for (const l of LESSONS) {
      for (const ch of l.chars) expect(isTypeable(ch), `${l.id} ${ch}`).toBe(true);
      for (const ch of l.newChars) expect(l.chars.includes(ch), `${l.id} new ${ch}`).toBe(true);
    }
  });

  it("starts with exactly f j and space, then grows", () => {
    expect([...LESSON_BY_ID.get("home-01")!.chars].sort().join("")).toBe(" fj");
    expect(LESSON_BY_ID.get("home-02")!.chars).toContain("dk");
  });
});

describe("lesson generation", () => {
  for (const lang of LANGS) {
    const corpus = readCorpus(lang);
    it(`never leaves the allowed set and fills the target (${lang})`, () => {
      for (const lesson of LESSONS) {
        const allowed = new Set(lesson.chars);
        for (let seed = 1; seed <= 6; seed++) {
          const text = generateLessonText(lesson, corpus, createRng(seed * 7919));
          expect(text.length, `${lesson.id} empty`).toBeGreaterThan(0);
          expect(text.length, `${lesson.id} too short`).toBeGreaterThanOrEqual(Math.min(lesson.lengthTarget * 0.6, 40));
          expect(text, `${lesson.id} double space`).not.toMatch(/ {2}/);
          expect(text).toBe(text.trim());
          for (const ch of text) expect(allowed.has(ch), `${lesson.id} (${lang}) has "${ch}"`).toBe(true);
        }
      }
    });
  }

  it("is deterministic for a seed and varies across seeds", () => {
    const corpus = readCorpus("de");
    const lesson = LESSON_BY_ID.get("home-03")!;
    expect(generateLessonText(lesson, corpus, createRng(1))).toBe(generateLessonText(lesson, corpus, createRng(1)));
    expect(generateLessonText(lesson, corpus, createRng(1))).not.toBe(generateLessonText(lesson, corpus, createRng(2)));
  });

  it("prefers real words once enough exist", () => {
    const corpus = readCorpus("de");
    const text = generateLessonText(LESSON_BY_ID.get("home-07")!, corpus, createRng(3));
    const real = new Set(corpus.words.map((w) => w.toLowerCase()));
    const tokens = text.replace(/[.,-]/g, " ").split(" ").filter(Boolean);
    const hits = tokens.filter((t) => real.has(t)).length;
    expect(hits / tokens.length).toBeGreaterThan(0.8);
  });
});
