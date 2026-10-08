import { Keyboard } from "lucide-react";
import styles from "./NeedsKeyboard.module.css";

export function NeedsKeyboard() {
  return (
    <div className={styles.box} role="status">
      <Keyboard size={28} strokeWidth={1.5} aria-hidden="true" />
      <h1>needs a physical keyboard</h1>
      <p>
        i am speed teaches touch typing, so it needs a real keyboard. Open it on a laptop or
        desktop.
      </p>
    </div>
  );
}
