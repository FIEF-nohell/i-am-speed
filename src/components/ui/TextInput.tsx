import type { ComponentProps, ReactNode } from "react";
import styles from "./TextInput.module.css";

type Props = ComponentProps<"input"> & {
  /** Red boundary; also sets aria-invalid. Show the message with Field's `error`. */
  invalid?: boolean;
  /** Content inside the box after the text, e.g. a "show password" button. */
  adornment?: ReactNode;
};

/** A text-like input: recessed fill, 1px strong boundary, accent on focus, error when invalid. */
export function TextInput({ invalid, adornment, className, ...rest }: Props) {
  return (
    <span className={`${styles.box} ${className ?? ""}`} data-invalid={invalid || undefined}>
      <input className={styles.input} aria-invalid={invalid || undefined} {...rest} />
      {adornment}
    </span>
  );
}
