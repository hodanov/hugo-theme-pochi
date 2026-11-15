const { test, expect } = require("./fixtures");

// The side nav is a modal <dialog>: the browser traps focus, makes the page
// behind it inert, closes it on Escape and puts focus back on the button
// that opened it.
test.describe("F-02 Side navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("opens and closes via toggle and close button", async ({ page }) => {
    await page.goto("/");

    const sideNav = page.locator("#side-nav");
    const openBtn = page.locator("#menu-bar-btn");
    const closeBtn = page.locator("#side-nav-close");

    await expect(sideNav).toBeHidden();
    await expect(openBtn).toHaveAttribute("aria-expanded", "false");

    await openBtn.click();
    await expect(sideNav).toBeVisible();
    await expect(sideNav).toHaveJSProperty("open", true);
    await expect(sideNav).toHaveAccessibleName(/.+/);
    await expect(openBtn).toHaveAttribute("aria-expanded", "true");
    // Focus moves into the dialog
    await expect(closeBtn).toBeFocused();

    await closeBtn.click();
    await expect(sideNav).toBeHidden();
    await expect(openBtn).toHaveAttribute("aria-expanded", "false");
    await expect(openBtn).toBeFocused();
  });

  test("traps Tab inside and returns focus on Escape", async ({ page }) => {
    await page.goto("/");

    const sideNav = page.locator("#side-nav");
    const openBtn = page.locator("#menu-bar-btn");

    await openBtn.focus();
    await page.keyboard.press("Enter");
    await expect(sideNav).toBeVisible();

    // Walk past every focusable element in the drawer; focus must stay in it
    const stops = await sideNav.locator("a[href], button").count();
    for (let i = 0; i < stops + 2; i++) {
      await page.keyboard.press("Tab");
      const inside = await sideNav.evaluate((el) =>
        el.contains(document.activeElement),
      );
      // Chrome lets Tab reach the browser UI after the last element of a
      // modal dialog; then the page has no focused element at all.
      const onBody = await page.evaluate(
        () => document.activeElement === document.body,
      );
      expect(inside || onBody).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(sideNav).toBeHidden();
    await expect(openBtn).toHaveAttribute("aria-expanded", "false");
    await expect(openBtn).toBeFocused();
  });

  test("closes on a click outside the drawer", async ({ page }) => {
    await page.goto("/");

    const sideNav = page.locator("#side-nav");
    await page.locator("#menu-bar-btn").click();
    await expect(sideNav).toBeVisible();

    // The backdrop covers the page to the right of the 280px drawer
    await page.mouse.click(340, 400);
    await expect(sideNav).toBeHidden();
    await expect(page.locator("#menu-bar-btn")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("closes when a link inside is followed", async ({ page }) => {
    await page.goto("/");

    const sideNav = page.locator("#side-nav");
    await page.locator("#menu-bar-btn").click();
    await expect(sideNav).toBeVisible();

    const link = sideNav.locator("#menu-global-nav-for-phone a").first();
    const path = new URL(await link.getAttribute("href"), page.url()).pathname;
    await link.click();
    await page.waitForURL((url) => url.pathname === path);
    await expect(sideNav).toBeHidden();
  });
});
