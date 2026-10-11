"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { LANG_LABEL, LANGS, type Corpus, type Lang } from "@/features/content/types";
import { engineConfigOf, type TestMode } from "@/features/settings/settings";
import { useKeySound } from "@/features/sound/useKeySound";
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

type ModeKind = TestMode["kind"] | "zen";
const MODE_OPTIONS: readonly { value: ModeKind; label: string }[] = [
  { value: "time", label: "time" },
  { value: "words", label: "words" },
  { value: "zen", label: "zen" },
];

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

const DEFAULT_TIME: TestMode = { kind: "time", value: 30 };
const DEFAULT_WORDS: TestMode = { kind: "words", value: 25 };

export function TestRunner() {
  const router = useRouter();
  const settings = useSettings();
  const hydrated = useHydrated();
  const hasKeyboard = useHasPhysicalKeyboard();
  const corpus = useCorpus(settings.lang);
  const [seed, setSeed] = useState(randomSeed);
  const [now, setNow] = useState(0);
  const mode = settings.testMode;

  const { kind, value } = mode;
  const text = useMemo(
    () =>
      corpus && hydrated ? testText(corpus, { kind, value } as TestMode, createRng(seed)) : null,
    [corpus, hydrated, kind, value, seed],
  );
  const restart = useCallback(() => setSeed(randomSeed()), []);
  const chooseMode = (kind: ModeKind): void => {
    if (kind === "zen") router.push("/zen/");
    else if (kind !== mode.kind)
      updateSettings({ testMode: kind === "time" ? DEFAULT_TIME : DEFAULT_WORDS });
  };
  const onKey = useKeySound(settings);
  const { session, state, pressed } = useTypingSession({
    text,
    config: engineConfigOf(settings),
    onRestart: restart,
    onFail: restart,
    limitMs: mode.kind === "time" ? mode.value * 1000 : null,
    onKey,
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
    }, 50);
    return () => window.clearInterval(id);
  }, [limitMs, state.startedAt, state.status, session]);

  if (!hasKeyboard) return <NeedsKeyboard />;

  const typedWords = state.target.slice(0, state.entries.length).split(" ").length - 1;
  const status =
    limitMs !== null
      ? `${Math.max(0, Math.ceil((limitMs - (state.startedAt === null ? 0 : now)) / 1000))}s`
      : `${typedWords} / ${mode.value} words`;

  const remaining =
    limitMs === null
      ? null
      : Math.max(0, Math.ceil((limitMs - (state.startedAt === null ? 0 : now)) / 1000));

  return (
    <div>
      <div className={styles.modes} data-running={state.status === "running" || undefined}>
        <Segmented<ModeKind>
          variant="pill"
          label="test mode"
          value={mode.kind}
          options={MODE_OPTIONS}
          onChange={chooseMode}
        />
        {mode.kind === "time" ? (
          <Segmented<number>
            variant="pill"
            label="time limit"
            value={mode.value}
            options={TIMES.map((t) => ({ value: t, label: `${t}s` }))}
            onChange={(value) => updateSettings({ testMode: { kind: "time", value } as TestMode })}
          />
        ) : (
          <Segmented<number>
            variant="pill"
            label="word count"
            value={mode.value}
            options={WORDS.map((w) => ({ value: w, label: `${w} words` }))}
            onChange={(value) => updateSettings({ testMode: { kind: "words", value } as TestMode })}
          />
        )}
        <Segmented<Lang>
          variant="pill"
          label="text language"
          value={settings.lang}
          options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
          onChange={(lang) => updateSettings({ lang })}
        />
      </div>
      {remaining !== null && (
        <div
          className={styles.countdown}
          data-running={state.status === "running" || undefined}
          role="timer"
          aria-label={`${remaining} seconds left`}
        >
          {remaining}
        </div>
      )}
      <TypingScreen
        state={state}
        settings={settings}
        pressed={pressed}
        showKeyboard={settings.keyboard === "always"}
        title="free test"
        status={text ? status : "loading"}
      />
    </div>
  );
}
