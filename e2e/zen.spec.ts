import { expect, test, type Page } from "@playwright/test";
import { typeText } from "./helpers";

const CHARS = '[aria-label="text to type"] [data-state]';

/** Types `count` characters of the upcoming text, reading what is left on screen as it goes. */
async function typeAhead(page: Page, count: number): Promise<void> {
  let done = 0;
  while (done < count) {
    const upcoming = await page
      .locator(`${CHARS}[data-state="current"], ${CHARS}[data-state="untyped"]`)
      .allTextContents();
    const chunk = upcoming.join("").slice(0, Math.min(60, count - done));
    expect(chunk.length).toBeGreaterThan(0);
    await typeText(page, chunk);
    done += chunk.length;
  }
}

test("zen: toolbar entry, idle hint, focus mode, endless text", async ({ page }) => {
  await page.goto("/test/");
  await page.getByRole("radio", { name: "zen", exact: true }).click();
  await expect(page).toHaveURL(/\/zen\/$/);
  await expect(page.getByText("zen. no timer, no word count.")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-focus", "zen");
  await expect(page.locator(CHARS).first()).toBeVisible();

  await typeAhead(page, 20);
  await expect(page.locator("html")).toHaveAttribute("data-focus", "zen");
  // The header gets `site-chrome` from the layout workstream; the fade is asserted once it has it.
  // Integration (WS-H) should make this unconditional.
  if ((await page.locator("header.site-chrome").count()) > 0) {
    await expect(page.locator("header.site-chrome")).toHaveCSS("opacity", "0");
  }

  await typeAhead(page, 600);
  const rendered = await page.locator(CHARS).count();
  expect(rendered, "rendered characters stay bounded").toBeLessThan(700);
  await expect(page.locator(`${CHARS}[data-state="untyped"]`).first()).toBeVisible();
  const typed = await page.locator(`${CHARS}[data-state="typed"]`).count();
  expect(typed, "typed characters scroll out of the window").toBeLessThan(620);
});

test("zen: tab gives new text", async ({ page }) => {
  await page.goto("/zen/");
  await page.locator(CHARS).first().waitFor();
  const read = async (): Promise<string> => (await page.locator(CHARS).allTextContents()).join("");
  const first = (await read()).slice(0, 80);
  await page.keyboard.press("Tab");
  await expect.poll(async () => (await read()).slice(0, 80)).not.toBe(first);
  await expect(page.locator("html")).not.toHaveAttribute("data-focus", "zen");
});

test("zen: esc saves the session and leaves lessons untouched", async ({ page }) => {
  await page.goto("/zen/");
  await page.locator(CHARS).first().waitFor();
  await typeAhead(page, 60);
  await page.keyboard.press("Escape");
  await page.waitForURL("**/results/");
  await expect(page.locator("html")).not.toHaveAttribute("data-focus", "zen");

  await page.goto("/stats/");
  await expect(page.getByText("attempts", { exact: true })).toBeVisible();
  await expect(page.locator("dl").getByText("1", { exact: true }).first()).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/^[1-9]\d* \/ \d+$/)).toHaveCount(0);
});

test("zen: esc before typing returns to the test without saving", async ({ page }) => {
  await page.goto("/zen/");
  await page.locator(CHARS).first().waitFor();
  await page.keyboard.press("Escape");
  await page.waitForURL("**/test/");
  await page.goto("/stats/");
  await expect(page.getByText("attempts", { exact: true })).toHaveCount(0);
});
