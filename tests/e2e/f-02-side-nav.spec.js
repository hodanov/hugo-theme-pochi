const { test, expect } = require("./fixtures");

test.describe("F-02 Side navigation", () => {
  test("opens and closes via toggle and close button", async ({ page }) => {
    await page.goto("/");

    const sideNav = page.locator("#side-nav");
    const openBtn = page.locator("#menu-bar-btn");
    const closeBtn = page.locator("#side-nav-close");

    await expect(sideNav).toHaveAttribute("aria-hidden", "true");

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    await expect(sideNav).toHaveAttribute("aria-hidden", "false");
    await expect(openBtn).toHaveAttribute("aria-expanded", "true");

    await closeBtn.click();
    await expect(sideNav).toHaveAttribute("aria-hidden", "true");
    await expect(openBtn).toHaveAttribute("aria-expanded", "false");
  });
});
