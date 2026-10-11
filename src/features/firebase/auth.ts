import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { mapAuthError } from "@/features/auth/errors";
import type { AuthAdapter, AuthResult, AuthUser } from "@/features/auth/types";
import type { FirebaseHandles } from "./client";

const OK: AuthResult = { ok: true };

function toUser(u: User): AuthUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    providerIds: u.providerData.map((p) => p.providerId),
  };
}

async function run(fn: () => Promise<unknown>): Promise<AuthResult> {
  try {
    await fn();
    return OK;
  } catch (e) {
    const { code, message } = mapAuthError(e);
    return { ok: false, code, message };
  }
}

const NEEDS_LOGIN = { code: "auth/requires-recent-login" };

export function createFirebaseAuthAdapter({ auth }: FirebaseHandles): AuthAdapter {
  return {
    onChange(cb) {
      return onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
    },
    signInEmail: (email, password) => run(() => signInWithEmailAndPassword(auth, email, password)),
    signUpEmail: (email, password) =>
      run(() => createUserWithEmailAndPassword(auth, email, password)),
    signInGoogle: () => run(() => signInWithPopup(auth, new GoogleAuthProvider())),
    sendPasswordReset: (email) => run(() => sendPasswordResetEmail(auth, email)),
    reauthenticate: ({ password }) =>
      run(async () => {
        const user = auth.currentUser;
        if (!user) throw NEEDS_LOGIN;
        if (password !== undefined && user.email) {
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);
        } else {
          await reauthenticateWithPopup(user, new GoogleAuthProvider());
        }
      }),
    deleteUser: () =>
      run(async () => {
        if (!auth.currentUser) throw NEEDS_LOGIN;
        await deleteUser(auth.currentUser);
      }),
    async signOut() {
      await signOut(auth);
    },
  };
}
