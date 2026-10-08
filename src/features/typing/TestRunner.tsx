"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { LANG_LABEL, LANGS, type Corpus, type Lang } from "@/features/content/types";
import { engineConfigOf, type TestMode } from "@/features/settings/settings";
import { updateSettings, useHydrated, useSettings } from "@/features/storage/store";
import { createRng, pick, randomSeed, type Rng } from "@/lib/rng";
import { NeedsKeyboard } from "./NeedsKeyboard";
import { TypingScreen } from "./TypingScreen";
import { useCorpus } from "./useCorpus";
import { useFinish } from "./useFinish";
import { useHasPhysicalKeyboard } from "./usePhysicalKeyboard";
import { useTypingSession } from "./useTypingSession";
import styles from "./Runner.module.css";

const TIMES = [15, 30, 60] as const;
const WORDS = [10, 25, 50] as const;
const WORDS_PER_SECOND = 3.4;

export function testSource(mode: TestMode): string {
  return `test:${mode.kind}-${mode.value}`;
}

/** Common words in canonical case (German nouns keep their capital). */
export function testText(corpus: Corpus, mode: TestMode, rng: Rng): string {
  const count = mode.kind === "words" ? mode.value : Math.ceil(mode.value * WORDS_PER_SECOND) + 30;
  const pool = corpus.words.slice(0, 2500).filter((w) => w.length <= 10);
  const out: string[] = [];
  while (out.length < count) {
    const w = pick(rng, pool);
    if (out[out.length - 1] !== w) out.push(w);
  }
  return out.join(" ");
}

export function TestRunner() {
  const settings = useSettings();
  const hydrated = useHydrated();
  const hasKeyboard = useHasPhysicalKeyboard();
  const corpus = useCorpus(settings.lang);
  const [seed, setSeed] = useState(randomSeed);
  const [now, setNow] = useState(0);
  const mode = settings.testMode;

  const text = useMemo(
    () => (corpus && hydrated ? testText(corpus, mode, createRng(seed)) : null),
    [corpus, hydrated, mode, seed],
  );
  const restart = useCallback(() => setSeed(randomSeed()), []);
  const { session, state, pressed } = useTypingSession({
    text,
    config: engineConfigOf(settings),
    onRestart: restart,
    runId: 0,
  });
  useFinish({ state, source: testSource(mode), lang: settings.lang });

  // Countdown for timed tests. Runs on its own interval, never on the keystroke path.
  const limitMs = mode.kind === "time" ? mode.value * 1000 : null;
  useEffect(() => {
    if (limitMs === null || state.startedAt === null || state.status !== "running") return;
    const id = window.setInterval(() => {
      const elapsed = performance.now() - (state.startedAt ?? 0);
      setNow(elapsed);
      if (elapsed >= limitMs) session?.endAfter(limitMs);
    }, 100);
    return () => window.clearInterval(id);
  }, [limitMs, state.startedAt, state.status, session]);

  if (!hasKeyboard) return <NeedsKeyboard />;

  const typedWords = state.target.slice(0, state.entries.length).split(" ").length - 1;
  const status =
    limitMs !== null
      ? `${Math.max(0, Math.ceil((limitMs - (state.startedAt === null ? 0 : now)) / 1000))}s`
      : `${typedWords} / ${mode.value} words`;

  return (
    <div>
      <div className={styles.modes}>
        <Segmented<number>
          label="time limit"
          value={mode.kind === "time" ? mode.value : -1}
          options={TIMES.map((t) => ({ value: t, label: `${t}s` }))}
          onChange={(value) =>
            updateSettings({ testMode: { kind: "time", value: value as (typeof TIMES)[number] } })
          }
        />
        <Segmented<number>
          label="word count"
          value={mode.kind === "words" ? mode.value : -1}
          options={WORDS.map((w) => ({ value: w, label: `${w} words` }))}
          onChange={(value) =>
            updateSettings({ testMode: { kind: "words", value: value as (typeof WORDS)[number] } })
          }
        />
      </div>
      <TypingScreen
        state={state}
        settings={settings}
        pressed={pressed}
        showKeyboard={settings.keyboard === "always"}
        title="free test"
        status={text ? status : "loading"}
        footer={
          <Segmented<Lang>
            label="text language"
            value={settings.lang}
            options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
            onChange={(lang) => updateSettings({ lang })}
          />
        }
      />
    </div>
  );
}
