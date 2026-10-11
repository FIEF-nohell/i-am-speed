import type { AuthErrorCode } from "./types";

const MESSAGES: Record<AuthErrorCode, string> = {
  "invalid-credentials": "That email and password do not match.",
  "invalid-email": "That does not look like a valid email address.",
  "email-in-use": "An account with this email already exists. Try signing in instead.",
  "weak-password": "Pick a longer password, at least six characters.",
  "popup-closed": "The sign-in window was closed before it finished.",
  "popup-blocked":
    "Your browser blocked the sign-in window. Allow pop-ups for this site and retry.",
  network: "Could not reach the sign-in service. Check your connection and try again.",
  "too-many-requests": "Too many attempts. Wait a moment and try again.",
  "requires-recent-login": "Please confirm your identity again to continue.",
  unknown: "Something went wrong. Please try again.",
};

const BY_FIREBASE_CODE: Record<string, AuthErrorCode> = {
  "auth/invalid-credential": "invalid-credentials",
  "auth/wrong-password": "invalid-credentials",
  "auth/user-not-found": "invalid-credentials",
  "auth/invalid-email": "invalid-email",
  "auth/email-already-in-use": "email-in-use",
  "auth/weak-password": "weak-password",
  "auth/popup-closed-by-user": "popup-closed",
  "auth/cancelled-popup-request": "popup-closed",
  "auth/popup-blocked": "popup-blocked",
  "auth/network-request-failed": "network",
  "auth/too-many-requests": "too-many-requests",
  "auth/requires-recent-login": "requires-recent-login",
};

export function messageFor(code: AuthErrorCode): string {
  return MESSAGES[code];
}

export function mapAuthError(e: unknown): { code: AuthErrorCode; message: string } {
  let raw: unknown;
  if (typeof e === "object" && e !== null && "code" in e) raw = (e as { code: unknown }).code;
  const code: AuthErrorCode = (typeof raw === "string" && BY_FIREBASE_CODE[raw]) || "unknown";
  return { code, message: MESSAGES[code] };
}
