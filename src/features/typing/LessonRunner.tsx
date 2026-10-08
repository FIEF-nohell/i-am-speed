"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import { LANG_LABEL, LANGS, type Lang } from "@/features/content/types";
import { LESSON_BY_ID, PHASES } from "@/features/lessons/curriculum";
import { generateLessonText } from "@/features/lessons/generate";
import { engineConfigOf, keyboardVisible } from "@/features/settings/settings";
import { updateSettings, useHydrated, useSettings } from "@/features/storage/store";
import { createRng, randomSeed } from "@/lib/rng";
import { NeedsKeyboard } from "./NeedsKeyboard";
import { TypingScreen } from "./TypingScreen";
import { useCorpus } from "./useCorpus";
import { useFinish } from "./useFinish";
import { useHasPhysicalKeyboard } from "./usePhysicalKeyboard";
import { useTypingSession } from "./useTypingSession";
import styles from "./Runner.module.css";

export function LessonRunner({ lessonId }: { lessonId: string }) {
  const lesson = LESSON_BY_ID.get(lessonId);
  const settings = useSettings();
  const hydrated = useHydrated();
  const hasKeyboard = useHasPhysicalKeyboard();
  const corpus = useCorpus(settings.lang);
  const [seed, setSeed] = useState(randomSeed);
  const [runId, setRunId] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const text = useMemo(
    () =>
      lesson && corpus && hydrated ? generateLessonText(lesson, corpus, createRng(seed)) : null,
    [lesson, corpus, hydrated, seed],
  );

  const restart = useCallback(() => {
    setSeed(randomSeed());
    setNotice(null);
  }, []);

  // Restart after N mistakes: same text, fresh attempt, no waiting.
  const onFail = useCallback(() => {
    setNotice(`${settings.restartAfter} mistakes, starting over`);
    setRunId((r) => r + 1);
  }, [settings.restartAfter]);

  const { state, pressed } = useTypingSession({
    text,
    config: engineConfigOf(settings),
    onRestart: restart,
    onFail,
    runId,
  });
  useFinish({ state, source: lessonId, lang: settings.lang });

  if (!lesson) return null;
  const phase = PHASES.find((p) => p.id === lesson.phase);
  if (!hasKeyboard) return <NeedsKeyboard />;

  return (
    <div>
      <div className={styles.back}>
        <Link href="/">
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> lessons
        </Link>
      </div>
      <TypingScreen
        state={state}
        settings={settings}
        pressed={pressed}
        showKeyboard={keyboardVisible(settings, lesson.phase)}
        notice={notice}
        title={
          <>
            {phase?.title} <span aria-hidden="true">/</span> {lesson.title}
          </>
        }
        status={text ? `${state.entries.length} / ${state.target.length}` : "loading"}
        footer={
          <div className={styles.quick}>
            <Segmented<Lang>
              label="text language"
              value={settings.lang}
              options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
              onChange={(lang) => updateSettings({ lang })}
            />
            <label className={styles.toggle}>
              keyboard
              <Toggle
                label="show keyboard"
                checked={settings.keyboard !== "never"}
                onChange={(on) => updateSettings({ keyboard: on ? "phases1to8" : "never" })}
              />
            </label>
          </div>
        }
      />
    </div>
  );
}
