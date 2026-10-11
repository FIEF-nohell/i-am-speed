"use client";

import { useRef, type KeyboardEvent } from "react";
import { nextIndex } from "./segmentedNav";
import styles from "./Segmented.module.css";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  label: string;
  /** "text" (default): bare words. "pill": a bordered track with a filled selected option. */
  variant?: "text" | "pill";
}

/** A radio group of options; one is selected. Arrow keys move and select (roving tabindex). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  variant = "text",
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const checked = options.findIndex((o) => o.value === value);
  const tabStop = checked === -1 ? 0 : checked;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const to = nextIndex(e.key, index, options.length);
    if (to === null) return;
    e.preventDefault();
    onChange(options[to].value);
    refs.current[to]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={styles.group} data-variant={variant}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === tabStop ? 0 : -1}
          className={styles.option}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
