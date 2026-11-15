const { test, expect } = require("./fixtures");

const themeColors = (page) =>
  page.evaluate(() =>
    Array.from(
      document.querySelectorAll('meta[name="theme-color"]'),
      (m) => m.content,
    ),
  );

// Switches the emulated OS scheme and waits until the page has handled the
// change event (a negative assertion alone would pass before it fires)
async function setOsScheme(page, colorScheme) {
  await page.evaluate(() => {
    window.__osChanged = false;
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      () => setTimeout(() => (window.__osChanged = true), 0),
      { once: true },
    );
  });
  await page.emulateMedia({ colorScheme });
  await page.waitForFunction(() => window.__osChanged === true);
}

// One button cycles system -> light -> dark -> system. Its name tells the
// current setting; "system" follows the OS and stores nothing.
test.describe("F-03 Theme toggle", () => {
  test.use({ colorScheme: "light" });

  test("cycles system, light and dark", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#theme-toggle-switch");
    const root = page.locator("html");
    const stored = () =>
      page.evaluate(() => localStorage.getItem("pref-theme"));

    await expect(toggle).toBeVisible();
    await expect(toggle).not.toHaveAttribute("aria-pressed");
    await expect(toggle).toHaveAccessibleName("Theme: System");
    await expect(root).not.toHaveClass(/\bdark\b/);
    expect(await stored()).toBeNull();

    await toggle.click();
    await expect(toggle).toHaveAccessibleName("Theme: Light");
    await expect(root).not.toHaveClass(/\bdark\b/);
    expect(await stored()).toBe("light");

    await toggle.click();
    await expect(toggle).toHaveAccessibleName("Theme: Dark");
    await expect(root).toHaveClass(/\bdark\b/);
    expect(await stored()).toBe("dark");
    // The browser UI follows the chosen theme, not the OS
    expect(await themeColors(page)).toEqual(["#2f2f2f", "#2f2f2f"]);

    await toggle.click();
    await expect(toggle).toHaveAccessibleName("Theme: System");
    await expect(root).not.toHaveClass(/\bdark\b/);
    expect(await stored()).toBeNull();
    expect(await themeColors(page)).toEqual(["#ffffff", "#2f2f2f"]);

    // The choice survives a reload
    await toggle.click();
    await toggle.click();
    await page.reload();
    await expect(toggle).toHaveAccessibleName("Theme: Dark");
    await expect(root).toHaveClass(/\bdark\b/);
  });

  test("OS changes apply only while following the system", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#theme-toggle-switch");
    const root = page.locator("html");

    await setOsScheme(page, "dark");
    await expect(root).toHaveClass(/\bdark\b/);
    await setOsScheme(page, "light");
    await expect(root).not.toHaveClass(/\bdark\b/);
    expect(
      await page.evaluate(() => localStorage.getItem("pref-theme")),
    ).toBeNull();

    // Pick "light"; the OS turning dark no longer changes the page
    await toggle.click();
    await expect(toggle).toHaveAccessibleName("Theme: Light");
    await setOsScheme(page, "dark");
    await expect(root).not.toHaveClass(/\bdark\b/);
    expect(await themeColors(page)).toEqual(["#ffffff", "#ffffff"]);
  });
});
