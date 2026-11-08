const { test, expect } = require("./fixtures");

test.describe("P-10 404", () => {
  test("404 page offers a way back", async ({ page }) => {
    await page.goto("/404.html");

    await expect(page.locator("h1")).toHaveText("Page not found");
    // The illustration is decorative
    await expect(page.locator("img.not-found-image")).toHaveAttribute(
      "alt",
      "",
    );
    await expect(page.locator(".not-found #search-query")).toBeVisible();
    await expect(page.locator('.not-found a[href="/"]')).toBeVisible();
    await expect(page.locator(".not-found h2 + ul li")).toHaveCount(5);
  });
});
