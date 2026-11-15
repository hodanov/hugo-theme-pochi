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
    // The message sits next to the button, so it is not part of its name
    const feedback = page
      .locator("[data-share-root]")
      .first()
      .locator("[data-share-feedback]");

    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toHaveAccessibleName("Copy URL");
    // A one-off action, not a toggle
    await expect(shareBtn).not.toHaveAttribute("aria-pressed");

    await shareBtn.click();

    await expect(shareBtn).toHaveAttribute("data-copied", "");
    const expectedText = await shareBtn.getAttribute("data-feedback-copied");
    await expect(feedback).toHaveText(expectedText);
    await expect(shareBtn).toHaveAccessibleName("Copy URL");
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

  test("hatena bookmark link is visible on desktop", async ({ page }) => {
    await page.goto("/posts/p-03-with-toc/");

    const sidebar = page.locator("#sidebar-left");
    const hatenaLink = sidebar.locator(
      "a.sns-share-link[href*='b.hatena.ne.jp']",
    );

    await expect(hatenaLink).toBeVisible();
    await expect(hatenaLink).toHaveAttribute("target", "_blank");
    await expect(hatenaLink).toHaveAttribute("rel", "noopener noreferrer");

    const href = await hatenaLink.getAttribute("href");
    expect(href).toContain("https://b.hatena.ne.jp/entry/s/");
    expect(href).toContain("/posts/p-03-with-toc/");
  });

  test("mobile: hatena bookmark link is hidden in action bar", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();

    await page.goto("/posts/p-03-with-toc/");

    const actionBar = page.locator("#action-bar-mobile");
    await expect(actionBar).toBeVisible();

    const hatenaLink = actionBar.locator("a.sns-share-link");
    await expect(hatenaLink).toBeHidden();

    await context.close();
  });
});
