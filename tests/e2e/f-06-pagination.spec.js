const { test, expect } = require("@playwright/test");

test.describe("F-06 Pagination", () => {
  test("navigates to next page", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".main-content")).toBeVisible();

    const firstTitle = await page.locator(".post-title h2").first().innerText();
    const nextLink = page.locator(".pagination-index a[aria-label=\"Next\"]").first();

    await expect(nextLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/page\/2/),
      nextLink.click(),
    ]);

    const secondTitle = await page.locator(".post-title h2").first().innerText();
    expect(secondTitle).not.toEqual(firstTitle);
  });
});
