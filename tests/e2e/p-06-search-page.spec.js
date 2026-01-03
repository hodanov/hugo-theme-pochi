const { test, expect } = require("@playwright/test");

test.describe("P-06 Search page", () => {
  test("search form returns matching results", async ({ page }) => {
    const query = "TOC";
    await page.goto("/");

    await expect(page.locator(".main-content")).toBeVisible();
    await page.fill("#search-query", query);
    await Promise.all([
      page.waitForURL(
        (url) => url.pathname === "/search/" && url.searchParams.get("q") === query,
      ),
      page.click("#searchsubmit"),
    ]);

    const results = page.locator("#search-results");
    await expect(results).toHaveCount(1);
    await expect(results).toContainText("Post With TOC");

    const rows = results.locator(".post-row");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
