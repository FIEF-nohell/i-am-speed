import { expect, test, type Page } from "@playwright/test";
import { completeLesson, lessonText, typeText } from "./helpers";

test("typing stays free of long tasks and slow key handling", async ({ page }) => {
  await page.goto("/lesson/paragraphs-03/");
  const text = await lessonText(page);
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__long.push(e.duration);
    }).observe({ entryTypes: ["longtask"] });
  });

  // Handler cost of synchronous key events (engine + React commit), measured in the page.
  const timings = await page.evaluate(
    (chars) => {
      const out: number[] = [];
      for (const key of chars.slice(0, 120)) {
        const t0 = performance.now();
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
        );
        out.push(performance.now() - t0);
      }
      return out;
    },
    [...text],
  );
  const sorted = [...timings].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  expect(p95, `p95 key handler ${p95.toFixed(2)}ms`).toBeLessThan(8);
  expect(sorted.at(-1)!, "slowest key handler").toBeLessThan(40);

  const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  expect(
    long.filter((d) => d > 80),
    "long tasks while typing",
  ).toEqual([]);
});

test("reduced motion: no entrance animation, results show final numbers at once", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto("/");
  const name = await page
    .locator(".page-enter")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe("none");
  await completeLesson(page, "home-01");
  const first = await page.locator("[data-stat-value]").first().textContent();
  expect(Number(first)).toBeGreaterThan(5);
  await ctx.close();
});

test("in-app reduce motion setting disables entrance animation", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByRole("switch", { name: "reduce motion" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.goto("/");
  const name = await page
    .locator(".page-enter")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe("none");
});

test("results count-up is skippable with a key press", async ({ page }) => {
  await completeLesson(page, "home-01");
  const target = await page.evaluate(
    () => JSON.parse(localStorage.getItem("i-am-speed:v1")!).lastResult.attempt.netWpm as number,
  );
  await page.keyboard.press("x");
  await expect
    .poll(async () => Number(await page.locator("[data-stat-value]").first().textContent()))
    .toBeCloseTo(target, 0);
});

test("typing helpers still work after motion changes", async ({ page }) => {
  await page.goto("/lesson/home-01/");
  await typeText(page, await lessonText(page));
  await page.waitForURL("**/results/");
});

const BUDGET = { p95: 8, max: 40 };

function expectBudget(timings: number[], label: string): void {
  const sorted = [...timings].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  expect(p95, `${label}: p95 key handler ${p95.toFixed(2)}ms`).toBeLessThan(BUDGET.p95);
  expect(sorted.at(-1)!, `${label}: slowest key handler`).toBeLessThan(BUDGET.max);
}

/** Times `count` synchronous key handlers on the lesson text currently ahead. */
async function timeKeys(page: Page, count: number): Promise<number[]> {
  return page.evaluate((total) => {
    const sel = '[aria-label="text to type"] [data-state]';
    const out: number[] = [];
    while (out.length < total) {
      const ahead = [
        ...document.querySelectorAll(`${sel}[data-state="current"], ${sel}[data-state="untyped"]`),
      ]
        .map((e) => e.textContent ?? "")
        .join("");
      for (const key of ahead.slice(0, Math.min(100, total - out.length))) {
        const t0 = performance.now();
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
        );
        out.push(performance.now() - t0);
      }
    }
    return out;
  }, count);
}

test("typing with key sounds on stays within the key handler budget", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByRole("switch", { name: "key sounds" }).click();
  await page.goto("/lesson/paragraphs-03/");
  await lessonText(page);
  // The first gesture unlocks audio; after that every key plays a sound.
  await page.mouse.click(5, 5);
  await page.waitForTimeout(300);
  expectBudget(await timeKeys(page, 120), "sound on");
});

/** Times `count` free-type key handlers in Zen, typing plain prose with the occasional newline. */
async function timeFreeKeys(page: Page, count: number): Promise<number[]> {
  return page.evaluate(async (total) => {
    const prose = "free words flow without any target to hit. ";
    const out: number[] = [];
    for (let i = 0; i < total; i++) {
      const key = i % 97 === 96 ? "Enter" : prose[i % prose.length];
      const t0 = performance.now();
      window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      out.push(performance.now() - t0);
      // Let React commit and the browser lay out, as it does between real key presses.
      if (i % 20 === 19) await new Promise((r) => requestAnimationFrame(r));
    }
    return out;
  }, count);
}

test("zen after 3000 characters stays within the key handler budget", async ({ page }) => {
  await page.goto("/zen/");
  await page.locator('[aria-label="your text"]').waitFor();
  const timings = await timeFreeKeys(page, 3000);
  expectBudget(timings.slice(-300), "zen, last 300 of 3000");
  expectBudget(timings, "zen, all 3000");
  await expect(page.locator("html")).toHaveAttribute("data-focus", "zen");
});
