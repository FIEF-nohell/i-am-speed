import { expect, test } from "@playwright/test";
import { typeText } from "./helpers";

const TEXT = '[aria-label="your text"]';
const IDLE_LINE = "start typing, anything you like. esc to finish.";

test("zen: nav entry, idle hint, an empty canvas, focus mode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "main" }).getByRole("link", { name: "zen" }).click();
  await expect(page).toHaveURL(/\/zen\/$/);
  await expect(page.getByText(IDLE_LINE)).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-focus", "zen");
  // No pre-rendered text of any kind: nothing to read, nothing to match.
  await expect(page.locator(TEXT)).toBeVisible();
  await expect(page.locator(TEXT)).toHaveText("");
  await expect(page.locator('[aria-label="text to type"]')).toHaveCount(0);
  await expect(page.getByText("new text")).toHaveCount(0);

  await page.keyboard.press("h");
  await expect(page.locator("html")).toHaveAttribute("data-focus", "zen");
  await expect(page.locator("header.site-chrome")).toHaveCSS("opacity", "0");
  await expect(page.locator("footer.site-chrome")).toHaveCSS("opacity", "0");
});

test("zen: the test toolbar leads to zen", async ({ page }) => {
  await page.goto("/test/");
  await page.getByRole("radio", { name: "zen", exact: true }).click();
  await expect(page).toHaveURL(/\/zen\/$/);
  await expect(page.getByText(IDLE_LINE)).toBeVisible();
});

test("zen: whatever is typed appears, backspace deletes, tab and dead keys are ignored", async ({
  page,
}) => {
  await page.goto("/zen/");
  await typeText(page, "hello wörld");
  await page.keyboard.press("Enter");
  await typeText(page, "zweite {zeile}@");
  await expect(page.locator(TEXT)).toHaveText("hello wörld\nzweite {zeile}@");
  // The newline is a real line break: the second line sits below the first.
  const style = await page.locator(TEXT).evaluate((el) => getComputedStyle(el).whiteSpace);
  expect(style).toBe("pre-wrap");

  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(page.locator(TEXT)).toHaveText("hello wörld\nzweite {zeile");
  await page.keyboard.press("Tab");
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Dead", bubbles: true })),
  );
  await page.keyboard.press("Shift");
  await page.keyboard.press("Control+Backspace");
  await expect(page.locator(TEXT)).toHaveText("hello wörld\nzweite");
  await expect(page.locator(TEXT)).toBeVisible();
  // Nothing is ever marked wrong.
  await expect(page.locator(TEXT).locator("[data-state]")).toHaveCount(0);
});

test("zen: esc saves the session without accuracy and leaves lessons untouched", async ({
  page,
}) => {
  await page.goto("/zen/");
  await typeText(page, "ein freier Text mit Umlauten: äöü");
  await page.keyboard.press("Enter");
  await typeText(page, "und eine zweite zeile");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Escape");
  await page.waitForURL("**/results/");
  await expect(page.locator("html")).not.toHaveAttribute("data-focus", "zen");
  await expect(page.locator("#main").getByText("zen", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "session saved" })).toBeVisible();
  await expect(page.getByText("words", { exact: true })).toBeVisible();
  await expect(page.getByText("accuracy", { exact: true })).toHaveCount(0);
  await expect(page.getByText("where it went wrong")).toHaveCount(0);
  await expect(page.getByText("slowest keys")).toHaveCount(0);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("i-am-speed:v1")!));
  expect(stored.lastResult.attempt.source).toBe("zen");
  expect(stored.lastResult.attempt.accuracy).toBe(100);
  expect(stored.lastResult.text).toBe("ein freier Text mit Umlauten: äöü\nund eine zweite zeil");
  expect(stored.keys).toEqual({});
  expect(stored.fingers).toEqual({});
  expect(stored.lessons).toEqual({});

  await page.goto("/stats/");
  await expect(page.getByText("attempts", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("characters", { exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/^[1-9]\d* \/ \d+$/)).toHaveCount(0);
});

test("zen: esc before five characters returns to the test without saving", async ({ page }) => {
  await page.goto("/zen/");
  await page.keyboard.press("Escape");
  await page.waitForURL("**/test/");
  await page.goto("/zen/");
  await typeText(page, "abcd");
  await page.keyboard.press("Escape");
  await page.waitForURL("**/test/");
  await page.goto("/stats/");
  await expect(page.getByText("attempts", { exact: true })).toHaveCount(0);
});

test("zen: a long session renders a bounded tail and keeps the newest text in view", async ({
  page,
}) => {
  await page.goto("/zen/");
  const line = "free words keep flowing, there is nothing to hit. ";
  await page.evaluate((chunk) => {
    for (let i = 0; i < 160; i++)
      for (const key of chunk)
        window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }, line);
  await expect(page.locator(TEXT)).toContainText("nothing to hit.");
  const shown = (await page.locator(TEXT).textContent())?.length ?? 0;
  expect(shown, "rendered characters stay bounded").toBeLessThan(6100);
  expect(shown).toBeGreaterThan(3500);
  // The last line is scrolled into the frame.
  await expect
    .poll(() =>
      page.locator(TEXT).evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop),
    )
    .toBeLessThan(2);
});

test("zen: anonymous use makes no network requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost:4173")) external.push(r.url());
  });
  await page.goto("/zen/");
  await typeText(page, "no network needed here");
  await page.keyboard.press("Escape");
  await page.waitForURL("**/results/");
  expect(external).toEqual([]);
});
