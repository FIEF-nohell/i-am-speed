import { expect, test } from "@playwright/test";
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
