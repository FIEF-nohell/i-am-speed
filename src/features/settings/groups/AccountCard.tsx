"use client";

import { User } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SyncBadge } from "@/features/auth/SyncBadge";
import { describeSync } from "@/features/auth/syncStatus";
import { useAuth } from "@/features/auth/session";
import { useSyncState } from "@/features/sync/state";
import styles from "./groups.module.css";

/** Where the data lives and a way to the account page. */
export function AccountCard() {
  const auth = useAuth();
  const sync = useSyncState();
  const signedIn = auth.status === "signed-in";
  const who = auth.user?.email ?? auth.user?.displayName ?? "your account";
  return (
    <Panel
      title="account"
      aside={
        <ButtonLink variant="secondary" size="sm" icon={<User />} href="/account/">
          {signedIn ? "manage" : "sign in"}
        </ButtonLink>
      }
    >
      <p className={styles.status}>
        <SyncBadge />
        <span>
          {signedIn
            ? `Synced as ${who}. ${describeSync(sync)}`
            : "Local only. Sign in to sync across devices."}
        </span>
      </p>
    </Panel>
  );
}
