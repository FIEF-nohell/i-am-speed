import { expect, test, type Page } from "@playwright/test";
import { lessonText, typeText } from "./helpers";

declare global {
  interface Window {
    __audio: { contexts: number; starts: number };
  }
}

/** Counts AudioContext constructions and AudioBufferSourceNode.start() calls. */
async function instrumentAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__audio = { contexts: 0, starts: 0 };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.__audio.contexts++;
      }
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      window.__audio.starts++;
      return start.apply(this, args);
    };
  });
}

const counts = (page: Page) => page.evaluate(() => window.__audio);

async function enableSound(page: Page): Promise<void> {
  await page.goto("/settings/");
  await page.getByRole("switch", { name: "key sounds" }).click();
  await expect(page.getByRole("switch", { name: "key sounds" })).toBeChecked();
}

test("sound on: every key and a wrong key start a sound, with no network requests", async ({
  page,
}) => {
  await instrumentAudio(page);
  await enableSound(page);
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost")) external.push(r.url());
  });

  await page.goto("/lesson/home-01/");
  const text = await lessonText(page);
  await page.keyboard.press(text[0]!);
  await page.waitForTimeout(300);
  const before = (await counts(page)).starts;
  await typeText(page, text.slice(1, 20));
  await page.waitForTimeout(100);
  const typed = (await counts(page)).starts - before;
  expect(typed).toBeGreaterThanOrEqual(17);
  expect(typed).toBeLessThanOrEqual(19);

  const beforeWrong = (await counts(page)).starts;
  await page.keyboard.press("q");
  await page.waitForTimeout(100);
  expect((await counts(page)).starts).toBeGreaterThan(beforeWrong);
  expect(external).toEqual([]);
});

test("sound off: no audio context is ever created", async ({ page }) => {
  await instrumentAudio(page);
  await page.goto("/lesson/home-01/");
  const text = await lessonText(page);
  await typeText(page, text.slice(0, 10));
  expect(await counts(page)).toEqual({ contexts: 0, starts: 0 });
});

test("the settings preview button creates a context and plays", async ({ page }) => {
  await instrumentAudio(page);
  await page.goto("/settings/");
  await page.getByRole("button", { name: /preview/ }).click();
  await page.waitForTimeout(1200);
  const { contexts, starts } = await counts(page);
  expect(contexts).toBe(1);
  expect(starts).toBeGreaterThanOrEqual(5);
});
