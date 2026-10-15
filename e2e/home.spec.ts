import { expect, test, type Page } from "@playwright/test";
import { completeLesson } from "./helpers";
import { blockAuthNetwork } from "./fixtures/auth";

test.beforeEach(async ({ page }) => {
  await blockAuthNetwork(page);
});

async function contentWidth(page: Page, path: string): Promise<number> {
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const box = await page.locator(".page-full").first().boundingBox();
  if (!box) throw new Error(`${path} not laid out`);
  return Math.round(box.width);
}

test("lessons, stats, settings, about and account share one page width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const widths = new Map<string, number>();
  for (const path of ["/", "/stats/", "/settings/", "/about/", "/account/"]) {
    widths.set(path, await contentWidth(page, path));
  }
  for (const [path, w] of widths) {
    expect(Math.abs(w - widths.get("/")!), path).toBeLessThanOrEqual(1);
  }
  // The wide column, not the old 40rem strip.
  expect(widths.get("/")!).toBeGreaterThan(1100);
});

test("home: main column and sidebar side by side, sidebar fills in after a lesson", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const side = page.getByRole("complementary", { name: "your progress" });
  await expect(side).toBeVisible();
  await expect(side.getByText("guest")).toBeVisible();
  await expect(
    side.getByText("appear here after your first lesson", { exact: false }),
  ).toBeVisible();

  const list = await page.locator("#lessons").boundingBox();
  const sideBox = await side.boundingBox();
  if (!list || !sideBox) throw new Error("not laid out");
  expect(sideBox.x).toBeGreaterThan(list.x + list.width - 1);
  expect(sideBox.width).toBeLessThan(list.width / 2);

  await expect(page.getByText("next up")).toBeVisible();
  await expect(page.getByRole("link", { name: "start" })).toHaveAttribute(
    "href",
    "/lesson/home-01/",
  );

  await completeLesson(page, "home-01");
  await page.goto("/");
  await expect(side.getByText("average speed")).toBeVisible();
  await expect(side.getByText("lessons passed")).toBeVisible();
  await expect(page.getByRole("link", { name: "start" })).toHaveAttribute(
    "href",
    "/lesson/home-02/",
  );
});

test("home: on a phone the sidebar stacks under the lessons without horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const side = page.getByRole("complementary", { name: "your progress" });
  const list = await page.locator("#lessons").boundingBox();
  const sideBox = await side.boundingBox();
  if (!list || !sideBox) throw new Error("not laid out");
  expect(sideBox.y).toBeGreaterThan(list.y + list.height - 1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
