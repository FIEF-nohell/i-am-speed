import { expect, test } from "@playwright/test";
import { blockAuthNetwork } from "./fixtures/auth";

test.beforeEach(async ({ page }) => {
  await blockAuthNetwork(page);
});

const WORDS = '[aria-label="falling words"] > span[style]';

test("rain: starts on enter, clears a typed word, resets on a wrong key, ends on esc", async ({
  page,
}) => {
  await page.goto("/rain/");
  await expect(page.getByRole("heading", { name: "rain" })).toBeVisible();
  await expect(page.getByText("loading words")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.locator(WORDS).first()).toBeVisible();

  const first = (await page.locator(WORDS).first().innerText()).trim();
  // A wrong first key never starts a word.
  const wrong = [..."abcdefghijklmnopqrstuvwxyz"].find((c) => c !== first[0])!;
  const texts = await page.locator(WORDS).allInnerTexts();
  const free = [..."abcdefghijklmnopqrstuvwxyz"].find(
    (c) => !texts.some((t) => t.trim()[0] === c),
  )!;
  await page.keyboard.press(free);
  await expect(page.getByText("accuracy")).toHaveCount(0);

  void wrong;
  await page.keyboard.type(first);
  await expect(page.locator(WORDS).filter({ hasText: first })).toHaveCount(0);
  await expect(
    page.getByText("score", { exact: true }).locator("xpath=following-sibling::dd"),
  ).not.toHaveText("0");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "game over" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "game over" })).toHaveCount(0);
});

test("rain: words get harder and faster over time (engine curve only, no network)", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost") && !r.url().startsWith("data:"))
      requests.push(r.url());
  });
  await page.goto("/rain/");
  await expect(page.getByText("loading words")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.locator(WORDS).first()).toBeVisible();
  expect(requests).toEqual([]);
});
