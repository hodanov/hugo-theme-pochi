const { test, expect } = require("@playwright/test");

test.describe("P-04 Post without TOC", () => {
  test("toc sidebar is hidden when no headings exist", async ({ page }) => {
    await page.goto("/posts/p-04-no-toc/");

    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    const toc = page.locator(".table-of-contents");
    await expect(toc).toHaveCount(0);
  });
});
