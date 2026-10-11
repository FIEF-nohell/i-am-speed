import type { ReactNode } from "react";
import styles from "./Kbd.module.css";

/** A small key chip for shortcut hints: "tab", "esc", "enter". */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}
