const { test, expect } = require("@playwright/test");

test.describe("F-10 Like button", () => {
  test("scrolls to comment section", async ({ page }) => {
    await page.goto("/posts/p-03-with-toc/");

    const likeBtn = page.locator("[data-like-button]").first();
    const comments = page.locator(".comments").first();

    await expect(likeBtn).toBeVisible();
    await expect(comments).toBeVisible();

    const initialTop = await comments.evaluate((el) =>
      el.getBoundingClientRect().top,
    );
    const initialScroll = await page.evaluate(() => window.scrollY);
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    await likeBtn.click();

    await page.waitForFunction(() => {
      const el = document.querySelector(".comments");
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < vh && rect.bottom > 0;
    });

    if (initialTop > viewportHeight) {
      const afterScroll = await page.evaluate(() => window.scrollY);
      expect(afterScroll).toBeGreaterThan(initialScroll);
    }
  });
});
