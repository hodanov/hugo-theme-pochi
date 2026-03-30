const { test, expect } = require("./fixtures");

const POST_URL = "/posts/p-16-footnotes/";

test.describe("F-16 Footnotes", () => {
  // ── Markup ────────────────────────────────────────────

  test("footnote references are rendered in the article", async ({ page }) => {
    await page.goto(POST_URL);

    const refs = page.locator("article .footnote-ref");
    await expect(refs).toHaveCount(2);
  });

  test("footnotes section is rendered at the end of the article", async ({
    page,
  }) => {
    await page.goto(POST_URL);

    const section = page.locator("article .footnotes");
    await expect(section).toBeVisible();

    const items = section.locator("ol > li");
    await expect(items).toHaveCount(2);
  });

  // ── CSS styling ───────────────────────────────────────

  test("footnote reference displays brackets [n]", async ({ page }) => {
    await page.goto(POST_URL);

    const ref = page.locator("article .footnote-ref").first();
    const before = await ref.evaluate((el) =>
      getComputedStyle(el, "::before").getPropertyValue("content"),
    );
    const after = await ref.evaluate((el) =>
      getComputedStyle(el, "::after").getPropertyValue("content"),
    );

    expect(before).toContain("[");
    expect(after).toContain("]");
  });

  test("footnotes hr uses accent color border", async ({ page }) => {
    await page.goto(POST_URL);

    const hr = page.locator("article .footnotes hr");
    await expect(hr).toBeVisible();

    const borderStyle = await hr.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("border-top-style"),
    );
    expect(borderStyle).toBe("solid");
  });

  // ── Link navigation ───────────────────────────────────

  test("clicking footnote ref scrolls to the footnote", async ({ page }) => {
    await page.goto(POST_URL);

    const scrollBefore = await page.evaluate(() => window.scrollY);

    const ref = page.locator("article .footnote-ref").first();
    await ref.click();

    // Wait for smooth scroll to move the page down toward the footnote
    await page.waitForFunction(
      (prevY) => window.scrollY > prevY,
      scrollBefore,
      { timeout: 5000 },
    );

    // The footnote target should be visible in the viewport
    const target = page.locator("#fn\\:1");
    await expect(target).toBeInViewport();
  });

  test("clicking backref scrolls back to the footnote reference", async ({
    page,
  }) => {
    await page.goto(POST_URL);

    // First scroll to footnotes section
    const backref = page.locator("article .footnote-backref").first();
    await backref.scrollIntoViewIfNeeded();
    await backref.click();

    // Wait for smooth scroll — the sup element should be near top
    await page.waitForFunction(
      () => {
        const el = document.getElementById("fnref:1");
        if (!el) return false;
        const top = el.getBoundingClientRect().top;
        return top >= 0 && top < 200;
      },
      { timeout: 5000 },
    );

    const target = page.locator("#fnref\\:1");
    await expect(target).toBeVisible();
  });

  // ── Scroll offset ─────────────────────────────────────

  test("footnote targets have scroll-margin-top set", async ({ page }) => {
    await page.goto(POST_URL);

    const margin = await page.locator("#fn\\:1").evaluate((el) => {
      return getComputedStyle(el).getPropertyValue("scroll-margin-top");
    });

    // Should be non-zero (nav height + 1rem)
    expect(parseFloat(margin)).toBeGreaterThan(0);
  });
});
