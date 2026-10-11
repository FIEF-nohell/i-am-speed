"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { callAdapter } from "./authKit";
import styles from "./AccountView.module.css";
import type { AuthUser } from "./types";

type State = "idle" | "sending" | "sent" | "failed";

/** Quiet, non-blocking reminder for unverified password accounts. Sync works regardless. */
export function VerifyEmail({ user }: { user: AuthUser }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  if (user.emailVerified || !user.providerIds.includes("password") || !user.email) return null;

  const resend = async (): Promise<void> => {
    setState("sending");
    const result = await callAdapter((a) => a.sendVerificationEmail());
    if (result.ok) setState("sent");
    else {
      setError(result.message);
      setState("failed");
    }
  };

  return (
    <div className={styles.verify}>
      <p className={styles.dialogText} role="status">
        {state === "sent"
          ? `Verification email sent to ${user.email}. Check your inbox and spam folder.`
          : state === "failed"
            ? error
            : `Verify your email: we sent a link to ${user.email}. Syncing works without it.`}
      </p>
      <Button
        icon={<MailCheck aria-hidden="true" />}
        disabled={state === "sending" || state === "sent"}
        onClick={() => void resend()}
      >
        {state === "sending" ? "sending" : state === "sent" ? "sent" : "resend email"}
      </Button>
    </div>
  );
}
