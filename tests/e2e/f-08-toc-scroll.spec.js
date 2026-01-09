const { test, expect } = require("@playwright/test");

test.describe("F-08 TOC scroll", () => {
  test("toc link scrolls to heading and updates active state", async ({ page }) => {
    await page.goto("/posts/p-03-with-toc/");

    const tocLink = page
      .locator("#sidebar-right .table-of-contents a")
      .nth(2);
    await expect(tocLink).toBeVisible();

    const href = await tocLink.getAttribute("href");
    expect(href).toBeTruthy();

    const hash = new URL(href, page.url()).hash;
    expect(hash).toMatch(/^#.+/);

    await tocLink.click();

    const targetId = hash.replace("#", "");
    const targetHeading = page.locator(`#${targetId}`);
    await expect(targetHeading).toBeVisible();
    await page.waitForFunction((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      const top = el.getBoundingClientRect().top;
      return top >= 0 && top < 160;
    }, targetId);
    await expect(tocLink).toHaveAttribute("aria-current", "location");
  });
});
