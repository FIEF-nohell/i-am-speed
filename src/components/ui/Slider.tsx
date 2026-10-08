import styles from "./Slider.module.css";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
}

export function Slider({ value, min, max, step = 1, onChange, label }: Props) {
  return (
    <span className={styles.wrap}>
      <input
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className={styles.value}>{value}</output>
    </span>
  );
}
