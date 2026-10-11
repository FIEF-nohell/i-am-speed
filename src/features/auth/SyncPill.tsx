"use client";

import type { SyncState } from "@/features/sync/types";
import styles from "./AccountView.module.css";
import { toneFor } from "./syncStatus";

const LABEL: Record<SyncState["kind"], string> = {
  local: "not syncing",
  starting: "connecting",
  "confirm-link": "waiting",
  syncing: "syncing",
  synced: "synced",
  offline: "offline",
  error: "sync error",
};

/** Status pill for the account page: a dot plus a short word. The full sentence sits beside it. */
export function SyncPill({ state }: { state: SyncState }) {
  return (
    <span className={styles.pill}>
      <span className={styles.dot} data-tone={toneFor(state)} aria-hidden="true" />
      {LABEL[state.kind]}
    </span>
  );
}
