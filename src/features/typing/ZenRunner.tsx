"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import type { EngineState } from "@/features/engine/types";
import { engineConfigOf } from "@/features/settings/settings";
import { useKeySound } from "@/features/sound/useKeySound";
import { useHydrated, useSettings } from "@/features/storage/store";
import { ZEN_SOURCE } from "@/features/storage/source";
import { setFocusMode } from "@/lib/focusMode";
import { createRng, randomSeed } from "@/lib/rng";
import { NeedsKeyboard } from "./NeedsKeyboard";
import { TypingText } from "./TypingText";
import { useCorpus } from "./useCorpus";
import { useFinish } from "./useFinish";
import { useHasPhysicalKeyboard } from "./usePhysicalKeyboard";
import { useTypingSession } from "./useTypingSession";
import { createZenStream } from "./zenText";
import styles from "./ZenRunner.module.css";

/** Untyped characters kept ahead of the caret; the text is extended when it drops below this. */
const MIN_AHEAD = 400;
const INITIAL_CHARS = 600;
const CHUNK_CHARS = 300;
/** Idle gaps longer than this do not count toward the session time. */
const PAUSE_MS = 5000;
/** How long the finish button stays after the mouse moves. */
const REVEAL_MS = 2000;
/** A session is saved only when at least one word (five characters) was typed correctly. */
const MIN_CORRECT = 5;

const worthSaving = (s: EngineState): boolean =>
  s.entries.filter((e) => e.correct).length >= MIN_CORRECT;

export function ZenRunner() {
  const router = useRouter();
  const settings = useSettings();
  const hydrated = useHydrated();
  const hasKeyboard = useHasPhysicalKeyboard();
  const corpus = useCorpus(settings.lang);
  const [seed, setSeed] = useState(randomSeed);
  const [reveal, setReveal] = useState(false);

  // The initial text stays fixed for a run; later text is appended to the session, not passed in.
  const run = useMemo(() => {
    if (!corpus || !hydrated) return null;
    const stream = createZenStream(corpus, createRng(seed));
    return { stream, text: stream.next(INITIAL_CHARS) };
  }, [corpus, hydrated, seed]);

  const restart = useCallback(() => setSeed(randomSeed()), []);
  const finishRef = useRef<() => void>(() => undefined);
  const onEscape = useCallback(() => finishRef.current(), []);
  const onKey = useKeySound(settings);

  const config = engineConfigOf(settings);
  const { session, state } = useTypingSession({
    text: run?.text ?? null,
    // Failing a session on mistakes makes no sense for endless text.
    config: config.onError === "restartAfterN" ? { ...config, onError: "continue" } : config,
    onRestart: restart,
    onEscape,
    onKey,
    open: true,
    pauseAfterMs: PAUSE_MS,
    runId: 0,
  });
  const running = state.status === "running";
  const finished = state.status === "finished";
  useFinish({
    state,
    source: ZEN_SOURCE,
    lang: settings.lang,
    text: finished ? state.target.slice(0, state.entries.length) : undefined,
  });

  useEffect(() => {
    finishRef.current = () => {
      const current = session?.getState();
      if (session && current?.status === "running" && worthSaving(current)) {
        session.finish();
        return;
      }
      setFocusMode(null);
      router.push("/test/");
    };
  }, [session, router]);

  // Keep text ahead of the caret. Runs after commit, never inside the key handler.
  const targetLength = state.target.length;
  const typed = state.entries.length;
  useEffect(() => {
    if (session && run && targetLength > 0 && targetLength - typed < MIN_AHEAD) {
      session.extend(run.stream.next(CHUNK_CHARS));
    }
  }, [session, run, targetLength, typed]);

  useEffect(() => {
    if (!running) return;
    setFocusMode("zen");
    return () => setFocusMode(null);
  }, [running]);

  // Moving the mouse shows the finish button for a moment.
  useEffect(() => {
    if (!running) return;
    let timer = 0;
    const move = (): void => {
      setReveal(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setReveal(false), REVEAL_MS);
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      window.clearTimeout(timer);
      setReveal(false);
    };
  }, [running]);

  if (!hasKeyboard) return <NeedsKeyboard />;

  return (
    <div className={styles.zen} data-running={running || undefined}>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        icon={<X size={16} strokeWidth={1.75} aria-hidden="true" />}
        aria-label="finish"
        className={styles.finish}
        data-visible={(running && reveal) || undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => finishRef.current()}
      />
      <p className={styles.line}>zen. no timer, no word count.</p>
      <TypingText state={state} caret={settings.caret} windowed />
      <p className={styles.hints}>
        <span className={styles.esc}>
          <Kbd>esc</Kbd> finish
        </span>
        <span className={styles.tab}>
          <Kbd>tab</Kbd> new text
        </span>
      </p>
    </div>
  );
}
