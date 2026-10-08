import styles from "./Toggle.module.css";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

/** A switch. The visible label lives in the parent Row; `label` names it for assistive tech. */
export function Toggle({ checked, onChange, label, id }: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.toggle}
      data-on={checked}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );
}
