"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Mark } from "@/components/icons/Mark";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import styles from "./AuthScreens.module.css";
import { messageFor } from "./errors";
import { bootAuth, getAuthAdapter, useAuth } from "./session";
import type { AuthAdapter, AuthResult } from "./types";

export type Message = { text: string; error: boolean };

/** Starts loading the Firebase adapter on first interaction so the submit feels instant. */
export function preloadAdapter(): void {
  getAuthAdapter().catch(() => {
    // The real attempt reports the failure.
  });
}

/** Runs an adapter call. Loader failures and thrown errors become the calm network message. */
export async function callAdapter(
  action: (adapter: AuthAdapter) => Promise<AuthResult>,
): Promise<AuthResult> {
  try {
    return await action(await getAuthAdapter());
  } catch {
    return { ok: false, code: "network", message: messageFor("network") };
  }
}

/**
 * For login, signup and forgot-password: signed-in users go straight to /account/.
 * `ready` is true once we know the visitor is signed out.
 */
export function useSignedOutGate(): boolean {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    bootAuth();
  }, []);
  useEffect(() => {
    if (auth.status === "signed-in") router.replace("/account/");
  }, [auth.status, router]);
  return auth.status === "signed-out";
}

/** Focuses the first field on mount, and the first invalid field whenever errors appear. */
export function useFormFocus(formRef: RefObject<HTMLFormElement | null>, errorKey: string): void {
  const mounted = useRef(false);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (!mounted.current) {
      mounted.current = true;
      form.querySelector<HTMLElement>("input")?.focus();
      return;
    }
    if (errorKey) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [formRef, errorKey]);
}

/** The centred card every auth screen sits in, with footer links below it. */
export function AuthShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <Panel as="div" className={styles.card}>
        <header className={styles.cardHead}>
          <Mark size={32} />
          <h1 className={`page-title ${styles.title}`}>{title}</h1>
          <p className={styles.lede}>{lede}</p>
        </header>
        {children}
      </Panel>
      {footer && <div className={styles.alt}>{footer}</div>}
    </div>
  );
}

/** Reserves the card's height while the sign-in state loads, so nothing jumps. */
export function ScreenPlaceholder() {
  return (
    <div className={styles.shell} aria-hidden="true">
      <div className={styles.placeholder} />
    </div>
  );
}

export function GoogleButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="secondary" disabled={disabled} onClick={onClick} className={styles.submit}>
      continue with Google
    </Button>
  );
}

export function Divider() {
  return (
    <div className={styles.divider} aria-hidden="true">
      or
    </div>
  );
}

export function FormMessage({ message }: { message: Message | null }) {
  return message ? (
    <Notice tone={message.error ? "error" : "neutral"}>{message.text}</Notice>
  ) : null;
}
