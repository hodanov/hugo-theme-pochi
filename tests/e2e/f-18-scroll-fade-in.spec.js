const { test, expect } = require("./fixtures");

test.describe("F-18 Scroll fade-in", () => {
  test("does not mark targets when the feature is disabled", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalGetAttribute = Element.prototype.getAttribute;
      Element.prototype.getAttribute = function (name) {
        if (this === document.body && name === "data-scroll-fade-in") {
          return "false";
        }
        return originalGetAttribute.call(this, name);
      };
    });

    await page.goto("/");

    const firstCard = page.locator(".post-row").first();
    await expect(firstCard).not.toHaveClass(/scroll-fade-in/);
    await expect(firstCard).not.toHaveClass(/is-visible/);
  });

  test("exposes the scroll fade-in toggle on body", async ({ page }) => {
    await page.goto("/");

    const enabled = await page
      .locator("body")
      .getAttribute("data-scroll-fade-in");
    expect(enabled).toBe("true");
  });

  test("marks post cards and reveals visible cards", async ({ page }) => {
    await page.goto("/");

    const firstCard = page.locator(".post-row").first();
    await expect(firstCard).toHaveClass(/scroll-fade-in/);
    await expect(firstCard).toHaveClass(/is-visible/);
  });

  test("disables motion when prefers-reduced-motion is enabled", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const firstCard = page.locator(".post-row").first();
    await expect(firstCard).toHaveClass(/scroll-fade-in/);

    const styles = await firstCard.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        opacity: computed.opacity,
        transform: computed.transform,
        transitionDuration: computed.transitionDuration,
      };
    });

    expect(styles.opacity).toBe("1");
    expect(styles.transform).toBe("none");
    expect(styles.transitionDuration).toBe("0s");
  });

  test("re-initializes after PJAX and reveals related posts", async ({
    page,
  }) => {
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
    await firstPost.click();

    await page.waitForFunction(() => window.__pochiSwapDone === true);

    const relatedItems = page.locator(".related-posts .related-post-item");
    await expect(relatedItems.first()).toHaveClass(/scroll-fade-in/);

    await relatedItems.first().scrollIntoViewIfNeeded();
    await expect(relatedItems.first()).toHaveClass(/is-visible/);
  });
});
