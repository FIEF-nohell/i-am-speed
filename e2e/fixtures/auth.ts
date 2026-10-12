import type { Page } from "@playwright/test";

/** No real network: every Google / Firebase request is aborted, which the app sees as offline. */
export async function blockAuthNetwork(page: Page): Promise<void> {
  await page.route(
    /identitytoolkit|securetoken|googleapis\.com|gstatic\.com|firebaseapp\.com|accounts\.google\.com/,
    (route) => route.abort("failed"),
  );
}
