import { LESSON_BY_ID } from "@/features/lessons/curriculum";

/** Attempt source id for endless zen sessions. Never a lesson. */
export const ZEN_SOURCE = "zen";

const TEST_PREFIX = "test:";

export type SourceKind = "lesson" | "test" | "zen";

/** Classifies an attempt source: "zen", "test:<mode>-<value>", or anything else is a lesson id. */
export function sourceKind(source: string): SourceKind {
  if (source === ZEN_SOURCE) return "zen";
  if (source.startsWith(TEST_PREFIX)) return "test";
  return "lesson";
}

function testLabel(source: string): string {
  const match = /^test:(time|words)-(\d+)$/.exec(source);
  if (!match) return "free test";
  return match[1] === "time" ? `free test, ${match[2]}s` : `free test, ${match[2]} words`;
}

/** Human label: the lesson title, "free test, 30s", "free test, 25 words" or "zen". */
export function sourceLabel(source: string): string {
  switch (sourceKind(source)) {
    case "zen":
      return "zen";
    case "test":
      return testLabel(source);
    case "lesson":
      return LESSON_BY_ID.get(source)?.title ?? source;
  }
}

/** Where "retry" goes for an attempt. Unknown lesson ids fall back to the free test. */
export function retryHref(source: string): string {
  switch (sourceKind(source)) {
    case "zen":
      return "/zen/";
    case "lesson":
      return LESSON_BY_ID.has(source) ? `/lesson/${source}/` : "/test/";
    case "test":
      return "/test/";
  }
}
