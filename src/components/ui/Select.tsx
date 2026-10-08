import type { SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value"
> {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  label: string;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  ...rest
}: Props<T>) {
  return (
    <select
      className={styles.select}
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const picked = options.find((o) => String(o.value) === e.target.value);
        if (picked) onChange(picked.value);
      }}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
