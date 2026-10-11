"use client";

import { Check, Circle, UserPlus } from "lucide-react";
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
import { passwordRules, validateSignup, type FieldErrors } from "./validation";

export function SignupView() {
  const ready = useSignedOutGate();
  if (!ready) return <ScreenPlaceholder />;
  return <SignupForm />;
}

function SignupForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"email" | "password" | "confirm">>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  useFormFocus(formRef, Object.keys(errors).join());

  const rules = passwordRules(password, email);

  const finish = (result: Awaited<ReturnType<typeof callAdapter>>): void => {
    // On success the auth state changes and the gate redirects to /account/.
    if (!result.ok) setMessage({ text: result.message, error: true });
    setPending(false);
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (pending) return;
    const found = validateSignup({ email, password, confirm });
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    finish(await callAdapter((a) => a.signUpEmail(email.trim(), password)));
  };

  const google = async (): Promise<void> => {
    setErrors({});
    setMessage(null);
    setPending(true);
    finish(await callAdapter((a) => a.signInGoogle()));
  };

  return (
    <AuthShell
      title="create account"
      lede="An account is optional. It only adds sync across your devices."
      footer={
        <span>
          already have an account? <Link href="/login/">sign in</Link>
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
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="password"
          name="new-password"
          autoComplete="new-password"
          required
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ul className={styles.rules} aria-label="password rules">
          {rules.map((rule) => (
            <li key={rule.id} data-met={rule.met && password.length > 0}>
              {rule.met && password.length > 0 ? (
                <Check aria-hidden="true" />
              ) : (
                <Circle aria-hidden="true" />
              )}
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
        <PasswordField
          label="confirm password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button
          variant="primary"
          type="submit"
          icon={<UserPlus aria-hidden="true" />}
          disabled={pending}
          className={styles.submit}
        >
          {pending ? "creating account" : "create account"}
        </Button>
        <FormMessage message={message} />
        <Divider />
        <GoogleButton disabled={pending} onClick={() => void google()} />
      </form>
    </AuthShell>
  );
}
