"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EngineState } from "@/features/engine/types";
import type { CaretStyle } from "@/features/settings/settings";
import styles from "./TypingText.module.css";

interface Props {
  state: EngineState;
  caret: CaretStyle;
  /** Endless text (Zen): render only a window around the caret and trim completed lines. */
  windowed?: boolean;
}

/** Characters rendered after the caret in windowed mode. Several lines at any supported width. */
const AHEAD = 240;
/** Windowed mode trims completed lines once the caret reaches this line (0-based). */
const TRIM_FROM_LINE = 3;

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

function TypingTextImpl({ state, caret, windowed = false }: Props) {
  const { target } = state;
  const caretIndex = state.entries.length;
  const [start, setStart] = useState(0);
  // The trim frame must not animate: content and scroll move together.
  const [snap, setSnap] = useState(false);
  const end = windowed ? Math.min(target.length, caretIndex + AHEAD) : target.length;
  const shown = windowed ? target.slice(start, end) : target;
  const { words, spaces } = useMemo(() => splitWords(shown), [shown]);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0, scroll: 0 });

  // A fresh text (Tab) starts the window over. Backspacing out of the window reopens it at a word start.
  if (windowed && start > 0 && caretIndex < start) {
    setStart(caretIndex === 0 ? 0 : target.lastIndexOf(" ", Math.max(0, caretIndex - 120)) + 1);
  }

  useEffect(() => {
    if (!snap) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setSnap(false));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [snap]);

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
    if (windowed && line >= TRIM_FROM_LINE) {
      // Drop the lines that scrolled out of view, at a measured line start so wrapping is unchanged.
      const edge = (line - 1) * lineH - 1;
      let first = start;
      while (first < caretIndex && (charRefs.current[first]?.offsetTop ?? edge) < edge) first++;
      if (first > start) {
        setSnap(true);
        setStart(first);
        return;
      }
    }
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
  }, [caretIndex, target, state.status, windowed, start]);

  return (
    <div className={`${styles.frame} mono`} ref={frameRef} aria-label="text to type" role="img">
      <div
        className={styles.inner}
        data-snap={snap || undefined}
        style={{ transform: `translateY(${-pos.scroll}px)` }}
      >
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
        {renderChars(shown, start, words, spaces, state, charRefs)}
      </div>
    </div>
  );
}

function renderChars(
  text: string,
  offset: number,
  words: Word[],
  spaces: Set<number>,
  state: EngineState,
  refs: React.RefObject<(HTMLSpanElement | null)[]>,
) {
  const out: React.ReactNode[] = [];
  const chars = [...text];
  const charEl = (i: number) => (
    <span
      key={offset + i}
      ref={(el) => {
        refs.current[offset + i] = el;
      }}
      className={styles.ch}
      data-state={charState(state, offset + i)}
      data-space={spaces.has(i) || undefined}
    >
      {chars[i]}
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
      <span key={`w${offset + word.start}`} className={styles.word}>
        {word.chars.map((_, k) => charEl(word.start + k))}
      </span>,
    );
    i += word.chars.length;
  }
  return out;
}

export const TypingText = memo(TypingTextImpl);
