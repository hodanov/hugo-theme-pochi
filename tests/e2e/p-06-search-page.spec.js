const { test, expect } = require("@playwright/test");

test.describe("P-06 Search page", () => {
  test("search page renders result container", async ({ page }) => {
    await page.goto("/search/");

    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page.locator("#search-results")).toHaveCount(1);
    await expect(page.locator(".search-loading")).toBeVisible();
  });
});
