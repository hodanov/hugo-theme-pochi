const { test, expect } = require("../e2e/fixtures");
const { settle } = require("../vrt/helpers");

// Cards keep their size while their images load: the thumbnail's box comes
// from aspect-ratio, so nothing in the list moves (CLS 0).
const PAGES = ["/", "/archives/", "/tags/pager/"];
const WIDTHS = [375, 1280];

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`cards do not shift while loading: ${path} @${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await settle(page);
      const shifts = await page.evaluate(
        () =>
          new Promise((resolve) => {
            new PerformanceObserver((list) => {
              resolve(
                list
                  .getEntries()
                  .filter((e) => !e.hadRecentInput)
                  .filter((e) =>
                    e.sources.some((s) => s.node?.closest?.(".post-row")),
                  )
                  .map((e) => e.value),
              );
            }).observe({ type: "layout-shift", buffered: true });
            // No entry at all: the observer never fires
            setTimeout(() => resolve([]), 500);
          }),
      );
      const total = shifts.reduce((a, b) => a + b, 0);
      expect(total, `layout shift in cards: ${total}`).toBe(0);
    });
  }
}
