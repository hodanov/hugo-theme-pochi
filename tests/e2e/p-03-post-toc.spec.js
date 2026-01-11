const { test, expect } = require("./fixtures");

test.describe("P-03 Post with TOC", () => {
  test("toc sidebar is shown for posts with headings", async ({ page }) => {
    await page.goto("/posts/p-03-with-toc/");

    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    const tocSidebar = page.locator("#sidebar-right .table-of-contents");
    await expect(tocSidebar).toBeVisible();
  });
});
