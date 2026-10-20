const { test, expect } = require("./fixtures");

test.describe("F-17 View Transitions", () => {
  test("view transitions data attribute is present", async ({ page }) => {
    await page.goto("/");

    const vt = await page.locator("body").getAttribute("data-view-transitions");
    expect(vt).toBe("true");
  });

  test("PJAX navigation swaps content when VT is enabled", async ({ page }) => {
    await page.goto("/");

    // Set up swap listener
    await page.evaluate(() => {
      window.__pochiSwapDone = false;
      document.addEventListener(
        "pochi:afterSwap",
        () => {
          window.__pochiSwapDone = true;
        },
        { once: true },
      );
    });

    const firstPost = page.locator(".post-row a").first();
    await expect(firstPost).toBeVisible();
    const targetHref = await firstPost.getAttribute("href");
    const targetPath = new URL(targetHref, page.url()).pathname;

    await firstPost.click();

    await page.waitForFunction(() => window.__pochiSwapDone === true);
    await page.waitForFunction(
      (path) => location.pathname === path,
      targetPath,
    );

    // Content should have been replaced
    await expect(page.locator("h1")).toBeVisible();
  });

  test("prefers-reduced-motion disables VT animation duration", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Verify the CSS rule sets animation-duration to 0s for VT pseudo-elements.
    // The rule sits inside @layer, so walk nested rules.
    const rule = await page.evaluate(() => {
      const walk = function* (rules) {
        for (const r of rules) {
          yield r;
          if (r.cssRules) yield* walk(r.cssRules);
        }
      };
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch (_) {
          continue;
        }
        for (const r of walk(rules)) {
          if (
            r instanceof CSSStyleRule &&
            r.selectorText.includes("::view-transition-group(*)") &&
            r.parentRule instanceof CSSMediaRule &&
            r.parentRule.conditionText === "(prefers-reduced-motion: reduce)"
          ) {
            return {
              duration: r.style.getPropertyValue("animation-duration"),
              // Check that the media query matches in this context
              matches: window.matchMedia(r.parentRule.conditionText).matches,
            };
          }
        }
      }
      return null;
    });
    expect(rule).toEqual({ duration: "0s", matches: true });
  });

  test("PJAX navigation works with prefers-reduced-motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await page.evaluate(() => {
      window.__pochiSwapDone = false;
      document.addEventListener(
        "pochi:afterSwap",
        () => {
          window.__pochiSwapDone = true;
        },
        { once: true },
      );
    });

    const firstPost = page.locator(".post-row a").first();
    await expect(firstPost).toBeVisible();
    const targetHref = await firstPost.getAttribute("href");
    const targetPath = new URL(targetHref, page.url()).pathname;

    await firstPost.click();

    await page.waitForFunction(() => window.__pochiSwapDone === true);
    await page.waitForFunction(
      (path) => location.pathname === path,
      targetPath,
    );

    await expect(page.locator("h1")).toBeVisible();
  });

  test("code copy buttons are injected after VT navigation", async ({
    page,
  }) => {
    // Navigate to a post with code blocks via PJAX from home
    const codePostUrl = "/posts/p-15-code-copy/";
    await page.goto("/");

    await page.evaluate(() => {
      window.__pochiSwapDone = false;
      document.addEventListener(
        "pochi:afterSwap",
        () => {
          window.__pochiSwapDone = true;
        },
        { once: true },
      );
    });

    // Navigate via PJAX by clicking a link or programmatically
    const link = page.locator(`a[href="${codePostUrl}"]`).first();
    const linkCount = await link.count();
    if (linkCount > 0) {
      await link.click();
      await page.waitForFunction(() => window.__pochiSwapDone === true);
    } else {
      await page.goto(codePostUrl);
    }

    // Code copy buttons must be present in the new content
    const buttons = page.locator("article pre .code-copy-button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // Each button must have an SVG icon
    const svg = buttons.first().locator("svg");
    await expect(svg).toBeVisible();
  });
});
