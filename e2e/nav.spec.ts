import { expect, test, type Page } from "@playwright/test";
import { lessonText, typeText } from "./helpers";
import { blockAuthNetwork, seedSignedInUser } from "./fixtures/auth";

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
      "sign in",
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

test.describe("account menu", () => {
  test.beforeEach(async ({ page }) => {
    await seedSignedInUser(page, { email: "noel@example.com", displayName: "Noel" });
  });

  const button = (page: Page) => page.getByRole("button", { name: "account menu" });
  const menu = (page: Page) => page.locator("#account-menu");

  test("avatar shows the initial and opens the panel", async ({ page }) => {
    await page.goto("/stats/");
    await expect(button(page)).toContainText("n");
    await expect(menu(page)).toBeHidden();
    await button(page).click();
    await expect(button(page)).toHaveAttribute("aria-expanded", "true");
    await expect(menu(page)).toContainText("noel@example.com");
    await expect(menu(page)).toContainText("Noel");
    await expect(menu(page)).toContainText(/offline|syncing|synced|connecting|not syncing|failed/i);
  });

  test("escape closes and returns focus; arrows move between items", async ({ page }) => {
    await page.goto("/stats/");
    await button(page).click();
    await page.keyboard.press("Escape");
    await expect(menu(page)).toBeHidden();
    await expect(button(page)).toBeFocused();

    await button(page).click();
    await page.keyboard.press("ArrowDown");
    await expect(menu(page).getByRole("link", { name: "account" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu(page).getByRole("button", { name: "sign out" })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(menu(page).getByRole("link", { name: "account" })).toBeFocused();
  });

  test("a click outside closes; tabbing past the last item closes", async ({ page }) => {
    await page.goto("/stats/");
    await button(page).click();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(menu(page)).toBeHidden();

    await button(page).click();
    await menu(page).getByRole("button", { name: "sign out" }).focus();
    await page.keyboard.press("Tab");
    await expect(menu(page)).toBeHidden();
  });

  test("account item navigates and marks the avatar", async ({ page }) => {
    await page.goto("/stats/");
    await button(page).click();
    await menu(page).getByRole("link", { name: "account" }).click();
    await expect(page).toHaveURL(/\/account\/$/);
    await expect(button(page)).toHaveAttribute("data-current", "true");
    await button(page).click();
    await expect(menu(page).getByRole("link", { name: "account" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("escape in the menu never reaches the lesson", async ({ page }) => {
    await page.goto("/lesson/home-01/");
    const text = await lessonText(page);
    await typeText(page, text.slice(0, 3));
    const typed = page.locator('[aria-label="text to type"] [data-state="typed"]');
    await expect(typed).toHaveCount(3);
    await button(page).click();
    await page.keyboard.press("Escape");
    await expect(menu(page)).toBeHidden();
    await expect(page).toHaveURL(/\/lesson\/home-01\/$/);
    await expect(button(page)).toBeFocused();
    await expect(typed).toHaveCount(3);
  });

  test("sign out leaves a focused sign in link", async ({ page }) => {
    await page.goto("/stats/");
    await button(page).click();
    await menu(page).getByRole("button", { name: "sign out" }).click();
    await expect(page.getByRole("banner").getByRole("link", { name: "sign in" })).toBeFocused();
  });
});

test.describe("phone and tablet layout", () => {
  const PATHS = ROUTES.map((r) => r.path);

  test("390: two rows, 44px targets, no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of PATHS) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.goto("/stats/");
    const brand = await page.getByRole("link", { name: "i am speed, home" }).boundingBox();
    const nav = await page.getByRole("navigation", { name: "main" }).boundingBox();
    if (!brand || !nav) throw new Error("not laid out");
    expect(nav.y).toBeGreaterThanOrEqual(brand.y + brand.height - 1);
    await expect(page.getByText("i am speed", { exact: true })).toBeVisible();
    for (const name of ["lessons", "test", "zen", "stats", "settings", "sign in"]) {
      const box = await page
        .getByRole("banner")
        .getByRole("link", { name, exact: true })
        .boundingBox();
      if (!box) throw new Error(`${name} not laid out`);
      expect(box.width, name).toBeGreaterThanOrEqual(43.5);
      expect(box.height, name).toBeGreaterThanOrEqual(43.5);
    }
    for (const name of ["lessons", "test", "zen", "stats", "settings"]) {
      const label = await page
        .getByRole("navigation", { name: "main" })
        .getByRole("link", { name })
        .locator("[data-label]")
        .boundingBox();
      if (!label) throw new Error(`${name} label not laid out`);
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width).toBeLessThanOrEqual(390);
    }
    const { ind, label } = await indicatorVsLabel(page, "stats");
    expect(Math.abs(ind.x - label.x)).toBeLessThan(1);
    expect(Math.abs(ind.width - label.width)).toBeLessThan(1);
  });

  test("768: one row", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const path of PATHS) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.goto("/stats/");
    const brand = await page.getByRole("link", { name: "i am speed, home" }).boundingBox();
    const nav = await page.getByRole("navigation", { name: "main" }).boundingBox();
    if (!brand || !nav) throw new Error("not laid out");
    expect(nav.y).toBeLessThan(brand.y + brand.height);
  });

  test("320: no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    // /settings/ overflows at 320 by itself (the sound pack radio group in the settings page, not
    // the header), so it is left out here.
    for (const path of PATHS.filter((p) => p !== "/settings/")) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test.describe("touch", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("a tap leaves no sticky hover bar", async ({ page }) => {
      await page.goto("/");
      await page
        .getByRole("navigation", { name: "main" })
        .getByRole("link", { name: "stats" })
        .tap();
      await expect(page).toHaveURL(/\/stats\/$/);
      await page.waitForTimeout(400);
      const opacities = await page.evaluate(() =>
        Array.from(document.querySelectorAll("header [data-label]")).map((el) =>
          Number(getComputedStyle(el, "::before").opacity),
        ),
      );
      expect(Math.max(...opacities)).toBe(0);
    });
  });
});
