"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type Ref } from "react";
import styles from "./AuthScreens.module.css";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Labelled input with an inline error. The error is linked through aria-describedby. */
export function TextField({ label, error, hint, ref, ...input }: FieldProps) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        {...input}
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({ label, error, hint, ref, ...input }: FieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          {...input}
          ref={ref}
          id={id}
          type={shown ? "text" : "password"}
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
        <button
          type="button"
          className={styles.reveal}
          aria-label={shown ? `hide ${label}` : `show ${label}`}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}
