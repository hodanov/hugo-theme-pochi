const { test, expect } = require("./fixtures");

test.describe("F-07 Archives toggle", () => {
  test("toggles archive year list in sidebar", async ({ page }) => {
    await page.goto("/");

    const yearToggle = page.locator("#sidebar-left .archives-year-toggle").first();
    await expect(yearToggle).toBeVisible();

    const year = await yearToggle.getAttribute("data-year");
    expect(year).toBeTruthy();

    const monthsList = page.locator(`#archives-months-${year}`);
    await expect(monthsList).toBeVisible();
    await expect(yearToggle).toHaveAttribute("aria-expanded", "true");
    await expect(monthsList).not.toHaveClass(/is-collapsed/);

    await yearToggle.click();
    await expect(yearToggle).toHaveAttribute("aria-expanded", "false");
    await expect(monthsList).toHaveClass(/is-collapsed/);

    await yearToggle.click();
    await expect(yearToggle).toHaveAttribute("aria-expanded", "true");
    await expect(monthsList).not.toHaveClass(/is-collapsed/);
  });

  test("toggles archive month cards on archives page", async ({ page }) => {
    await page.goto("/archives/");

    const monthBtn = page.locator(".archive-month-toggle").first();
    await expect(monthBtn).toBeVisible();

    const monthKey = await monthBtn.getAttribute("data-month");
    expect(monthKey).toBeTruthy();

    const cards = page.locator(`#cards-${monthKey}`);
    await expect(monthBtn).toHaveAttribute("aria-expanded", "false");
    await expect(cards).toHaveClass(/is-collapsed/);

    await monthBtn.click();
    await expect(monthBtn).toHaveAttribute("aria-expanded", "true");
    await expect(cards).not.toHaveClass(/is-collapsed/);
    await expect(page).toHaveURL(new RegExp(`#${monthKey}$`));
  });
});
