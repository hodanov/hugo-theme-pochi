const { test, expect } = require("@playwright/test");

test.describe("P-08 Terms list", () => {
  test("tags terms list shows items", async ({ page }) => {
    await page.goto("/tags/");

    await expect(page.locator(".main-content")).toBeVisible();

    const listItems = page.locator("#contents li");
    await expect(listItems.first()).toBeVisible();
    const count = await listItems.count();
    expect(count).toBeGreaterThan(0);
  });
});
