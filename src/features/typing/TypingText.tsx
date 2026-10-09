"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEAD, type EngineState } from "@/features/engine/types";
import type { CaretStyle } from "@/features/settings/settings";
import styles from "./TypingText.module.css";

interface Props {
  state: EngineState;
  caret: CaretStyle;
}

interface Word {
  start: number;
  chars: string[];
}

function splitWords(text: string): { words: Word[]; spaces: Set<number> } {
  const words: Word[] = [];
  const spaces = new Set<number>();
  let cur: Word | null = null;
  [...text].forEach((ch, i) => {
    if (ch === " ") {
      spaces.add(i);
      cur = null;
      return;
    }
    if (!cur) {
      cur = { start: i, chars: [] };
      words.push(cur);
    }
    cur.chars.push(ch);
  });
  return { words, spaces };
}

type CharState = "untyped" | "typed" | "wrong" | "current" | "error-pending";

function charState(state: EngineState, i: number): CharState {
  const pos = state.entries.length;
  if (i < pos) return state.entries[i].correct ? "typed" : "wrong";
  if (i === pos) {
    const last = state.keystrokes[state.keystrokes.length - 1];
    return last && !last.correct && last.pos === pos ? "error-pending" : "current";
  }
  return "untyped";
}

function TypingTextImpl({ state, caret }: Props) {
  const { target } = state;
  const { words, spaces } = useMemo(() => splitWords(target), [target]);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0, scroll: 0 });
  const caretIndex = state.entries.length;

  // Measure after paint-affecting DOM updates. Reads layout only: no animation work on the key path.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const atEnd = caretIndex >= target.length;
    const el = charRefs.current[atEnd ? target.length - 1 : caretIndex];
    if (!el) return;
    const lineH = frame.clientHeight / 3;
    const x = el.offsetLeft + (atEnd ? el.offsetWidth : 0);
    const y = el.offsetTop;
    const line = lineH > 0 ? Math.round(y / lineH) : 0;
    const scroll = Math.max(0, (line - 1) * lineH);
    setPos((p) =>
      p.x === x &&
      p.y === y &&
      p.w === el.offsetWidth &&
      p.h === el.offsetHeight &&
      p.scroll === scroll
        ? p
        : { x, y, w: el.offsetWidth, h: el.offsetHeight, scroll },
    );
  }, [caretIndex, target, state.status]);

  return (
    <div className={`${styles.frame} mono`} ref={frameRef} aria-label="text to type" role="img">
      <div className={styles.inner} style={{ transform: `translateY(${-pos.scroll}px)` }}>
        <span
          className={styles.caret}
          data-style={caret}
          data-idle={state.status === "idle" || undefined}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            width: caret === "line" ? undefined : pos.w,
            height: pos.h,
          }}
          aria-hidden="true"
        />
        {renderChars(target, words, spaces, state, charRefs)}
      </div>
    </div>
  );
}

/** A wrong keystroke shows what was typed (not the target), except a space or dead key, which stay invisible. */
function shownChar(state: EngineState, target: string, i: number): string {
  const e = state.entries[i];
  if (!e || e.correct || e.typed === " " || e.typed === DEAD) return target;
  return e.typed;
}

function renderChars(
  target: string,
  words: Word[],
  spaces: Set<number>,
  state: EngineState,
  refs: React.RefObject<(HTMLSpanElement | null)[]>,
) {
  const out: React.ReactNode[] = [];
  const chars = [...target];
  const charEl = (i: number) => (
    <span
      key={i}
      ref={(el) => {
        refs.current[i] = el;
      }}
      className={styles.ch}
      data-state={charState(state, i)}
      data-space={spaces.has(i) || undefined}
    >
      {shownChar(state, chars[i], i)}
    </span>
  );
  let w = 0;
  for (let i = 0; i < chars.length;) {
    if (spaces.has(i)) {
      out.push(charEl(i));
      i++;
      continue;
    }
    const word = words[w++];
    out.push(
      <span key={`w${word.start}`} className={styles.word}>
        {word.chars.map((_, k) => charEl(word.start + k))}
      </span>,
    );
    i += word.chars.length;
  }
  return out;
}

export const TypingText = memo(TypingTextImpl);
