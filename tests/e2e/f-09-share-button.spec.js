const { test, expect } = require("@playwright/test");

test.describe("F-09 Share button", () => {
  test("copies URL and shows feedback", async ({ page }) => {
    await page.addInitScript(() => {
      if (!navigator.clipboard) {
        navigator.clipboard = {};
      }
      navigator.clipboard.writeText = () => Promise.resolve();
    });

    await page.goto("/posts/p-03-with-toc/");

    const shareBtn = page.locator("[data-share-button]").first();
    const feedback = shareBtn.locator("[data-share-feedback]");

    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toHaveAttribute("aria-pressed", "false");

    await shareBtn.click();

    await expect(shareBtn).toHaveAttribute("aria-pressed", "true");
    await expect(feedback).toHaveText(/URLをコピーしました/);
  });
});
