"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { Stat } from "@/components/ui/Stat";
import { keyLikeFromEvent, resolveKey } from "@/features/engine/input";
import { useKeySound } from "@/features/sound/useKeySound";
import { useSettings } from "@/features/storage/store";
import { NeedsKeyboard } from "@/features/typing/NeedsKeyboard";
import { useCorpus } from "@/features/typing/useCorpus";
import { useHasPhysicalKeyboard } from "@/features/typing/usePhysicalKeyboard";
import { isFormTarget } from "@/features/typing/useTypingSession";
import { createRng, randomSeed } from "@/lib/rng";
import { readBest, useBest, writeBest } from "./best";
import { RainEngine, START_LIVES, multiplierFor, tierAt } from "./engine";
import styles from "./RainGame.module.css";
import { TIERS, buildTierPools } from "./words";

const PLACEHOLDER_POOL = [["tag"]];

export function RainGame() {
  const settings = useSettings();
  const hasKeyboard = useHasPhysicalKeyboard();
  const corpus = useCorpus(settings.lang);
  const onKey = useKeySound(settings);
  const pools = useMemo(() => (corpus ? buildTierPools(corpus) : null), [corpus]);
  const ready = pools !== null;
  const engine = useMemo(
    () => new RainEngine(pools ?? PLACEHOLDER_POOL, createRng(randomSeed())),
    [pools],
  );
  const view = useSyncExternalStore(
    engine.subscribe,
    () => engine.state,
    () => engine.state,
  );
  const stored = useBest();
  const soundRef = useRef(onKey);
  useEffect(() => {
    soundRef.current = onKey;
  }, [onKey]);

  // Game loop: one animation frame at a time, only while a run is going. The engine notifies React.
  const running = view.status === "running";
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number): void => {
      engine.tick((now - last) / 1000);
      last = now;
      if (engine.state.status === "running") frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, running]);

  // Save a new best once a run ends.
  const over = view.status === "over";
  const finalScore = view.score;
  useEffect(() => {
    if (over && finalScore > readBest()) writeBest(finalScore);
  }, [over, finalScore]);

  useEffect(() => {
    if (!ready) return;
    const down = (e: KeyboardEvent): void => {
      if (isFormTarget(e.target)) return;
      const state = engine.state;
      if (e.key === "Escape") {
        if (state.status !== "running") return;
        e.preventDefault();
        engine.end();
        return;
      }
      if (e.key === "Tab") {
        if (state.status === "running") e.preventDefault();
        return;
      }
      if (e.key === "Enter" && state.status !== "running") {
        e.preventDefault();
        engine.start(readBest());
        return;
      }
      if (state.status !== "running") return;
      const input = resolveKey(keyLikeFromEvent(e));
      if (input.kind === "backspace") {
        e.preventDefault();
        return;
      }
      if (input.kind !== "char") return;
      e.preventDefault();
      if (e.repeat) return;
      const result = engine.press(input.char);
      if (result === "ignored") return;
      soundRef.current?.(result === "mistake" ? "error" : "key");
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [engine, ready]);

  if (!hasKeyboard) return <NeedsKeyboard />;

  const s = view;
  const best = Math.max(stored, s.score);
  const newBest = s.status === "over" && s.score > s.bestAtStart;
  const tier = tierAt(s.elapsed, TIERS.length) + 1;
  const accuracy =
    s.keystrokes > 0 ? Math.round(((s.keystrokes - s.mistakes) / s.keystrokes) * 100) : 100;

  return (
    <div className={styles.rain}>
      <div className={styles.hud} data-running={running || undefined}>
        <div className={styles.lives} role="img" aria-label={`${s.lives} lives left`}>
          {Array.from({ length: START_LIVES }, (_, i) => (
            <span key={i} className={styles.life} data-lost={i >= s.lives} />
          ))}
        </div>
        <dl className={styles.stats}>
          <Stat label="score" value={String(s.score)} size="tile" accent />
          <Stat label="level" value={String(tier)} size="tile" />
          <Stat label="combo" value={`x${multiplierFor(s.combo)}`} size="tile" />
          <Stat label="best" value={String(best)} size="tile" />
        </dl>
      </div>

      <div
        className={styles.field}
        role="region"
        aria-label="falling words"
        data-running={running || undefined}
      >
        {s.mistakeTick > 0 && <span key={`m${s.mistakeTick}`} className={styles.flash} />}
        {s.missTick > 0 && (
          <span key={`l${s.missTick}`} className={styles.flash} data-kind="life" />
        )}
        {s.words.map((w) => {
          const locked = w.id === s.lockedId;
          const typed = locked ? s.typed : 0;
          return (
            <span
              key={w.id}
              className={`${styles.word} mono`}
              data-locked={locked || undefined}
              style={{
                left: `${w.x * 100}%`,
                top: `${w.y * 100}%`,
                transform: `translateX(-${w.x * 100}%)`,
              }}
            >
              <span className={styles.done}>{w.text.slice(0, typed)}</span>
              {w.text.slice(typed)}
            </span>
          );
        })}

        {s.status !== "running" && (
          <div className={styles.overlay}>
            {s.status === "over" ? (
              <>
                <h1 className={styles.title}>game over</h1>
                <dl className={styles.summary}>
                  <Stat label="score" value={String(s.score)} size="lead" accent />
                  <Stat label="words" value={String(s.cleared)} />
                  <Stat label="accuracy" value={String(accuracy)} unit="%" />
                  <Stat label="level" value={String(tier)} />
                </dl>
                {newBest && <p className={styles.note}>new best score</p>}
              </>
            ) : (
              <>
                <h1 className={styles.title}>rain</h1>
                <p className={styles.note}>
                  Words fall and get faster. Type a word to clear it. A wrong key sends the word
                  back to its first letter. Miss five and it is over.
                </p>
              </>
            )}
            {ready ? (
              <p className={styles.hint}>
                <Kbd>enter</Kbd> {s.status === "over" ? "play again" : "start"}
              </p>
            ) : (
              <p className={styles.hint} role="status">
                loading words
              </p>
            )}
          </div>
        )}
      </div>

      <p className={styles.hints} data-running={running || undefined}>
        <span>
          <Kbd>esc</Kbd> end run
        </span>
      </p>
    </div>
  );
}
