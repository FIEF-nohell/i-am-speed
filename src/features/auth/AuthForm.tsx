"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import styles from "./AccountView.module.css";
import { messageFor } from "./errors";
import { getAuthAdapter } from "./session";
import type { AuthAdapter, AuthResult } from "./types";

type Message = { text: string; error: boolean };

function preload(): void {
  getAuthAdapter().catch(() => {
    // The real attempt reports the failure.
  });
}

export function AuthForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const run = async (
    action: (adapter: AuthAdapter) => Promise<AuthResult>,
    success?: string,
  ): Promise<void> => {
    setPending(true);
    setMessage(null);
    try {
      const result = await action(await getAuthAdapter());
      if (!result.ok) setMessage({ text: result.message, error: true });
      else if (success) setMessage({ text: success, error: false });
    } catch {
      setMessage({ text: messageFor("network"), error: true });
    } finally {
      setPending(false);
    }
  };

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run((a) => a.signInEmail(email.trim(), password));
  };

  const reset = (): void => {
    if (!email.trim()) {
      setMessage({ text: "Enter your email above first.", error: true });
      return;
    }
    void run(
      (a) => a.sendPasswordReset(email.trim()),
      "If an account exists for that email, a reset link is on its way.",
    );
  };

  return (
    <form className={styles.form} onSubmit={submit} onFocus={preload} onPointerEnter={preload}>
      <div className={styles.field}>
        <label htmlFor={`${id}-email`}>email</label>
        <input
          id={`${id}-email`}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-password`}>password</label>
        <input
          id={`${id}-password`}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className={styles.actions}>
        <Button variant="primary" type="submit" icon={<LogIn />} disabled={pending}>
          sign in
        </Button>
        <Button
          icon={<UserPlus />}
          disabled={pending}
          onClick={() => void run((a) => a.signUpEmail(email.trim(), password))}
        >
          create account
        </Button>
      </div>
      <div className={styles.actions}>
        <Button disabled={pending} onClick={() => void run((a) => a.signInGoogle())}>
          continue with Google
        </Button>
        <Button disabled={pending} onClick={reset}>
          forgot password
        </Button>
      </div>
      {message && <Notice tone={message.error ? "error" : "neutral"}>{message.text}</Notice>}
    </form>
  );
}
