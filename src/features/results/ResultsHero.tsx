import { ArrowRight, ListChecks, RotateCcw } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { LESSON_BY_ID, nextLesson } from "@/features/lessons/curriculum";
import { PASS_ACCURACY } from "@/features/lessons/types";
import { formatDuration } from "@/features/stats/aggregate";
import type { LastResult } from "@/features/storage/schema";
import { retryHref, sourceKind, sourceLabel } from "@/features/storage/source";
import { AnimatedStat } from "./AnimatedStat";
import styles from "./ResultsHero.module.css";

/** Words typed in a session: whitespace separated chunks of the typed text. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function verdictOf(
  kind: ReturnType<typeof sourceKind>,
  passed: boolean,
): { text: string; pass: boolean | undefined } {
  if (kind === "zen") return { text: "session saved", pass: undefined };
  if (kind === "test") return { text: "done", pass: undefined };
  return passed
    ? { text: "passed", pass: true }
    : { text: `not yet, ${PASS_ACCURACY}% accuracy needed`, pass: false };
}

/** Headline panel: what this was, the verdict, the two lead figures, the strip and the actions. */
export function ResultsHero({ result }: { result: LastResult }) {
  const { attempt } = result;
  const kind = sourceKind(attempt.source);
  const lesson = LESSON_BY_ID.get(attempt.source);
  const next = kind === "lesson" && lesson ? nextLesson(lesson.id) : undefined;
  const retry = retryHref(attempt.source);
  const verdict = verdictOf(kind, attempt.passed);
  const nextIsPrimary = Boolean(next && attempt.passed);

  return (
    <Panel as="div" className={styles.hero}>
      <p className={styles.eyebrow}>{sourceLabel(attempt.source)}</p>
      <h1 className={styles.verdict} data-pass={verdict.pass}>
        {verdict.text}
      </h1>

      <dl className={styles.lead}>
        <AnimatedStat size="lead" accent label="speed" target={attempt.netWpm} unit="wpm" />
        <AnimatedStat
          size="lead"
          label="accuracy"
          target={attempt.accuracy}
          unit="%"
          delayMs={120}
        />
      </dl>

      <dl className={styles.strip}>
        <AnimatedStat label="raw" target={attempt.rawWpm} unit="wpm" delayMs={240} />
        <AnimatedStat
          label="consistency"
          target={Math.round(attempt.consistency)}
          decimals={0}
          unit="%"
          delayMs={360}
        />
        <Stat label="time" value={formatDuration(attempt.durationMs)} />
        <Stat label="errors" value={`${attempt.errors}`} />
        {kind === "zen" && <Stat label="words" value={`${countWords(result.text)}`} />}
      </dl>

      <div className={styles.actions}>
        {nextIsPrimary && next ? (
          <>
            <ButtonLink href={`/lesson/${next.id}/`} variant="primary" icon={<ArrowRight />}>
              next lesson
            </ButtonLink>
            <ButtonLink href={retry} variant="secondary" icon={<RotateCcw />}>
              retry
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink href={retry} variant="primary" icon={<RotateCcw />}>
              retry
            </ButtonLink>
            {next && (
              <ButtonLink href={`/lesson/${next.id}/`} variant="secondary" icon={<ArrowRight />}>
                next lesson
              </ButtonLink>
            )}
          </>
        )}
        <ButtonLink href="/" variant="ghost" icon={<ListChecks />}>
          lessons
        </ButtonLink>
        <p className={styles.hints}>
          <span>
            <Kbd>enter</Kbd> {next ? "next" : "retry"}
          </span>
          <span>
            <Kbd>tab</Kbd> retry
          </span>
        </p>
      </div>
    </Panel>
  );
}
