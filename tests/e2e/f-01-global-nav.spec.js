const { test, expect } = require("./fixtures");

test.describe("F-01 Global navigation", () => {
  test("nav link navigates to about page", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".site-nav")).toBeVisible();

    const aboutLink = page.locator('#menu-global-nav a[href="/page/about/"]');
    await expect(aboutLink).toBeVisible();

    await Promise.all([page.waitForURL("**/page/about/"), aboutLink.click()]);

    await expect(page.locator("h1")).toContainText("About");
  });
});

test.describe("F-01 Global navigation dropdown (disclosure)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("button opens and closes the submenu", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#menu-global-nav .dropdown-toggle");
    const list = page.locator("#menu-global-nav .dropdown-list");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAccessibleName("Posts submenu");
    // No ARIA menu roles: these are plain links in a list
    await expect(page.locator('#menu-global-nav [role="menu"]')).toHaveCount(0);

    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(list).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(list).toBeHidden();
  });

  test("Tab goes through the open submenu, Escape returns to the button", async ({
    page,
  }) => {
    await page.goto("/");

    const toggle = page.locator("#menu-global-nav .dropdown-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    // visibility switches on the first frame of the transition
    await expect(page.locator("#menu-global-nav .dropdown-list")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(
      page.locator('#menu-global-nav .dropdown-list a[href="/archives/"]'),
    ).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("submenu closes when focus leaves it", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#menu-global-nav .dropdown-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#menu-global-nav .dropdown-list")).toBeVisible();
    // Past the two links in the list
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("submenu is hidden from the keyboard until opened", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#menu-global-nav .dropdown-toggle");
    await toggle.focus();
    await page.keyboard.press("Tab");
    await expect(
      page.locator("#menu-global-nav .dropdown-list a").first(),
    ).not.toBeFocused();
  });

  test("toggle still works after PJAX navigation", async ({ page }) => {
    await page.goto("/");
    await Promise.all([
      page.waitForURL("**/page/about/"),
      page.locator('#menu-global-nav a[href="/page/about/"]').click(),
    ]);

    const toggle = page.locator("#menu-global-nav .dropdown-toggle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
