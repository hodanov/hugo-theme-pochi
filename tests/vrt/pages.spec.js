const { test, expect } = require("../e2e/fixtures");
const { VIEWPORTS, settle } = require("./helpers");

// Full-page shots. Shot keys are "<viewport width>-<theme>".
const ALL = ["375-light", "768-light", "1280-light", "375-dark", "1280-dark"];
const PAGES = [
  { id: "home", path: "/", shots: ALL },
  { id: "post-toc", path: "/posts/p-03-with-toc/", shots: ALL },
  { id: "about", path: "/page/about/", shots: ALL },
  {
    id: "post-no-toc",
    path: "/posts/p-04-no-toc/",
    shots: ["375-light", "1280-light", "375-dark", "1280-dark"],
  },
  {
    id: "search",
    path: "/search/?q=TOC",
    waitFor: "#search-results .post-row",
    shots: ["375-light", "1280-light", "1280-dark"],
  },
  { id: "archives", path: "/archives/", shots: ["375-light", "1280-light"] },
  { id: "tag", path: "/tags/alpha/", shots: ["375-light", "1280-light"] },
  { id: "404", path: "/404.html", shots: ["375-light", "1280-light"] },
  { id: "ja-home", path: "/ja/", shots: ["375-light", "1280-light"] },
];

for (const { id, path, waitFor, shots } of PAGES) {
  for (const shot of shots) {
    const [width, theme] = shot.split("-");
    test.describe(`${id} @${shot}`, () => {
      test.use({ viewport: VIEWPORTS[width], colorScheme: theme });

      test("matches baseline", async ({ page }) => {
        await page.goto(path);
        await settle(page, { theme, waitFor });
        await expect(page).toHaveScreenshot(`${id}-${shot}.png`, {
          fullPage: true,
        });
      });
    });
  }
}

// Forced colors (Windows high contrast) replace backgrounds and shadows with
// system colors, so anything drawn only with them must have another cue.
const FORCED = [
  { id: "post-toc", path: "/posts/p-03-with-toc/", width: "1280" },
  { id: "home", path: "/", width: "375" },
];

for (const { id, path, width } of FORCED) {
  test.describe(`${id} @${width}-forced`, () => {
    test.use({ viewport: VIEWPORTS[width], forcedColors: "active" });

    test("matches baseline", async ({ page }) => {
      await page.goto(path);
      await settle(page, { theme: "light" });
      await expect(page).toHaveScreenshot(`${id}-${width}-forced.png`, {
        fullPage: true,
      });
    });
  });
}
