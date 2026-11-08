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

  // The hero is fixed inside <main>. Below its box the page must cover it,
  // also beside the content column (max-width 1200px) on wide screens.
  test("hero stays inside its box after scrolling on a wide screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/page/about/");
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForFunction(() => window.scrollY === 300);

    const hit = await page.evaluate(() => {
      const box = document
        .querySelector(".parallax-container")
        .getBoundingClientRect();
      // Left gutter, just below the hero's box
      const el = document.elementFromPoint(20, box.bottom + 50);
      return { inHero: !!el?.closest(".hero"), tag: el?.tagName };
    });
    expect(hit.inHero).toBe(false);
  });
});
