const { test, expect } = require("./fixtures");

test.describe("P-05 Static page", () => {
  test("static page renders title and body", async ({ page }) => {
    await page.goto("/page/about/");

    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page.locator("h1")).toContainText("About");
    await expect(page.locator("article")).toContainText(
      "fixed page used for P-05",
    );
  });
});
