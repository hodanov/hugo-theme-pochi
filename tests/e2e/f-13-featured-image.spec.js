const { test, expect } = require("@playwright/test");

test.describe("F-13 Featured image", () => {
  test("renders featured images in list and single view", async ({ page }) => {
    await page.goto("/");

    const card = page.locator(".post-row", {
      has: page.locator(".post-title h2", { hasText: "Pagination Post 5" }),
    });
    await expect(card).toBeVisible();
    await expect(card.locator(".post-image-col img")).toBeVisible();

    await page.goto("/posts/p-03-with-toc/");
    await expect(page.locator(".featured-image-wrapper img")).toBeVisible();
  });
});
