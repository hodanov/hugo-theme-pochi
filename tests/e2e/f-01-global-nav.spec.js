const { test, expect } = require("./fixtures");

test.describe("F-01 Global navigation", () => {
  test("nav link navigates to about page", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".site-nav")).toBeVisible();

    const aboutLink = page.locator('#menu-global-nav a[href="/page/about/"]');
    await expect(aboutLink).toBeVisible();

    await Promise.all([
      page.waitForURL("**/page/about/"),
      aboutLink.click(),
    ]);

    await expect(page.locator("h1")).toContainText("About");
  });
});
