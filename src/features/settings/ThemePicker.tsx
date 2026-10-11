"use client";

import { useRef, type KeyboardEvent } from "react";
import { nextIndex } from "@/components/ui/segmentedNav";
import { THEMES, type ThemeId } from "./settings";
import styles from "./ThemePicker.module.css";

interface Props {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}

/**
 * Four swatches, each drawn with its own theme tokens through a scoped data-theme. A radio group
 * with roving tabindex; the accessible name of each radio is exactly the theme id.
 */
export function ThemePicker({ value, onChange }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const to = nextIndex(e.key, index, THEMES.length);
    if (to === null) return;
    e.preventDefault();
    onChange(THEMES[to]);
    refs.current[to]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="theme" className={styles.group}>
      {THEMES.map((t, i) => (
        <button
          key={t}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={t === value}
          aria-label={t}
          tabIndex={t === value ? 0 : -1}
          className={styles.option}
          onClick={() => onChange(t)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          <span className={styles.swatch} data-theme={t} aria-hidden="true">
            <span className={styles.card} />
            <span className={styles.caret} />
          </span>
          <span className={styles.name} aria-hidden="true">
            {t}
          </span>
        </button>
      ))}
    </div>
  );
}
