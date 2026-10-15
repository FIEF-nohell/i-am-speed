"use client";

import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { PageHeader } from "@/components/ui/PageHeader";
import { LessonList } from "@/features/lessons/LessonList";
import { PHASES } from "@/features/lessons/curriculum";
import { nextUp } from "@/features/lessons/overview";
import { useData } from "@/features/storage/store";
import styles from "./HomeView.module.css";
import { ProfileSidebar } from "./ProfileSidebar";

function NextUp() {
  const { lessons } = useData();
  const lesson = nextUp(lessons);
  if (!lesson) {
    return (
      <p className={styles.done}>
        Every lesson is passed. Keep it sharp with a test or a game of rain.
      </p>
    );
  }
  const phase = PHASES.find((p) => p.id === lesson.phase);
  const keys = [...lesson.newChars].filter((c) => c !== " ");
  return (
    <div className={styles.next}>
      <div className={styles.nextText}>
        <p className={styles.eyebrow}>next up</p>
        <p className={styles.nextTitle}>
          {phase?.title} <span aria-hidden="true">/</span> {lesson.title}
        </p>
        <p className={styles.nextDesc}>{lesson.description}</p>
        {keys.length > 0 && (
          <p className={styles.keys} aria-label="new keys">
            {keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </p>
        )}
      </div>
      <ButtonLink
        href={`/lesson/${lesson.id}/`}
        variant="primary"
        icon={<ArrowRight aria-hidden="true" />}
      >
        start
      </ButtonLink>
    </div>
  );
}

export function HomeView() {
  return (
    <div className={`page-full ${styles.home}`}>
      <div className={styles.main}>
        <PageHeader
          title="learn to type with ten fingers"
          lede="Every lesson is open. Pick one, start typing, and the keyboard shows you which finger goes where. Passing means 95% accuracy."
        />
        <NextUp />
        <LessonList />
      </div>
      <div className={styles.side}>
        <ProfileSidebar />
      </div>
    </div>
  );
}
