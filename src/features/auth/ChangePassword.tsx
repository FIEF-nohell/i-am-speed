"use client";

import { KeyRound } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./AuthScreens.module.css";
import { FormMessage, callAdapter, useFormFocus, type Message } from "./authKit";
import { PasswordField } from "./fields";
import { validatePasswordChange, type FieldErrors } from "./validation";

type Fields = FieldErrors<"current" | "next" | "confirm">;

/** Password-provider users only: re-authenticates with the current password, then updates it. */
export function ChangePassword() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Fields>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  if (!open) {
    return (
      <>
        <Button
          variant="secondary"
          icon={<KeyRound aria-hidden="true" />}
          onClick={() => setOpen(true)}
        >
          change password
        </Button>
        <FormMessage message={message} />
      </>
    );
  }

  const close = (): void => {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setErrors({});
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (pending) return;
    const found = validatePasswordChange({ current, next, confirm });
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    const result = await callAdapter((a) => a.changePassword({ current, next }));
    setPending(false);
    if (result.ok) {
      close();
      setMessage({ text: "Your password has been changed.", error: false });
    } else if (result.code === "invalid-credentials") {
      setErrors({ current: "That is not your current password." });
    } else if (result.code === "requires-recent-login") {
      setMessage({ text: "Please sign out, sign in again and retry.", error: true });
    } else {
      setMessage({ text: result.message, error: true });
    }
  };

  return (
    <ChangeForm
      formRef={formRef}
      errors={errors}
      pending={pending}
      message={message}
      values={{ current, next, confirm }}
      onChange={{ current: setCurrent, next: setNext, confirm: setConfirm }}
      onSubmit={(e) => void submit(e)}
      onCancel={() => {
        close();
        setMessage(null);
      }}
    />
  );
}

function ChangeForm(props: {
  formRef: React.RefObject<HTMLFormElement | null>;
  errors: Fields;
  pending: boolean;
  message: Message | null;
  values: { current: string; next: string; confirm: string };
  onChange: Record<"current" | "next" | "confirm", (v: string) => void>;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  const { formRef, errors, pending, message, values, onChange } = props;
  useFormFocus(formRef, Object.keys(errors).join());
  return (
    <form
      ref={formRef}
      className={`${styles.form} ${styles.narrow}`}
      aria-label="change password"
      noValidate
      onSubmit={props.onSubmit}
    >
      <PasswordField
        label="current password"
        name="current-password"
        autoComplete="current-password"
        required
        value={values.current}
        error={errors.current}
        onChange={(e) => onChange.current(e.target.value)}
      />
      <PasswordField
        label="new password"
        name="new-password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        value={values.next}
        error={errors.next}
        onChange={(e) => onChange.next(e.target.value)}
      />
      <PasswordField
        label="confirm new password"
        name="confirm-password"
        autoComplete="new-password"
        required
        value={values.confirm}
        error={errors.confirm}
        onChange={(e) => onChange.confirm(e.target.value)}
      />
      <div className={styles.actions}>
        <Button
          variant="primary"
          type="submit"
          icon={<KeyRound aria-hidden="true" />}
          disabled={pending}
        >
          {pending ? "saving" : "save password"}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={props.onCancel}>
          cancel
        </Button>
      </div>
      <FormMessage message={message} />
    </form>
  );
}
