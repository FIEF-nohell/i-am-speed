import { expect, test, type Page } from "@playwright/test";
import { blockAuthNetwork } from "./fixtures/auth";

test.beforeEach(async ({ page }) => {
  await blockAuthNetwork(page);
});

const ROUTES: readonly { path: string; tab: string | null; current: "page" | "true" }[] = [
  { path: "/", tab: "lessons", current: "page" },
  { path: "/lesson/home-01/", tab: "lessons", current: "true" },
  { path: "/test/", tab: "test", current: "page" },
  { path: "/zen/", tab: "zen", current: "page" },
  { path: "/stats/", tab: "stats", current: "page" },
  { path: "/settings/", tab: "settings", current: "page" },
  { path: "/results/", tab: null, current: "page" },
  { path: "/about/", tab: null, current: "page" },
  { path: "/account/", tab: null, current: "page" },
  { path: "/login/", tab: null, current: "page" },
  { path: "/signup/", tab: null, current: "page" },
  { path: "/forgot-password/", tab: null, current: "page" },
];

test.describe("tabs and current page", () => {
  for (const route of ROUTES) {
    test(`aria-current on ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      const nav = page.getByRole("navigation", { name: "main" });
      const marked = nav.locator("a[aria-current]");
      if (route.tab === null) {
        await expect(marked).toHaveCount(0);
      } else {
        await expect(marked).toHaveCount(1);
        await expect(marked).toHaveText(route.tab);
        await expect(marked).toHaveAttribute("aria-current", route.current);
      }
    });
  }

  test("tab order follows the visual order", async ({ page }) => {
    await page.goto("/stats/");
    const names = [
      "skip to content",
      "i am speed, home",
      "lessons",
      "test",
      "zen",
      "stats",
      "settings",
    ];
    for (const name of names) {
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      const label = (await focused.getAttribute("aria-label")) ?? (await focused.innerText());
      expect(label.trim()).toBe(name);
    }
  });

  test("the header has no icons besides the mark", async ({ page }) => {
    await page.goto("/stats/");
    await expect(page.locator("header svg")).toHaveCount(1);
  });
});

const INDICATOR = "[data-nav-indicator]";

/** Indicator box against the label of a tab, in page coordinates. */
async function indicatorVsLabel(page: Page, tab: string) {
  const ind = await page.locator(INDICATOR).boundingBox();
  const label = await page
    .getByRole("navigation", { name: "main" })
    .getByRole("link", { name: tab, exact: true })
    .locator("[data-label]")
    .boundingBox();
  const bar = await page.locator("header.site-chrome > div").first().boundingBox();
  if (!ind || !label || !bar) throw new Error("not laid out");
  return { ind, label, bar };
}

test.describe("gliding indicator", () => {
  test("sits on the hairline under the current label", async ({ page }) => {
    await page.goto("/stats/");
    await expect(page.locator(INDICATOR)).toHaveAttribute("data-visible", "true");
    const { ind, label, bar } = await indicatorVsLabel(page, "stats");
    expect(Math.abs(ind.x - label.x)).toBeLessThan(1);
    expect(Math.abs(ind.width - label.width)).toBeLessThan(1);
    expect(Math.abs(ind.y + ind.height - (bar.y + bar.height))).toBeLessThan(1);
    expect(ind.height).toBeCloseTo(2, 0);
  });

  test("never animates on first load", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __maxAnim: number };
      w.__maxAnim = 0;
      const tick = () => {
        const el = document.querySelector("[data-nav-indicator]");
        if (el) w.__maxAnim = Math.max(w.__maxAnim, el.getAnimations().length);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto("/stats/");
    await expect(page.locator(INDICATOR)).toHaveAttribute("data-ready", "true");
    await page.waitForTimeout(500);
    const max = await page.evaluate(() => (window as unknown as { __maxAnim: number }).__maxAnim);
    expect(max).toBe(0);
  });

  test("glides between tabs on client navigation", async ({ page }) => {
    await page.goto("/stats/");
    await expect(page.locator(INDICATOR)).toHaveAttribute("data-ready", "true");
    await page
      .getByRole("navigation", { name: "main" })
      .getByRole("link", { name: "settings" })
      .click();
    await page.waitForTimeout(100);
    const props = await page.evaluate(() =>
      document
        .querySelector("[data-nav-indicator]")!
        .getAnimations()
        .map(
          (a) => `${a.constructor.name}:${(a as CSSTransition).transitionProperty}:${a.playState}`,
        ),
    );
    expect(props).toContain("CSSTransition:transform:running");
    await page.waitForTimeout(400);
    const { ind, label } = await indicatorVsLabel(page, "settings");
    expect(Math.abs(ind.x - label.x)).toBeLessThan(1);
    expect(Math.abs(ind.width - label.width)).toBeLessThan(1);
  });

  test("fades out on a page without a tab", async ({ page }) => {
    await page.goto("/stats/");
    await expect(page.locator(INDICATOR)).toHaveAttribute("data-ready", "true");
    await page
      .getByRole("navigation", { name: "footer" })
      .getByRole("link", { name: "about" })
      .click();
    await expect(page).toHaveURL(/\/about\/$/);
    await page.waitForTimeout(300);
    await expect(page.locator(INDICATOR)).toHaveCSS("opacity", "0");
  });

  test("no animations under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/stats/");
    await expect(page.locator(INDICATOR)).toHaveAttribute("data-ready", "true");
    const nav = page.getByRole("navigation", { name: "main" });
    await nav.getByRole("link", { name: "settings" }).click();
    await page.waitForTimeout(100);
    const count = await page.evaluate(
      () => document.querySelector("[data-nav-indicator]")!.getAnimations().length,
    );
    expect(count).toBe(0);
    await page.waitForTimeout(100);
    const { ind, label } = await indicatorVsLabel(page, "settings");
    expect(Math.abs(ind.x - label.x)).toBeLessThan(1);
  });
});
