"use client";

import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { TextInput } from "@/components/ui/TextInput";
import { getSyncActions } from "@/features/sync/state";
import styles from "./AccountView.module.css";
import { getAuthAdapter, signOut } from "./session";
import type { AuthAdapter, AuthUser } from "./types";

type Step = "idle" | "confirm" | "working";
export type DeleteMessage = { text: string; error: boolean };
type Message = DeleteMessage;

const RECORD_REMAINS =
  "Your cloud data is deleted and you are signed out, but the account record itself could not be removed. Sign in again and repeat this to remove it.";

export function DeleteAccount({
  user,
  onDone,
}: {
  user: AuthUser;
  /** Called after sign-out, when this component is about to unmount. */
  onDone: (message: DeleteMessage) => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const usesPassword = user.providerIds.includes("password");

  const fail = (text: string): void => {
    setMessage({ text, error: true });
    setStep("confirm");
  };

  const run = async (): Promise<void> => {
    setStep("working");
    setMessage(null);
    let adapter: AuthAdapter;
    try {
      adapter = await getAuthAdapter();
    } catch {
      return fail("Could not reach the account service. Check your connection and try again.");
    }
    const auth = await adapter.reauthenticate(usesPassword ? { password } : {});
    if (!auth.ok) return fail(auth.message);

    const actions = getSyncActions();
    if (!actions) return fail("Sync is not running yet. Wait a moment and try again.");
    const cloud = await actions.deleteCloudData();
    if (!cloud.ok) return fail(cloud.message);

    const removed = await adapter.deleteUser();
    await signOut();
    setPassword("");
    setStep("idle");
    onDone(
      removed.ok
        ? {
            text: "Your account and cloud data are deleted. This device keeps its copy.",
            error: false,
          }
        : { text: RECORD_REMAINS, error: true },
    );
  };

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run();
  };

  if (step === "idle") {
    return (
      <>
        <Button
          variant="danger"
          icon={<Trash2 aria-hidden="true" />}
          onClick={() => setStep("confirm")}
        >
          delete account and cloud data
        </Button>
        {message && <Notice tone={message.error ? "error" : "neutral"}>{message.text}</Notice>}
      </>
    );
  }

  const working = step === "working";
  return (
    <form className={styles.form} onSubmit={submit}>
      <p className={styles.dialogText}>
        This permanently deletes your account and everything synced to it. The copy on this device
        stays; you can reset it separately in settings. Confirm your identity to continue.
      </p>
      {usesPassword && (
        <Field label="password">
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
      )}
      <div className={styles.actions}>
        <Button
          variant="danger"
          solid
          type="submit"
          icon={<Trash2 aria-hidden="true" />}
          disabled={working}
        >
          {usesPassword ? "delete everything" : "confirm with Google and delete"}
        </Button>
        <Button
          variant="secondary"
          disabled={working}
          onClick={() => {
            setStep("idle");
            setPassword("");
            setMessage(null);
          }}
        >
          cancel
        </Button>
      </div>
      {message && <Notice tone={message.error ? "error" : "neutral"}>{message.text}</Notice>}
    </form>
  );
}
