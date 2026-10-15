"use client";

import { Check, LogIn, LogOut, RefreshCw, UserPlus, Cloud } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Row } from "@/components/ui/Row";
import { useHydrated } from "@/features/storage/store";
import { getSyncActions, useSyncState } from "@/features/sync/state";
import styles from "./AccountView.module.css";
import { ChangePassword } from "./ChangePassword";
import { DeleteAccount, type DeleteMessage } from "./DeleteAccount";
import { LinkDialog } from "./LinkDialog";
import { bootAuth, signOut, useAuth } from "./session";
import { SyncPill } from "./SyncPill";
import { describeSync } from "./syncStatus";
import { VerifyEmail } from "./VerifyEmail";

const PROVIDER_LABEL: Record<string, string> = {
  password: "email and password",
  "google.com": "Google",
};

const BENEFITS = [
  "Settings, attempts and stats on every device you sign in on.",
  "A copy in your account if you clear this browser.",
  "Nothing changes if you never sign in.",
];

export function AccountView() {
  const hydrated = useHydrated();
  const auth = useAuth();
  const sync = useSyncState();
  const [notice, setNotice] = useState<DeleteMessage | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    bootAuth();
  }, []);

  if (!hydrated || auth.status === "unknown") return <div style={{ minHeight: "24rem" }} />;

  const user = auth.user;
  const syncNow = async (): Promise<void> => {
    setSyncing(true);
    try {
      await getSyncActions()?.syncNow();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="page-full">
      <PageHeader
        eyebrow={user ? undefined : "you are not signed in"}
        title="account"
        lede={
          user ? "Your account only adds sync. Everything else stays in this browser." : undefined
        }
      />
      <div className={styles.stack}>
        {notice && (
          <div className={styles.full}>
            <Notice tone={notice.error ? "error" : "neutral"}>{notice.text}</Notice>
          </div>
        )}
        <LinkDialog />
        {user && <VerifyEmail user={user} />}

        {user ? (
          <>
            <Panel title="profile">
              <Row label="account" hint={user.displayName ?? undefined}>
                <span>{user.email ?? "no email"}</span>
              </Row>
              <Row label="sign-in method">
                <span>
                  {user.providerIds.map((p) => PROVIDER_LABEL[p] ?? p).join(", ") || "unknown"}
                </span>
              </Row>
              <Row label="sign out" hint="Your data stays on this device.">
                <Button
                  variant="secondary"
                  icon={<LogOut aria-hidden="true" />}
                  onClick={() => {
                    setNotice(null);
                    void signOut();
                  }}
                >
                  sign out
                </Button>
              </Row>
            </Panel>
            <Panel title="sync">
              <Row label="status" hint={describeSync(sync)}>
                <div className={styles.syncControls}>
                  <SyncPill state={sync} />
                  <Button
                    variant="secondary"
                    icon={<RefreshCw aria-hidden="true" />}
                    disabled={syncing || sync.kind === "starting" || sync.kind === "confirm-link"}
                    onClick={() => void syncNow()}
                  >
                    sync now
                  </Button>
                </div>
              </Row>
            </Panel>
            {user.providerIds.includes("password") && (
              <Panel title="password" description="Choose a new password for email sign-in.">
                <ChangePassword />
              </Panel>
            )}
            <Panel
              title="danger zone"
              description="Deleting removes your account and everything synced to it."
              className={styles.danger}
            >
              <DeleteAccount user={user} onDone={setNotice} />
            </Panel>
          </>
        ) : (
          <Panel as="div">
            <EmptyState
              icon={<Cloud />}
              title="sync is optional"
              actions={
                <>
                  <ButtonLink variant="primary" href="/login/" icon={<LogIn aria-hidden="true" />}>
                    sign in
                  </ButtonLink>
                  <ButtonLink
                    variant="secondary"
                    href="/signup/"
                    icon={<UserPlus aria-hidden="true" />}
                  >
                    create account
                  </ButtonLink>
                </>
              }
            >
              Everything works without an account and stays in this browser.
            </EmptyState>
            <ul className={styles.benefits} aria-label="what sync adds">
              {BENEFITS.map((text) => (
                <li key={text}>
                  <Check aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
