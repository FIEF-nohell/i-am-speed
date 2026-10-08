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
}

/** Monkeytype-style row of text options; one is selected. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.group}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={styles.option}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
