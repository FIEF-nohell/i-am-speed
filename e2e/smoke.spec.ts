import { expect, test } from "@playwright/test";
import { completeLesson, lessonText, typeText } from "./helpers";

test("open a lesson from the list, type it, reach results with charts", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost")) external.push(r.url());
  });

  await page.goto("/");
  await page.getByRole("link", { name: /f and j/ }).click();
  await expect(page).toHaveURL(/\/lesson\/home-01\/$/);
  const text = await lessonText(page);
  expect(text.length).toBeGreaterThan(30);
  await typeText(page, text);

  await page.waitForURL("**/results/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("passed");
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  await expect(page.getByText("speed over time")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("1 / 7")).toBeVisible();
  expect(external, "no runtime network requests").toEqual([]);
});

test("shift and capitals: real Shift key events", async ({ page }) => {
  await completeLesson(page, "shift-01");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("passed");
});

test("AltGr characters work with AltGraph state and Windows Ctrl+Alt", async ({ page }) => {
  await completeLesson(page, "altgr-01");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("passed");
});

test("settings persist after reload", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByRole("radio", { name: "light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "light" })).toHaveAttribute("aria-checked", "true");
});

test("a wrong key does not advance in block mode and dead keys do not crash", async ({ page }) => {
  await page.goto("/lesson/home-01/");
  const text = await lessonText(page);
  const wrong = text[0] === "f" ? "j" : "f";
  await page.keyboard.press(wrong);
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Dead", bubbles: true, cancelable: true }),
    ),
  );
  await expect(page.locator('[aria-label="text to type"] [data-state="typed"]')).toHaveCount(0);
  await page.keyboard.press(text[0]);
  await expect(page.locator('[aria-label="text to type"] [data-state="typed"]')).toHaveCount(1);
});

test("free test runs to the results page", async ({ page }) => {
  await page.goto("/test/");
  await page.getByRole("radio", { name: "10 words" }).click();
  const text = await lessonText(page);
  await typeText(page, text);
  await page.waitForURL("**/results/");
  await expect(page.getByText("free test")).toBeVisible();
});
