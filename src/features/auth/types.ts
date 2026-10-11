export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** Verification is advisory only. Sync works for unverified users. */
  emailVerified: boolean;
  /** e.g. ["password"], ["google.com"]. Drives the re-auth UI before deletion. */
  providerIds: string[];
}

export type AuthStatus = "unknown" | "signed-out" | "signed-in";
export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

export type AuthErrorCode =
  | "invalid-credentials"
  | "invalid-email"
  | "email-in-use"
  | "weak-password"
  | "popup-closed"
  | "popup-blocked"
  | "network"
  | "too-many-requests"
  | "requires-recent-login"
  | "user-disabled"
  | "unknown";

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode; message: string };

export interface AuthAdapter {
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signInEmail(email: string, password: string): Promise<AuthResult>;
  signUpEmail(email: string, password: string): Promise<AuthResult>;
  signInGoogle(): Promise<AuthResult>;
  sendPasswordReset(email: string): Promise<AuthResult>;
  /** Sends a verification mail to the signed-in user. */
  sendVerificationEmail(): Promise<AuthResult>;
  /** Re-authenticates with the current password, then sets the new one. Password-provider users only. */
  changePassword(input: { current: string; next: string }): Promise<AuthResult>;
  /** password for the "password" provider; Google re-auths via popup when omitted. */
  reauthenticate(input: { password?: string }): Promise<AuthResult>;
  deleteUser(): Promise<AuthResult>;
  signOut(): Promise<void>;
}

/** localStorage key. "1" while this browser has a signed-in Firebase session. Absent = never load Firebase at boot. */
export const AUTH_HINT_KEY = "i-am-speed:auth";
