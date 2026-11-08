const { test, expect } = require("./fixtures");

// In-page links (skip link, table of contents) move focus to their target,
// and the target is not left under the fixed nav bar (WCAG 2.4.1 / 2.4.11).
test.describe("F-19 In-page links", () => {
  test("skip link is the first stop and moves focus to main", async ({
    page,
  }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("table of contents link focuses the heading below the nav bar", async ({
    page,
  }) => {
    // Reduced motion makes the jump instant, so the position can be read
    // right away. A long page, so the heading can reach the top.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/page/styleguide/");

    const hash = "sg-code";
    await page
      .locator(`#sidebar-right .table-of-contents a[href="#${hash}"]`)
      .click();

    const heading = page.locator(`[id="${hash}"]`);
    await expect(heading).toBeFocused();
    const { top, navBottom } = await heading.evaluate((el) => ({
      top: el.getBoundingClientRect().top,
      navBottom: document.querySelector("nav.site-nav").getBoundingClientRect()
        .bottom,
    }));
    expect(top).toBeGreaterThanOrEqual(navBottom);
  });
});
