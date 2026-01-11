const { test, expect } = require("@playwright/test");

test.describe("F-11 Language switcher", () => {
  test("switches to Japanese content", async ({ page }) => {
    await page.goto("/posts/p-01-sample-1/");

    const select = page.locator("#language-select-top");
    await expect(select).toBeVisible();

    await select.selectOption({ label: "日本語" });

    await expect(page).toHaveURL(/\/ja\/posts\/p-01-sample-1\//);
    await expect(page.locator("h1")).toHaveText("サンプル記事1");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  });
});
