"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./AuthScreens.module.css";
import {
  AuthShell,
  FormMessage,
  ScreenPlaceholder,
  callAdapter,
  preloadAdapter,
  useFormFocus,
  useSignedOutGate,
  type Message,
} from "./authKit";
import { TextField } from "./fields";
import { emailProblem } from "./validation";

/** Shown whatever the outcome of the lookup, so the screen never reveals whether an account exists. */
export const RESET_SENT =
  "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.";

export function ForgotPasswordView() {
  const ready = useSignedOutGate();
  if (!ready) return <ScreenPlaceholder />;
  return <ForgotForm />;
}

function ForgotForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  useFormFocus(formRef, error ?? "");

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (pending) return;
    const problem = emailProblem(email);
    setError(problem ?? undefined);
    setMessage(null);
    if (problem) return;
    setPending(true);
    const result = await callAdapter((a) => a.sendPasswordReset(email.trim()));
    // Only connectivity and rate limits are reported. Anything else (including an unknown
    // account) gets the same neutral message.
    const reportable =
      !result.ok && (result.code === "network" || result.code === "too-many-requests");
    setMessage(
      reportable ? { text: result.message, error: true } : { text: RESET_SENT, error: false },
    );
    setPending(false);
  };

  return (
    <AuthShell
      title="reset password"
      lede="Enter your email and we will send you a link to choose a new password."
      footer={
        <span>
          remembered it? <Link href="/login/">back to sign in</Link>
        </span>
      }
    >
      <form
        ref={formRef}
        className={styles.form}
        noValidate
        onSubmit={(e) => void submit(e)}
        onFocus={preloadAdapter}
        onPointerEnter={preloadAdapter}
      >
        <TextField
          label="email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          error={error}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          variant="primary"
          type="submit"
          icon={<Mail aria-hidden="true" />}
          disabled={pending}
          className={styles.submit}
        >
          {pending ? "sending" : "send reset link"}
        </Button>
        <FormMessage message={message} />
      </form>
    </AuthShell>
  );
}
