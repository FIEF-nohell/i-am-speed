"use client";

import type { ReactNode } from "react";
import { HandDiagram } from "@/components/icons/HandDiagram";
import { FINGER_LABEL } from "@/features/keyboard/layout/atQwertz";
import { KeyboardGuide } from "@/features/keyboard/KeyboardGuide";
import { targetFor } from "@/features/keyboard/target";
import type { EngineState } from "@/features/engine/types";
import type { Settings } from "@/features/settings/settings";
import { TypingText } from "./TypingText";
import styles from "./TypingScreen.module.css";

interface Props {
  state: EngineState;
  settings: Settings;
  pressed: ReadonlySet<string>;
  showKeyboard: boolean;
  /** Left of the info bar: lesson name or test mode. */
  title: ReactNode;
  /** Right of the info bar: progress or countdown. */
  status: ReactNode;
  /** Below the board: quick settings. */
  footer?: ReactNode;
  notice?: string | null;
}

export function TypingScreen({
  state,
  settings,
  pressed,
  showKeyboard,
  title,
  status,
  footer,
  notice,
}: Props) {
  const nextChar = state.target[state.entries.length] ?? null;
  const target = settings.highlightNext ? targetFor(nextChar) : null;
  const finger = nextChar ? (targetFor(nextChar)?.finger ?? null) : null;

  return (
    <div className={styles.screen}>
      <div className={styles.bar}>
        <div className={styles.title}>{title}</div>
        <div className={styles.status} aria-live="off">
          {status}
        </div>
      </div>

      <TypingText state={state} caret={settings.caret} />

      <p className={styles.notice} role="status">
        {notice ?? (state.status === "idle" ? "start typing" : " ")}
      </p>

      {showKeyboard && (
        <div className={styles.guide}>
          <KeyboardGuide
            next={target?.codes}
            pressed={pressed}
            colorByFinger={settings.colorByFinger}
            label="on-screen Austrian keyboard"
          />
          {settings.fingerHint && (
            <div className={styles.hint}>
              <HandDiagram
                active={finger}
                label={finger ? `use your ${FINGER_LABEL[finger]}` : "hands"}
              />
              <p>{finger ? targetFor(nextChar)?.hint : " "}</p>
            </div>
          )}
        </div>
      )}

      <div className={styles.footer}>
        {footer}
        <span className={styles.keys}>
          <kbd>tab</kbd> restart
        </span>
      </div>
    </div>
  );
}
