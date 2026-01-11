const { test, expect } = require("./fixtures");

test.describe("F-03 Theme toggle", () => {
  test("toggles dark class and aria-pressed", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#theme-toggle-switch");
    await expect(toggle).toBeVisible();

    const root = page.locator("html");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(root).not.toHaveClass(/dark/);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(root).toHaveClass(/dark/);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(root).not.toHaveClass(/dark/);
  });
});
