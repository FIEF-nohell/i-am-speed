import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore/lite";
import { FIREBASE_CONFIG } from "@/config/firebase";

export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let pending: Promise<FirebaseHandles> | null = null;

async function init(): Promise<FirebaseHandles> {
  const [appMod, authMod, storeMod] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore/lite"),
  ]);
  const app = appMod.getApps()[0] ?? appMod.initializeApp(FIREBASE_CONFIG);
  const auth = authMod.initializeAuth(app, {
    persistence: [authMod.indexedDBLocalPersistence, authMod.browserLocalPersistence],
    popupRedirectResolver: authMod.browserPopupRedirectResolver,
  });
  const db = storeMod.getFirestore(app);
  return { app, auth, db };
}

/** Memoised. Throws if called on the server. A failed load is not cached, so a retry can succeed. */
export function loadFirebase(): Promise<FirebaseHandles> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Firebase can only be loaded in the browser."));
  }
  if (!pending) {
    pending = init().catch((e: unknown) => {
      pending = null;
      throw e;
    });
  }
  return pending;
}
