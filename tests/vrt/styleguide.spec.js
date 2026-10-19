const { test, expect } = require("../e2e/fixtures");
const { VIEWPORTS, settle } = require("./helpers");

// Section shots of the styleguide page. Each section runs from its
// `h2#sg-*` to the next h2 in the article (or the article's end).
const SECTIONS = [
  { id: "sg-text", shots: ["375-light", "1280-light", "1280-dark"] },
  { id: "sg-table", shots: ["375-light", "1280-light"] },
  { id: "sg-code", shots: ["375-light", "1280-light"] },
  { id: "sg-blocks", shots: ["1280-light", "1280-dark"] },
  { id: "sg-tokens", shots: ["1280-light", "1280-dark"] },
  // Real photos are kept here to check image rendering itself.
  { id: "sg-media", shots: ["1280-light"], realImages: true },
];

for (const { id, shots, realImages } of SECTIONS) {
  for (const shot of shots) {
    const [width, theme] = shot.split("-");
    test.describe(`styleguide ${id} @${shot}`, () => {
      test.use({ viewport: VIEWPORTS[width], colorScheme: theme });

      test("matches baseline", async ({ page }) => {
        await page.goto("/ja/page/styleguide/");
        await settle(page, { theme });
        const clip = await page.evaluate((sectionId) => {
          const heading = document.getElementById(sectionId);
          const article = heading.closest("article");
          const headings = Array.from(article.querySelectorAll("h2"));
          const next = headings[headings.indexOf(heading) + 1];
          const box = article.getBoundingClientRect();
          const top = heading.getBoundingClientRect().top;
          const bottom = next ? next.getBoundingClientRect().top : box.bottom;
          return {
            x: box.left + window.scrollX,
            y: top + window.scrollY,
            width: box.width,
            height: bottom - top,
          };
        }, id);
        await expect(page).toHaveScreenshot(`styleguide-${id}-${shot}.png`, {
          fullPage: true,
          clip,
          ...(realImages ? { stylePath: [] } : {}),
        });
      });
    });
  }
}
