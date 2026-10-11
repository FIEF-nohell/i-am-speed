"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./AuthScreens.module.css";
import {
  AuthShell,
  Divider,
  FormMessage,
  GoogleButton,
  ScreenPlaceholder,
  callAdapter,
  preloadAdapter,
  useFormFocus,
  useSignedOutGate,
  type Message,
} from "./authKit";
import { PasswordField, TextField } from "./fields";
import { validateLogin, type FieldErrors } from "./validation";

export function LoginView() {
  const ready = useSignedOutGate();
  if (!ready) return <ScreenPlaceholder />;
  return <LoginForm />;
}

function LoginForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  useFormFocus(formRef, Object.keys(errors).join());

  const finish = (result: Awaited<ReturnType<typeof callAdapter>>): void => {
    // On success the auth state changes and the gate redirects to /account/.
    if (!result.ok) setMessage({ text: result.message, error: true });
    setPending(false);
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (pending) return;
    const found = validateLogin({ email, password });
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    finish(await callAdapter((a) => a.signInEmail(email.trim(), password)));
  };

  const google = async (): Promise<void> => {
    setErrors({});
    setMessage(null);
    setPending(true);
    finish(await callAdapter((a) => a.signInGoogle()));
  };

  return (
    <AuthShell
      title="sign in"
      lede="Sign in to sync your settings, attempts and stats across devices."
      footer={
        <>
          <span>
            new here? <Link href="/signup/">create an account</Link>
          </span>
        </>
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
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link href="/forgot-password/" className={styles.inlineLink}>
          forgot password?
        </Link>
        <Button
          variant="primary"
          type="submit"
          icon={<LogIn aria-hidden="true" />}
          disabled={pending}
          className={styles.submit}
        >
          {pending ? "signing in" : "sign in"}
        </Button>
        <FormMessage message={message} />
        <Divider />
        <GoogleButton disabled={pending} onClick={() => void google()} />
      </form>
    </AuthShell>
  );
}
