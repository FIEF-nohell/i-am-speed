"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { getSyncActions, useSyncState } from "@/features/sync/state";
import styles from "./AccountView.module.css";

/** Shown while the device holds progress from another account and the user must choose. */
export function LinkDialog() {
  const sync = useSyncState();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  if (sync.kind !== "confirm-link") return null;

  const choose = async (choice: "merge" | "cancel"): Promise<void> => {
    setPending(true);
    setFailed(false);
    try {
      await getSyncActions()?.resolveLink(choice);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={styles.dialog}
      role="alertdialog"
      aria-labelledby="link-h"
      aria-describedby="link-d"
    >
      <h2 id="link-h" className={styles.dialogTitle}>
        this device has other progress
      </h2>
      <p id="link-d" className={styles.dialogText}>
        The lessons and stats saved on this device belong to a different account
        {sync.email ? ` than ${sync.email}` : ""}. You can merge them into this account, or cancel
        and stay signed out. Nothing is deleted either way.
      </p>
      <div className={styles.actions}>
        <Button variant="primary" disabled={pending} onClick={() => void choose("merge")}>
          merge into this account
        </Button>
        <Button disabled={pending} onClick={() => void choose("cancel")}>
          cancel
        </Button>
      </div>
      {failed && <Notice tone="error">That did not work. Please try again.</Notice>}
    </div>
  );
}
