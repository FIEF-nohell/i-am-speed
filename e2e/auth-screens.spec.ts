import { expect, test, type Page } from "@playwright/test";

/** No real network: every Google / Firebase request is aborted, which the app sees as offline. */
async function blockAuthNetwork(page: Page): Promise<void> {
  await page.route(
    /identitytoolkit|securetoken|googleapis\.com|gstatic\.com|firebaseapp\.com|accounts\.google\.com/,
    (route) => route.abort("failed"),
  );
}

test.beforeEach(async ({ page }) => {
  await blockAuthNetwork(page);
});

test("login screen renders with its fields and links", async ({ page }) => {
  await page.goto("/login/");
  await expect(page.getByRole("heading", { level: 1, name: "sign in" })).toBeVisible();
  await expect(page).toHaveTitle(/sign in/);
  const email = page.getByLabel("email");
  await expect(email).toHaveAttribute("autocomplete", "email");
  await expect(email).toBeFocused();
  await expect(page.getByLabel("password", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(page.getByRole("button", { name: "continue with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "forgot password?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "create an account" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("password show and hide toggle", async ({ page }) => {
  await page.goto("/login/");
  const password = page.getByLabel("password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("login validates empty and malformed input, focusing the first problem", async ({ page }) => {
  await page.goto("/login/");
  await page.getByRole("button", { name: "sign in" }).click();
  await expect(page.getByText("Enter your email.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await expect(page.getByLabel("email")).toBeFocused();

  await page.getByLabel("email").fill("not-an-email");
  await page.getByRole("button", { name: "sign in" }).click();
  await expect(page.getByText("That does not look like a valid email address.")).toBeVisible();
});

test("signup shows rules, short password and mismatch messages", async ({ page }) => {
  await page.goto("/signup/");
  await expect(page.getByRole("heading", { level: 1, name: "create account" })).toBeVisible();
  const passwords = page.getByLabel(/^(confirm )?password$/, { exact: true });
  await expect(passwords.first()).toHaveAttribute("autocomplete", "new-password");
  await expect(page.getByText("at least 8 characters")).toBeVisible();

  await page.getByLabel("email").fill("me@example.com");
  await page.getByLabel("password", { exact: true }).fill("short");
  await page.getByLabel("confirm password", { exact: true }).fill("shorter");
  await page.getByRole("button", { name: "create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("The two passwords do not match.")).toBeVisible();

  await page.getByLabel("password", { exact: true }).fill("long enough pass");
  await page.getByLabel("confirm password", { exact: true }).fill("long enough pasx");
  await page.getByRole("button", { name: "create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toHaveCount(0);
  await expect(page.getByText("The two passwords do not match.")).toBeVisible();
});

test("navigation between the auth screens works", async ({ page }) => {
  await page.goto("/login/");
  await page.getByRole("link", { name: "create an account" }).click();
  await expect(page).toHaveURL(/\/signup\/$/);
  await page.getByRole("link", { name: "sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/login\/$/);
  await page.getByRole("link", { name: "forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "reset password" })).toBeVisible();
  await page.getByRole("link", { name: "back to sign in" }).click();
  await expect(page).toHaveURL(/\/login\/$/);
});

test("signed-out account page explains and links to sign in and sign up", async ({ page }) => {
  await page.goto("/account/");
  await expect(page.getByText("you are not signed in")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "sign in" }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  await page.goto("/account/");
  await page.getByRole("main").getByRole("link", { name: "create account" }).click();
  await expect(page).toHaveURL(/\/signup\/$/);
});

test("header offers an account entry for signed-out visitors", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "main" })
    .getByRole("link", { name: "account" })
    .click();
  await expect(page).toHaveURL(/\/account\/$/);
});

test("network failure shows a calm message and re-enables the form", async ({ page }) => {
  await page.goto("/login/");
  await page.getByLabel("email").fill("me@example.com");
  await page.getByLabel("password", { exact: true }).fill("some password");
  await page.getByLabel("password", { exact: true }).press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Could not reach" })).toBeVisible();
  await expect(page.getByRole("button", { name: "sign in" })).toBeEnabled();
  await expect(page.getByText(/auth\//)).toHaveCount(0);
});

test("forgot password gives a neutral message, or a calm network one offline", async ({ page }) => {
  await page.goto("/forgot-password/");
  await page.getByRole("button", { name: "send reset link" }).click();
  await expect(page.getByText("Enter your email.")).toBeVisible();

  await page.getByLabel("email").fill("me@example.com");
  await page.getByLabel("email").press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Could not reach" })).toBeVisible();
});
