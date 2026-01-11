const { test, expect } = require("./fixtures");

test.describe("P-07 Archives page", () => {
  test("archives page shows years and toggles month cards", async ({ page }) => {
    await page.goto("/archives/");

    await expect(page.locator(".main-content")).toBeVisible();

    const year = page.locator("details.archive-year").first();
    await expect(year).toBeVisible();

    const monthBtn = page.locator(".archive-month-toggle").first();
    await expect(monthBtn).toBeVisible();
    const monthKey = await monthBtn.getAttribute("data-month");
    expect(monthKey).toBeTruthy();

    await monthBtn.click();

    const cards = page.locator(`#cards-${monthKey}`);
    await expect(cards).toBeVisible();
    await expect(cards).not.toHaveClass(/is-collapsed/);
    await expect(monthBtn).toHaveAttribute("aria-expanded", "true");

    const rows = cards.locator(".post-row");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
