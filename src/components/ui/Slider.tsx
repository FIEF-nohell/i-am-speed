import type { CSSProperties } from "react";
import styles from "./Slider.module.css";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  /** Text for the value readout and for assistive tech (aria-valuetext). Defaults to the number. */
  format?: (value: number) => string;
  disabled?: boolean;
}

/** A native range input laid over a styled track, so keyboard and touch behaviour stay native. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format = String,
  disabled,
}: Props) {
  const span = max - min;
  const fraction = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  const text = format(value);
  return (
    <span className={styles.wrap}>
      <span className={styles.control} style={{ "--fraction": fraction } as CSSProperties}>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} />
        </span>
        <input
          className={styles.slider}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={text}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
      <output className={styles.value}>{text}</output>
    </span>
  );
}
