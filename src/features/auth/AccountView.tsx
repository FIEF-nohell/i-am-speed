"use client";

import { LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Row } from "@/components/ui/Row";
import { Section } from "@/components/ui/Section";
import { useHydrated } from "@/features/storage/store";
import { getSyncActions, useSyncState } from "@/features/sync/state";
import { AuthForm } from "./AuthForm";
import { DeleteAccount, type DeleteMessage } from "./DeleteAccount";
import { LinkDialog } from "./LinkDialog";
import { signOut, useAuth } from "./session";
import { SyncBadge } from "./SyncBadge";
import { describeSync } from "./syncStatus";

const PROVIDER_LABEL: Record<string, string> = {
  password: "email and password",
  "google.com": "Google",
};

export function AccountView() {
  const hydrated = useHydrated();
  const auth = useAuth();
  const sync = useSyncState();
  const [notice, setNotice] = useState<DeleteMessage | null>(null);
  const [syncing, setSyncing] = useState(false);

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
    <div className="page-narrow">
      <h1 className="page-title">account</h1>
      <p className="page-lede">
        An account is optional. Without one, everything stays in this browser. Signing in syncs your
        settings, attempts and stats across your devices.
      </p>

      {notice && <Notice tone={notice.error ? "error" : "neutral"}>{notice.text}</Notice>}
      <LinkDialog />

      {user ? (
        <>
          <Section title="signed in">
            <Row label="account" hint={user.displayName ?? undefined}>
              <span>{user.email ?? "no email"}</span>
            </Row>
            <Row label="sign-in method">
              <span>
                {user.providerIds.map((p) => PROVIDER_LABEL[p] ?? p).join(", ") || "unknown"}
              </span>
            </Row>
            <Row label="sync status" hint={describeSync(sync)}>
              <SyncBadge />
              <Button
                icon={<RefreshCw />}
                disabled={syncing || sync.kind === "starting" || sync.kind === "confirm-link"}
                onClick={() => void syncNow()}
              >
                sync now
              </Button>
            </Row>
            <Row label="sign out" hint="Your data stays on this device.">
              <Button
                icon={<LogOut />}
                onClick={() => {
                  setNotice(null);
                  void signOut();
                }}
              >
                sign out
              </Button>
            </Row>
          </Section>
          <Section
            title="delete account"
            description="Removes your account and everything synced to it."
          >
            <DeleteAccount user={user} onDone={setNotice} />
          </Section>
        </>
      ) : (
        <Section title="sign in or create an account">
          <AuthForm />
        </Section>
      )}
    </div>
  );
}
