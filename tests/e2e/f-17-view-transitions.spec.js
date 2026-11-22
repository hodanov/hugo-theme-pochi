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
  test.describe("transition kinds", () => {
    // Records every value <html data-vt> takes, so a test can tell which
    // kind of transition ran and that the attribute was cleared after it.
    const recordVtKinds = (page) =>
      page.evaluate(() => {
        window.__pochiVtKinds = [];
        new MutationObserver(() => {
          window.__pochiVtKinds.push(
            document.documentElement.getAttribute("data-vt"),
          );
        }).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-vt"],
        });
      });

    test("a PJAX navigation runs as a page transition", async ({ page }) => {
      await page.goto("/");
      await recordVtKinds(page);

      const firstPost = page.locator(".post-row a").first();
      const targetPath = new URL(
        await firstPost.getAttribute("href"),
        page.url(),
      ).pathname;
      await firstPost.click();
      await page.waitForFunction(
        (path) => location.pathname === path,
        targetPath,
      );
      await page.waitForFunction(
        () => !document.documentElement.hasAttribute("data-vt"),
      );

      const kinds = await page.evaluate(() => window.__pochiVtKinds);
      expect(kinds).toEqual(["page", null]);
    });

    test("the theme toggle runs as a theme transition", async ({ page }) => {
      await page.goto("/");
      await recordVtKinds(page);

      await page.locator("#theme-toggle-switch").click();
      await page.waitForFunction(
        () => !document.documentElement.hasAttribute("data-vt"),
      );

      const kinds = await page.evaluate(() => window.__pochiVtKinds);
      expect(kinds).toEqual(["theme", null]);
    });

    test("an OS color scheme change runs as a theme transition", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/");
      await recordVtKinds(page);

      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForFunction(() =>
        document.documentElement.classList.contains("dark"),
      );
      await page.waitForFunction(
        () => !document.documentElement.hasAttribute("data-vt"),
      );

      const kinds = await page.evaluate(() => window.__pochiVtKinds);
      expect(kinds).toEqual(["theme", null]);
    });

    test("the main content is named only during a page change", async ({
      page,
    }) => {
      await page.goto("/");
      const nameWith = (kind) =>
        page.evaluate((kind) => {
          const root = document.documentElement;
          if (kind) root.setAttribute("data-vt", kind);
          else root.removeAttribute("data-vt");
          return getComputedStyle(document.querySelector(".main-content"))
            .viewTransitionName;
        }, kind);

      // At rest the name would make main a stacking context
      expect(await nameWith(null)).toBe("none");
      expect(await nameWith("page")).toBe("pochi-main");
      expect(await nameWith("theme")).toBe("none");
    });

    test("full page loads opt in to cross-document transitions", async ({
      page,
    }) => {
      await page.goto("/");
      const found = await page.evaluate(() => {
        const walk = function* (rules) {
          for (const r of rules) {
            yield r;
            if (r.cssRules) yield* walk(r.cssRules);
          }
        };
        for (const sheet of document.styleSheets) {
          for (const r of walk(sheet.cssRules)) {
            if (/^@view-transition\b/.test(r.cssText)) return r.cssText;
          }
        }
        return null;
      });
      expect(found).toMatch(/navigation:\s*auto/);
    });
  });
});
