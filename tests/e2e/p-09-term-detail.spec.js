const { test, expect } = require("@playwright/test");

test.describe("P-09 Term detail", () => {
  const targets = [
    { path: "/tags/alpha/", name: "tag" },
    { path: "/categories/news/", name: "category" },
  ];

  for (const target of targets) {
    test(`${target.name} detail shows post list`, async ({ page }) => {
      await page.goto(target.path);

      await expect(page.locator(".main-content")).toBeVisible();

      const listItems = page.locator(".post-row");
      await expect(listItems.first()).toBeVisible();
      const count = await listItems.count();
      expect(count).toBeGreaterThan(0);
    });
  }
});
