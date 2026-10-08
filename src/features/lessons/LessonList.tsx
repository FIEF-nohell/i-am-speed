"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { completedPerPhase } from "@/features/stats/aggregate";
import { useData } from "@/features/storage/store";
import { LESSONS, PHASES, lessonsOfPhase } from "./curriculum";
import styles from "./LessonList.module.css";

export function LessonList() {
  const { lessons: progress } = useData();
  const counts = completedPerPhase(
    LESSONS,
    progress,
    PHASES.map((p) => p.id),
  );

  return (
    <div>
      {PHASES.map((phase, i) => (
        <Section
          key={phase.id}
          id={phase.slug}
          title={`${phase.id}  ${phase.title}`}
          description={phase.description}
          aside={`${counts[i].completed} / ${counts[i].total}`}
        >
          <ul className={styles.list}>
            {lessonsOfPhase(phase.id).map((lesson) => {
              const p = progress[lesson.id];
              return (
                <li key={lesson.id}>
                  <Link href={`/lesson/${lesson.id}/`} className={styles.row}>
                    <span
                      className={styles.mark}
                      data-done={p?.completed || undefined}
                      aria-hidden="true"
                    >
                      {p?.completed && <Check size={12} strokeWidth={2.25} />}
                    </span>
                    <span className={styles.title}>{lesson.title}</span>
                    <span className={styles.meta}>
                      {p?.completed ? (
                        <span className="mono">{Math.round(p.bestWpm)} wpm</span>
                      ) : null}
                      {p?.completed && (
                        <span className="sr-only">
                          completed, best {Math.round(p.bestWpm)} words per minute
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
    </div>
  );
}
