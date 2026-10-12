"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { useKeySound } from "@/features/sound/useKeySound";
import { commitAttempt, useSettings } from "@/features/storage/store";
import { ZEN_SOURCE } from "@/features/storage/source";
import { setFocusMode } from "@/lib/focusMode";
import { FreeText } from "./FreeText";
import { NeedsKeyboard } from "./NeedsKeyboard";
import { useFreeTypeSession } from "./useFreeTypeSession";
import { useHasPhysicalKeyboard } from "./usePhysicalKeyboard";
import styles from "./ZenRunner.module.css";

/** Idle gaps longer than this do not count toward the session time. */
const PAUSE_MS = 5000;
/** How long the finish button stays after the mouse moves. */
const REVEAL_MS = 2000;
/** A session is saved only when at least one word (five characters) is left in the text. */
const MIN_CHARS = 5;

export function ZenRunner() {
  const router = useRouter();
  const settings = useSettings();
  const hasKeyboard = useHasPhysicalKeyboard();
  const [reveal, setReveal] = useState(false);

  const finishRef = useRef<() => void>(() => undefined);
  const onEscape = useCallback(() => finishRef.current(), []);
  const onKey = useKeySound(settings);
  const { session, state } = useFreeTypeSession({ onEscape, onKey, pauseAfterMs: PAUSE_MS });
  const running = state.status === "running";

  useEffect(() => {
    finishRef.current = () => {
      const current = session.getState();
      if (current.status === "finished") return;
      if (current.status === "running" && current.chars >= MIN_CHARS) {
        session.finish();
        commitAttempt({
          source: ZEN_SOURCE,
          lang: settings.lang,
          text: session.getState().text,
          metrics: session.metrics(),
          at: Date.now(),
        });
        setFocusMode(null);
        router.push("/results/");
        return;
      }
      setFocusMode(null);
      router.push("/test/");
    };
  }, [session, router, settings.lang]);

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
      <p className={styles.line}>start typing, anything you like. esc to finish.</p>
      <FreeText text={state.text} status={state.status} caret={settings.caret} />
      <p className={styles.hints}>
        <span>
          <Kbd>esc</Kbd> finish
        </span>
      </p>
    </div>
  );
}
