import { expect, test, type Page } from "@playwright/test";
import { completeLesson, lessonText, typeText } from "./helpers";

// Pixel guard for the screens that must not change during the UI redo: the lesson list, the lesson
// typing screen and the free-test typing area. Baselines live in git-ignored screenshots/preserve/.
// Record at base:  PRESERVE=1 npx playwright test e2e/preserve.spec.ts --update-snapshots
// Compare later:   PRESERVE=1 npx playwright test e2e/preserve.spec.ts
test.skip(!process.env.PRESERVE, "set PRESERVE=1 to run the pixel guard");

const THEMES = ["dark", "light", "dusk", "ember"] as const;

test.use({ viewport: { width: 1440, height: 900 } });

/** Typing text is random per load; seed Math.random so baselines are reproducible. */
async function seedRandom(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let a = 0x2f6e2b1;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
}

const OPTIONS = { animations: "disabled", maxDiffPixelRatio: 0.002 } as const;

for (const theme of THEMES) {
  test(`preserve ${theme}`, async ({ page }) => {
    await seedRandom(page);
    await page.goto("/settings/");
    await page.getByRole("radio", { name: theme, exact: true }).click();

    await completeLesson(page, "home-01");
    await page.goto("/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    // The header and footer are redesigned on purpose, so only the page content is compared.
    await expect(page.locator("main")).toHaveScreenshot(`list-${theme}.png`, OPTIONS);

    await page.goto("/lesson/top-01/");
    const text = await lessonText(page);
    await typeText(page, text.slice(0, 20));
    await expect(page.locator("main")).toHaveScreenshot(`lesson-${theme}.png`, OPTIONS);

    await page.goto("/test/");
    const area = page.locator('[aria-label="text to type"]');
    await area.waitFor();
    // Info bar plus text area; the mode toolbar above and the footer below are redesigned.
    const bar = await area.locator("xpath=preceding-sibling::*[1]").boundingBox();
    const box = await area.boundingBox();
    if (!bar || !box) throw new Error("typing area not laid out");
    const clip = {
      x: Math.floor(Math.min(bar.x, box.x)) - 8,
      y: Math.floor(bar.y) - 8,
      width: Math.ceil(Math.max(bar.width, box.width)) + 16,
      height: Math.ceil(box.y + box.height - bar.y) + 16,
    };
    await expect(page).toHaveScreenshot(`test-${theme}.png`, { ...OPTIONS, clip });
  });
}
