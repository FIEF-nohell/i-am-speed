import { expect, test } from "@playwright/test";
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
