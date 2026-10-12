import type { Page } from "@playwright/test";

/** No real network: every Google / Firebase request is aborted, which the app sees as offline. */
export async function blockAuthNetwork(page: Page): Promise<void> {
  await page.route(
    /identitytoolkit|securetoken|googleapis\.com|gstatic\.com|firebaseapp\.com|accounts\.google\.com/,
    (route) => route.abort("failed"),
  );
}

/** Public web key from src/config/firebase.ts (lint forbids importing that module here). */
const API_KEY = "AIzaSyDa5a5cIMHmfpD2obQDfPgpMt6wsd3HTpQ";

export interface SeedUser {
  email: string;
  displayName: string | null;
}

/**
 * Makes Firebase restore a signed-in user from persisted state while every Google request fails.
 * The reload error is a network error, which Firebase treats as "keep the stored user".
 */
export async function seedSignedInUser(page: Page, user: SeedUser): Promise<void> {
  await page.addInitScript(
    ({ apiKey, email, displayName }) => {
      const now = String(Date.now());
      const stored = {
        uid: "e2e-user",
        email,
        emailVerified: true,
        displayName,
        isAnonymous: false,
        providerData: [
          {
            providerId: "password",
            uid: email,
            email,
            displayName,
            phoneNumber: null,
            photoURL: null,
          },
        ],
        stsTokenManager: {
          refreshToken: "e2e",
          accessToken: "e2e",
          expirationTime: Date.now() + 3_600_000,
        },
        createdAt: now,
        lastLoginAt: now,
        apiKey,
        appName: "[DEFAULT]",
      };
      localStorage.setItem(`firebase:authUser:${apiKey}:[DEFAULT]`, JSON.stringify(stored));
      localStorage.setItem("i-am-speed:auth", "1");
    },
    { apiKey: API_KEY, email: user.email, displayName: user.displayName },
  );
}
