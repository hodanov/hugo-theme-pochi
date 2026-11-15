const { test, expect } = require("./fixtures");

// Markdown output the theme adjusts: tables (render hook) and task lists
// (atoms/content.html)
test.describe("F-20 Markdown content", () => {
  test("a wide table scrolls in a named, focusable region on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/page/styleguide/");

    const region = page.locator(".table-scroll").first();
    await expect(region).toHaveRole("region");
    await expect(region).toHaveAccessibleName("Table 1");
    await expect(region).toHaveAttribute("tabindex", "0");

    const { scrollWidth, clientWidth } = await region.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    // The page itself does not scroll sideways
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(pageOverflow).toBe(false);

    // The keyboard can scroll it
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
  });

  test("task list checkboxes say whether the task is done", async ({
    page,
  }) => {
    await page.goto("/page/styleguide/");

    await expect(
      page.locator('input[type="checkbox"][checked]').first(),
    ).toHaveAccessibleName("Done");
    await expect(
      page.locator('input[type="checkbox"]:not([checked])').first(),
    ).toHaveAccessibleName("Not done");
  });
});
