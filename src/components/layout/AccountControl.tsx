"use client";

import styles from "./Header.module.css";

/** Fixed-width slot at the right end of the bar (filled in by the account menu work). */
export function AccountControl() {
  return <div className={styles.account} />;
}
