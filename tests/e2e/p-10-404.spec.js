const { test, expect } = require("@playwright/test");

test.describe("P-10 404", () => {
  test("404 page renders not found image", async ({ page }) => {
    await page.goto("/404.html");

    await expect(page.locator(".main-content")).toBeVisible();
    const img = page.locator('img[alt="404 Not Found"]');
    await expect(img).toBeVisible();
  });
});
