import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeLesson } from "./helpers";

// Automated accessibility audit: no serious or critical axe violations on any page, in the dark
// and light themes, with and without data. Contrast is part of the audit.
const THEMES = ["dark", "light"] as const;
const PAGES = [
  "/",
  "/test/",
  "/zen/",
  "/results/",
  "/stats/",
  "/settings/",
  "/about/",
  "/account/",
  "/login/",
  "/signup/",
  "/forgot-password/",
];

async function audit(page: Page, label: string): Promise<void> {
  // The test and zen screens have no h1 of their own: wait for the typing text or canvas instead.
  await page
    .locator('h1, [aria-label="text to type"] [data-state], [aria-label="your text"]')
    .first()
    .waitFor({ state: "attached" });
  // Let entrance animations finish so contrast is measured on settled colours.
  await page.waitForTimeout(700);
  const { violations, passes } = await new AxeBuilder({ page }).analyze();
  expect(passes.length, "axe actually ran its rules").toBeGreaterThan(10);
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
    label,
  ).toEqual([]);
}

for (const theme of THEMES) {
  test(`axe: every page, ${theme}, empty state`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/settings/");
    await page.getByRole("radio", { name: theme, exact: true }).click();
    for (const path of PAGES) {
      await page.goto(path);
      await audit(page, path);
    }
  });

  test(`axe: results and stats with data, ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/settings/");
    await page.getByRole("radio", { name: theme, exact: true }).click();
    await completeLesson(page, "home-01");
    await page.waitForTimeout(1500);
    await audit(page, "/results/ passed");
    await page.goto("/stats/");
    await page.waitForTimeout(1200);
    await audit(page, "/stats/ with data");
    await page.goto("/settings/");
    await page.getByRole("switch", { name: "key sounds" }).click();
    await audit(page, "/settings/ sound on");
  });
}
