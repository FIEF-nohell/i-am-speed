"use client";

import { ArrowRight, ChevronLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { slowestKeys } from "@/features/engine/metrics";
import { KeyboardGuide } from "@/features/keyboard/KeyboardGuide";
import { LESSON_BY_ID, nextLesson } from "@/features/lessons/curriculum";
import { PASS_ACCURACY } from "@/features/lessons/types";
import { formatDuration } from "@/features/stats/aggregate";
import { useData, useHydrated } from "@/features/storage/store";
import { heatByCode } from "./heat";
import { WpmChart } from "./WpmChart";
import styles from "./ResultsView.module.css";

const f1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

export function ResultsView() {
  const { lastResult: result } = useData();
  const hydrated = useHydrated();
  const router = useRouter();
  const heat = useMemo(() => (result ? heatByCode(result.perKey) : {}), [result]);

  const sourceId = result?.attempt.source;
  const nextId = sourceId ? nextLesson(sourceId)?.id : undefined;
  const retryTo = sourceId && LESSON_BY_ID.has(sourceId) ? `/lesson/${sourceId}/` : "/test/";

  // Enter continues (next lesson, or the test again); Tab or Escape retries.
  useEffect(() => {
    if (!sourceId) return;
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(t.tagName)
      )
        return;
      if (e.key === "Enter") router.push(nextId ? `/lesson/${nextId}/` : retryTo);
      else if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        router.push(retryTo);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourceId, nextId, retryTo, router]);

  if (!hydrated) return <div style={{ minHeight: "30rem" }} />;
  if (!result) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">no result yet</h1>
        <p className="page-lede">Finish a lesson or a test and the details will show up here.</p>
        <ButtonLink href="/" variant="primary">
          pick a lesson
        </ButtonLink>
      </div>
    );
  }

  const { attempt } = result;
  const lesson = LESSON_BY_ID.get(attempt.source);
  const next = lesson ? nextLesson(lesson.id) : undefined;
  const retryHref = lesson ? `/lesson/${lesson.id}/` : "/test/";
  const slow = slowestKeys(result.perKey, 5);
  const hasErrors = Object.keys(heat).length > 0;

  return (
    <div>
      <p className={styles.kicker}>{lesson ? lesson.title : "free test"}</p>
      <h1 className={styles.verdict} data-pass={lesson ? attempt.passed : undefined}>
        {lesson
          ? attempt.passed
            ? "passed"
            : `not yet, ${PASS_ACCURACY}% accuracy needed`
          : "done"}
      </h1>

      <dl className={styles.stats}>
        <Stat size="lead" accent label="speed" value={f1(attempt.netWpm)} unit="wpm" />
        <Stat size="lead" label="accuracy" value={f1(attempt.accuracy)} unit="%" />
        <Stat label="raw" value={f1(attempt.rawWpm)} unit="wpm" />
        <Stat label="consistency" value={`${Math.round(attempt.consistency)}`} unit="%" />
        <Stat label="time" value={formatDuration(attempt.durationMs)} />
        <Stat label="errors" value={`${attempt.errors}`} />
      </dl>

      <div className={styles.actions}>
        <ButtonLink
          href={retryHref}
          variant={attempt.passed || !lesson ? "quiet" : "primary"}
          icon={<RotateCcw />}
        >
          retry
        </ButtonLink>
        {next && (
          <ButtonLink
            href={`/lesson/${next.id}/`}
            variant={attempt.passed ? "primary" : "quiet"}
            icon={<ArrowRight />}
          >
            next lesson
          </ButtonLink>
        )}
        <ButtonLink href="/" icon={<ChevronLeft />}>
          back to list
        </ButtonLink>
      </div>

      <Section title="over time">
        <WpmChart series={result.series} />
      </Section>

      <Section
        title="where it went wrong"
        description={
          hasErrors
            ? "Darker red means a higher error rate on that key."
            : "No errors. Nothing to show."
        }
      >
        {hasErrors && (
          <KeyboardGuide colorByFinger={false} heat={heat} label="keyboard error heatmap" />
        )}
      </Section>

      {slow.length > 0 && (
        <Section title="slowest keys">
          <ul className={styles.slow}>
            {slow.map((s) => (
              <li key={s.key}>
                <kbd className="mono">{s.key}</kbd>
                <span className="mono">{Math.round(s.ms)} ms</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
