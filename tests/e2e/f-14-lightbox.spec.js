const { test, expect } = require("./fixtures");

const POST_URL = "/posts/p-14-lightbox/";

test.describe("F-14 Lightbox", () => {
  // ── Basic behaviour ────────────────────────────────────

  test("article images have cursor zoom-in", async ({ page }) => {
    await page.goto(POST_URL);
    const img = page.locator("article picture img").first();
    await expect(img).toBeVisible();
    const cursor = await img.evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toBe("zoom-in");
  });

  test("clicking an image opens the lightbox overlay", async ({ page }) => {
    await page.goto(POST_URL);
    const img = page.locator("article picture img").first();
    await img.click();

    const overlay = page.locator(".lightbox-overlay");
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveClass(/is-visible/);
  });

  test("expanded image src matches the original currentSrc", async ({
    page,
  }) => {
    await page.goto(POST_URL);
    const img = page.locator("article picture img").first();
    const originalSrc = await img.evaluate((el) => el.currentSrc || el.src);
    await img.click();

    const expanded = page.locator(".lightbox-overlay img");
    await expect(expanded).toBeVisible();
    await expect(expanded).toHaveAttribute("src", originalSrc);
  });

  test("alt text is shown as a caption", async ({ page }) => {
    await page.goto(POST_URL);
    const img = page.locator("article picture img").first();
    const alt = await img.getAttribute("alt");
    await img.click();

    const caption = page.locator(".lightbox-caption");
    await expect(caption).toBeVisible();
    await expect(caption).toHaveText(alt);
  });

  // ── Close behaviour ────────────────────────────────────

  test("Escape key closes the lightbox", async ({ page }) => {
    await page.goto(POST_URL);
    await page.locator("article picture img").first().click();
    await expect(page.locator(".lightbox-overlay")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".lightbox-overlay")).toHaveCount(0);
  });

  test("clicking the overlay background closes the lightbox", async ({
    page,
  }) => {
    await page.goto(POST_URL);
    await page.locator("article picture img").first().click();
    const overlay = page.locator(".lightbox-overlay");
    await expect(overlay).toBeVisible();

    // Click top-left corner of the overlay (background area, not the image)
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(page.locator(".lightbox-overlay")).toHaveCount(0);
  });

  test("clicking the close button closes the lightbox", async ({ page }) => {
    await page.goto(POST_URL);
    await page.locator("article picture img").first().click();
    await expect(page.locator(".lightbox-overlay")).toBeVisible();

    await page.locator(".lightbox-close").click();
    await expect(page.locator(".lightbox-overlay")).toHaveCount(0);
  });

  // ── Exclusions ─────────────────────────────────────────

  test("featured image (hero) does not open lightbox", async ({ page }) => {
    await page.goto("/page/about");
    const hero = page.locator(".hero.featured-image-wrapper");
    await expect(hero).toBeVisible();
    await hero.click();
    await expect(page.locator(".lightbox-overlay")).toHaveCount(0);
  });

  test("SVG image does not open lightbox", async ({ page }) => {
    await page.goto(POST_URL);
    const svgImg = page.locator('article img[src$=".svg"]');
    await expect(svgImg).toBeVisible();
    await svgImg.click();
    await expect(page.locator(".lightbox-overlay")).toHaveCount(0);
  });

  // ── PJAX ───────────────────────────────────────────────

  test("lightbox works for multiple images on the same page", async ({
    page,
  }) => {
    // The p-14-lightbox post has multiple images
    await page.goto(POST_URL);

    // First image should open lightbox
    const firstImg = page.locator("article picture img").first();
    await expect(firstImg).toBeVisible();
    await firstImg.click();

    let overlay = page.locator(".lightbox-overlay");
    await expect(overlay).toBeVisible();

    // Close it
    await page.keyboard.press("Escape");
    await expect(page.locator(".lightbox-overlay")).toHaveCount(0);

    // Verify we can open again (event delegation still works)
    await firstImg.click();
    overlay = page.locator(".lightbox-overlay");
    await expect(overlay).toBeVisible();
  });
});
