import { test } from "@playwright/test";
import { lessonText, typeText } from "./helpers";

// Review aid: `MOTION=1 npx playwright test e2e/motion-capture.spec.ts`.
// Writes videos and frame sequences into screenshots/ (git-ignored).
test.skip(!process.env.MOTION, "set MOTION=1 to capture motion");

test("capture key interactions", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: "screenshots/video", size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();
  const frames = async (name: string, times: number[]): Promise<void> => {
    let last = 0;
    for (const t of times) {
      await page.waitForTimeout(t - last);
      last = t;
      await page.screenshot({
        path: `screenshots/motion-${name}-${String(t).padStart(4, "0")}.png`,
      });
    }
  };

  await page.goto("/");
  await frames("list", [0, 80, 160, 320, 600]);

  await page.goto("/lesson/home-01/");
  const text = await lessonText(page);
  await page.waitForTimeout(500);
  await typeText(page, text.slice(0, 18));
  await frames("typing", [0, 60]);
  await page.keyboard.press("x");
  await frames("error", [0, 60, 200]);
  await page.keyboard.press(text[18]);
  await typeText(page, text.slice(19));
  await page.waitForURL("**/results/");
  await frames("results", [0, 150, 300, 600, 900, 1400, 2200]);

  await page.goto("/settings/");
  await page.waitForTimeout(500);
  await page.getByRole("radio", { name: "light", exact: true }).click();
  await frames("theme", [0, 80, 160, 300, 500]);
  await page.getByRole("radio", { name: "dark", exact: true }).click();
  await page.getByRole("link", { name: "lessons" }).click();
  await frames("route", [0, 100, 200, 400]);
  await ctx.close();
});
