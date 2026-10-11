import { expect, test, type Page } from "@playwright/test";
import { completeLesson, lessonText, typeText } from "./helpers";

// Visual review aid: `SHOTS=1 THEMES=dark,light,dusk,ember npx playwright test e2e/screenshots.spec.ts`.
// Output is git-ignored. Every page is captured at 1440 and 390, and each capture also asserts
// that the page does not scroll sideways.
test.skip(!process.env.SHOTS, "set SHOTS=1 to capture screenshots");

const SIZES = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];
const THEMES = (process.env.THEMES ?? "dark").split(",");
const CHARS = '[aria-label="text to type"] [data-state]';

/** Types `count` characters of whatever Zen text is currently ahead. */
async function typeAhead(page: Page, count: number): Promise<void> {
  const upcoming = await page
    .locator(`${CHARS}[data-state="current"], ${CHARS}[data-state="untyped"]`)
    .allTextContents();
  await typeText(page, upcoming.join("").slice(0, count));
}

for (const theme of THEMES) {
  for (const size of SIZES) {
    test(`screens ${theme} ${size.name}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: size.width, height: size.height });
      const shot = async (name: string, opts: { fullPage?: boolean } = {}): Promise<void> => {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${name} scrolls sideways`).toBeLessThanOrEqual(0);
        if (opts.fullPage === false) {
          await page.screenshot({ path: `screenshots/${theme}-${size.name}-${name}.png` });
          return;
        }
        // A full-page capture resizes the viewport, which restarts chart animations. Resize
        // first, let them play, then take a plain screenshot.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
        await page.waitForTimeout(name.includes("results") ? 2200 : 400);
        await page.screenshot({ path: `screenshots/${theme}-${size.name}-${name}.png` });
        await page.setViewportSize({ width: size.width, height: size.height });
      };
      const visit = async (path: string, name: string, settle = 400): Promise<void> => {
        await page.goto(path);
        await page.getByRole("heading", { level: 1 }).first().waitFor();
        await page.waitForTimeout(settle);
        await shot(name);
      };

      await page.goto("/settings/");
      await page.getByRole("radio", { name: theme, exact: true }).click();

      // Empty states, before any attempt exists.
      await visit("/results/", "results-empty");
      await visit("/stats/", "stats-empty");

      await page.goto("/test/");
      await page.locator(CHARS).first().waitFor();
      await shot("test", { fullPage: false });

      await page.goto("/zen/");
      await page.locator(CHARS).first().waitFor();
      await page.waitForTimeout(300);
      await shot("zen-idle", { fullPage: false });
      await typeAhead(page, 30);
      await page.waitForTimeout(900);
      await shot("zen-typing", { fullPage: false });
      await page.keyboard.press("Escape");
      await page.waitForURL("**/results/");
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.waitForTimeout(2500);
      await shot("zen-results");

      await completeLesson(page, "home-01");
      await completeLesson(page, "home-02");
      await page.waitForTimeout(2500);
      await shot("results");
      await visit("/", "list");
      await page.goto("/lesson/top-01/");
      const text = await lessonText(page);
      await typeText(page, text.slice(0, Math.floor(text.length / 2)));
      await shot("lesson", { fullPage: false });

      await visit("/stats/", "stats", 1500);
      await visit("/settings/", "settings");
      await visit("/about/", "about");
      await visit("/account/", "account");
      await visit("/login/", "login");
      await visit("/signup/", "signup");
      await visit("/forgot-password/", "forgot-password");
    });
  }
}
