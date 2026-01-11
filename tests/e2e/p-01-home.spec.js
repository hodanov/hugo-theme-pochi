const { test, expect } = require("./fixtures");

test.describe("P-01 Home", () => {
  test("home shows main content and at least one post card", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    const cards = page.locator(".post-row");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});
