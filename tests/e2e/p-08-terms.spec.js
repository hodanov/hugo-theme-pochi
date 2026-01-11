const { test, expect } = require("./fixtures");

test.describe("P-08 Terms list", () => {
  const targets = [
    { path: "/tags/", name: "tags" },
    { path: "/categories/", name: "categories" },
  ];

  for (const target of targets) {
    test(`${target.name} terms list shows items`, async ({ page }) => {
      await page.goto(target.path);

      await expect(page.locator(".main-content")).toBeVisible();

      const listItems = page.locator("#contents li");
      await expect(listItems.first()).toBeVisible();
      const count = await listItems.count();
      expect(count).toBeGreaterThan(0);
    });
  }
});
