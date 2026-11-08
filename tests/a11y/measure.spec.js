const { test, expect } = require("../e2e/fixtures");
const { settle } = require("../vrt/helpers");

// Line length of running Japanese text (JLREQ: about 35-40 characters). It is
// the paragraph's width over its font size, i.e. how many full-width
// characters fit on a line, measured on the first paragraph of the
// styleguide's text section.
const MEASURE = [
  { width: 375, min: 20 },
  { width: 1280, min: 36, max: 42 },
];

for (const { width, min, max } of MEASURE) {
  test(`Japanese body text fits ${min}${max ? `-${max}` : "+"} characters a line @${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ja/page/styleguide/");
    await settle(page);
    const { inline, fontSize } = await page
      .locator("#sg-text ~ p")
      .first()
      .evaluate((p) => {
        const cs = getComputedStyle(p);
        const inline =
          p.clientWidth -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight);
        return { inline, fontSize: parseFloat(cs.fontSize) };
      });
    const chars = inline / fontSize;
    const range = `${min}${max ? `-${max}` : "+"}`;
    const detail = `${chars.toFixed(1)} characters (${inline}px / ${fontSize}px), expected ${range}`;
    expect(chars, detail).toBeGreaterThanOrEqual(min);
    if (max) expect(chars, detail).toBeLessThanOrEqual(max);
  });
}

// Nothing scrolls the page sideways, down to the 320px of WCAG 1.4.10.
// Wide content (code, tables, long URLs) scrolls inside its own box.
const PAGES = ["/", "/posts/p-03-with-toc/", "/ja/page/styleguide/"];
const WIDTHS = [320, 375, 768, 1280];

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`no sideways page scroll: ${path} @${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await settle(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `page is ${overflow}px wider than the window`).toBe(0);
    });
  }
}
