"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { staggerStyle } from "@/lib/motion";
import { completedPerPhase } from "@/features/stats/aggregate";
import { useData } from "@/features/storage/store";
import { LESSONS, PHASES, lessonsOfPhase } from "./curriculum";
import styles from "./LessonList.module.css";
import { nextUp } from "./overview";

export function LessonList() {
  const { lessons: progress } = useData();
  const counts = completedPerPhase(
    LESSONS,
    progress,
    PHASES.map((p) => p.id),
  );
  const next = nextUp(progress)?.id;

  return (
    <div id="lessons">
      {PHASES.map((phase, i) => {
        const { completed, total } = counts[i];
        return (
          <section
            key={phase.id}
            className={`${styles.band} enter`}
            style={staggerStyle(i * 2)}
            id={phase.slug}
            aria-labelledby={`${phase.slug}-h`}
          >
            <header className={styles.head}>
              <span className={`${styles.num} mono`}>{String(phase.id).padStart(2, "0")}</span>
              <h2 id={`${phase.slug}-h`} className={styles.name}>
                {phase.title}
              </h2>
              <p className={styles.desc}>{phase.description}</p>
              <p className={styles.count}>
                {completed} / {total} passed
              </p>
              <div className={styles.bar} aria-hidden="true">
                <span style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
              </div>
            </header>
            <ul className={styles.list}>
              {lessonsOfPhase(phase.id).map((lesson) => {
                const p = progress[lesson.id];
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/lesson/${lesson.id}/`}
                      className={styles.row}
                      data-next={lesson.id === next || undefined}
                    >
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
          </section>
        );
      })}
    </div>
  );
}
