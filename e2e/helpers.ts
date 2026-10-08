import type { Page } from "@playwright/test";

const TEXT = '[aria-label="text to type"] [data-state]';

export async function lessonText(page: Page): Promise<string> {
  await page.locator(TEXT).first().waitFor();
  return (await page.locator(TEXT).allTextContents()).join("");
}

/** Characters on the base layer of a US-like keyboard that Playwright can press with real key events. */
const PLAIN = /^[a-z0-9 ,.\-]$/;
const SHIFT_LETTER = /^[A-Z]$/;

/** Dispatches a key event the way a browser reports it under the Austrian layout. */
async function dispatch(
  page: Page,
  key: string,
  init: { altGraph?: boolean; ctrlAlt?: boolean; shift?: boolean },
): Promise<void> {
  await page.evaluate(
    ({ key, init }) => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
          shiftKey: !!init.shift,
          ctrlKey: !!init.ctrlAlt,
          altKey: !!init.ctrlAlt,
          modifierAltGraph: !!init.altGraph,
        }),
      );
    },
    { key, init },
  );
}

const ALTGR = new Set("@€{[]}\\~|");

/**
 * Types text with real key events where possible (plain keys, Shift+letter), and with
 * layout-faithful synthetic events for umlauts and AltGr characters. AltGr alternates between the
 * Linux/macOS style (AltGraph state) and the Windows style (Ctrl+Alt) to exercise both.
 */
export async function typeText(page: Page, text: string): Promise<void> {
  let altgrCount = 0;
  for (const ch of text) {
    if (PLAIN.test(ch)) await page.keyboard.press(ch);
    else if (SHIFT_LETTER.test(ch)) await page.keyboard.press(`Shift+${ch}`);
    else if (ALTGR.has(ch))
      await dispatch(page, ch, altgrCount++ % 2 === 0 ? { altGraph: true } : { ctrlAlt: true });
    else await dispatch(page, ch, { shift: ch !== ch.toLowerCase() });
  }
}

export async function completeLesson(page: Page, id: string): Promise<void> {
  await page.goto(`/lesson/${id}/`);
  const text = await lessonText(page);
  await typeText(page, text);
  await page.waitForURL("**/results/");
}
