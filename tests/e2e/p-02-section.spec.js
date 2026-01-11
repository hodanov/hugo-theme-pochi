const { test, expect } = require("./fixtures");

test.describe("P-02 Section list", () => {
  test("posts section shows list of posts", async ({ page }) => {
    await page.goto("/posts/");

    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    const cards = page.locator(".post-row");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});
