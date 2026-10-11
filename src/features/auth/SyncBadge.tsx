"use client";

import { useHydrated } from "@/features/storage/store";
import { useSyncState } from "@/features/sync/state";
import { useAuth } from "./session";
import styles from "./AccountView.module.css";
import { describeSync, toneFor } from "./syncStatus";

/** A small status dot. Anonymous visitors see nothing. */
export function SyncBadge({ className = "" }: { className?: string }) {
  const hydrated = useHydrated();
  const auth = useAuth();
  const sync = useSyncState();
  if (!hydrated || auth.status !== "signed-in") return null;
  return (
    <span
      role="img"
      className={`${styles.dot} ${className}`}
      data-tone={toneFor(sync)}
      aria-label={describeSync(sync)}
    />
  );
}
