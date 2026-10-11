"use client";

import { useId, type ReactNode } from "react";
import styles from "./Field.module.css";

interface Props {
  label: string;
  hint?: string;
  error?: string | null;
  /** Render the control with the id and aria-describedby this field wires up. */
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label, control, hint and error with the ids wired for assistive tech. */
export function Field({ label, hint, error, children }: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(id, describedBy)}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
