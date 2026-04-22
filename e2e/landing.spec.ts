import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the marketing hero and sign-in CTA", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /memorize everything/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with github/i }),
    ).toBeVisible();
  });

  test("site header shows brand and primary nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /memorize everything/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /due today/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /new deck/i })).toBeVisible();
  });
});
