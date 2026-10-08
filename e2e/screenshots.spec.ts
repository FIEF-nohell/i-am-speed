import { test } from "@playwright/test";
import { completeLesson, lessonText, typeText } from "./helpers";

// Visual review aid: `SHOTS=1 npx playwright test e2e/screenshots.spec.ts`. Output is git-ignored.
test.skip(!process.env.SHOTS, "set SHOTS=1 to capture screenshots");

const SIZES = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];
const THEMES = (process.env.THEMES ?? "dark").split(",");

for (const theme of THEMES) {
  for (const size of SIZES) {
    test(`screens ${theme} ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const shot = (n: string) =>
        page.screenshot({
          path: `screenshots/${theme}-${size.name}-${n}.png`,
          fullPage: n !== "lesson",
        });
      await page.goto("/settings/");
      await page.getByRole("radio", { name: theme, exact: true }).click();

      // Phones have no physical keyboard, so the lesson screen is captured at desktop only.
      if (size.name === "1440") {
        await completeLesson(page, "home-01");
        await completeLesson(page, "home-02");
      }
      await page.goto("/");
      await shot("list");
      if (size.name === "1440") {
        await page.goto("/lesson/top-01/");
        const text = await lessonText(page);
        await typeText(page, text.slice(0, Math.floor(text.length / 2)));
        await shot("lesson");
        await page.goto("/results/");
        await page.getByRole("heading", { level: 1 }).waitFor();
        await shot("results");
      } else {
        await page.goto("/results/");
        await shot("results");
      }
      await page.goto("/stats/");
      await shot("stats");
      await page.goto("/settings/");
      await shot("settings");
    });
  }
}
