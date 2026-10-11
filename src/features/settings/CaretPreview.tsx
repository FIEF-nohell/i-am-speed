import type { CaretStyle, FontSize } from "./settings";
import styles from "./CaretPreview.module.css";

/** A static line of sample text showing the chosen caret and size. Decorative, so hidden from AT. */
export function CaretPreview({ caret, size }: { caret: CaretStyle; size: FontSize }) {
  return (
    <div className={styles.preview} data-size={size} aria-hidden="true">
      <span className={styles.typed}>i am </span>
      <span className={styles.current} data-style={caret}>
        s
      </span>
      <span className={styles.rest}>peed</span>
    </div>
  );
}
