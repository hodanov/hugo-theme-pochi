const { test, expect } = require("./fixtures");

test.describe("F-04/05 Search", () => {
  test("search returns matching results", async ({ page }) => {
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

  test("search shows empty state when no results", async ({ page }) => {
    const query = "no-results-keyword-xyz";
    await page.goto("/");

    await expect(page.locator(".main-content")).toBeVisible();
    await page.fill("#search-query", query);
    await Promise.all([
      page.waitForURL(
        (url) => url.pathname === "/search/" && url.searchParams.get("q") === query,
      ),
      page.click("#searchsubmit"),
    ]);

    const empty = page.locator(".search-results-empty");
    await expect(empty).toHaveCount(1);
    await expect(empty).toContainText(/一致する結果はありません|No matches found/);
  });
});
