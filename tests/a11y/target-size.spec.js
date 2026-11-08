const { test, expect } = require("../e2e/fixtures");
const { VIEWPORTS, settle } = require("../vrt/helpers");

// The main controls must be at least 44 x 44 CSS px (--pochi-target-min,
// WCAG 2.5.5). Every other target is held to 24px by axe's target-size rule
// (WCAG 2.5.8) in axe.spec.js. Each selector must match at least one visible
// element, so a renamed control fails here instead of passing unmeasured.
const MIN = 44;

const CASES = [
  {
    path: "/posts/p-03-with-toc/",
    width: 375,
    selectors: [
      "#menu-bar-btn",
      "#theme-toggle-switch",
      "#action-bar-mobile .like-btn",
      "#action-bar-mobile .share-btn",
      "#action-bar-mobile .scroll-top-btn",
    ],
  },
  {
    path: "/posts/p-03-with-toc/",
    width: 375,
    openDrawer: true,
    selectors: ["#side-nav-close"],
  },
  {
    path: "/posts/p-03-with-toc/",
    width: 1280,
    selectors: [
      "#theme-toggle-switch",
      "#sidebar-left .like-btn",
      "#sidebar-left .share-btn",
      "#sidebar-left .sns-share-link",
      "#scroll-to-top",
    ],
  },
  {
    path: "/posts/p-15-code-copy/",
    width: 375,
    selectors: ["pre .code-copy-button"],
  },
  {
    path: "/posts/p-15-code-copy/",
    width: 1280,
    selectors: ["pre .code-copy-button"],
  },
  { path: "/", width: 375, selectors: ["#searchsubmit"] },
  { path: "/", width: 1280, selectors: ["#searchsubmit"] },
];

for (const { path, width, openDrawer, selectors } of CASES) {
  const name = `${path} @${width}${openDrawer ? " (drawer open)" : ""}`;
  test(`main controls are ${MIN}px or larger: ${name}`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[width]);
    await page.goto(path);
    await settle(page);
    if (openDrawer) {
      await page.locator("#menu-bar-btn").click();
      await expect(page.locator("#side-nav-close")).toBeInViewport();
    }

    const sizes = await page.evaluate((list) => {
      const rows = [];
      for (const selector of list) {
        const visible = Array.from(document.querySelectorAll(selector)).filter(
          (el) => el.getClientRects().length > 0,
        );
        if (visible.length === 0) rows.push({ selector, missing: true });
        for (const el of visible) {
          const { width: w, height: h } = el.getBoundingClientRect();
          rows.push({ selector, width: w, height: h });
        }
      }
      return rows;
    }, selectors);

    const problems = sizes
      .filter((s) => s.missing || s.width < MIN || s.height < MIN)
      .map((s) =>
        s.missing
          ? `${s.selector}: 見えている要素が無い`
          : `${s.selector}: ${s.width.toFixed(1)} x ${s.height.toFixed(1)}px`,
      );
    expect(problems, `${MIN}px に満たない操作対象`).toEqual([]);
  });
}
