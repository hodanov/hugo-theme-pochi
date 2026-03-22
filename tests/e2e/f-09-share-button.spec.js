const { test, expect } = require("./fixtures");
const { devices } = require("@playwright/test");

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

  test("mobile: share button is visible in action bar", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      if (!navigator.clipboard) {
        navigator.clipboard = {};
      }
      navigator.clipboard.writeText = () => Promise.resolve();
    });

    await page.goto("/posts/p-03-with-toc/");

    const actionBar = page.locator("#action-bar-mobile");
    await expect(actionBar).toBeVisible();

    const shareBtn = actionBar.locator("[data-share-button]");
    await expect(shareBtn).toBeVisible();

    await context.close();
  });
});
