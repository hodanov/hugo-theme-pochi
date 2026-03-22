const { test, expect } = require("./fixtures");

test.describe("F-10 Like button", () => {
  test("increments count and marks as liked", async ({ page }) => {
    // Mock the like API
    let postCount = 0;
    await page.route("**/like?slug=*", (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slug: "p-03-with-toc", count: 5 }),
        });
      }
      if (method === "POST") {
        postCount++;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slug: "p-03-with-toc", count: 5 + postCount }),
        });
      }
      return route.continue();
    });

    await page.goto("/posts/p-03-with-toc/");

    const likeBtn = page.locator("[data-like-button]").first();
    const countEl = page.locator("[data-like-count]").first();

    await expect(likeBtn).toBeVisible();

    // Wait for initial count to load from mock API
    await expect(countEl).toHaveText("5");
    await expect(likeBtn).toHaveAttribute("aria-pressed", "false");

    // Click like
    await likeBtn.click();

    // Count increments and button shows liked state
    await expect(countEl).toHaveText("6");
    await expect(likeBtn).toHaveAttribute("aria-pressed", "true");

    // Second click is ignored (already liked via localStorage)
    await likeBtn.click();
    await expect(countEl).toHaveText("6");
    expect(postCount).toBe(1);
  });
});
