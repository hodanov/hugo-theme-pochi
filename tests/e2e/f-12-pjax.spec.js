const { test, expect } = require("./fixtures");

test.describe("F-12 PJAX navigation", () => {
  test("updates content and keeps theme toggle working", async ({ page }) => {
    await page.goto("/");

    // PJAX swaps dispatch "pochi:afterSwap"; use it as a reliable signal of swap.
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
    // The card's only link is its title
    const targetTitle = await firstPost.innerText();
    const targetPath = new URL(targetHref, page.url()).pathname;

    // Click an internal link to trigger PJAX navigation.
    await firstPost.click();

    // Wait for PJAX swap + history update to the target path.
    await page.waitForFunction(() => window.__pochiSwapDone === true);
    await page.waitForFunction(
      (path) => location.pathname === path,
      targetPath,
    );

    // Confirm main content was replaced.
    await expect(page.locator("h1")).toHaveText(targetTitle);

    // Ensure post-swap UI behavior remains active: the toggle still cycles
    // system -> light -> dark
    const toggle = page.locator("#theme-toggle-switch");
    await expect(toggle).toBeVisible();

    await toggle.click();
    await toggle.click();
    await expect(toggle).toHaveAccessibleName("Theme: Dark");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });

  // After a swap, focus moves to the new page's h1 and the title is read out
  // from a live region outside the swapped content; back/forward leaves
  // focus alone.
  test("moves focus to the h1 and announces the title", async ({ page }) => {
    await page.goto("/");

    const firstPost = page.locator(".post-row a").first();
    const targetTitle = await firstPost.innerText();
    const targetPath = new URL(await firstPost.getAttribute("href"), page.url())
      .pathname;

    await firstPost.click();
    await page.waitForURL((url) => url.pathname === targetPath);

    const h1 = page.locator("main h1");
    await expect(h1).toHaveText(targetTitle);
    await expect(h1).toBeFocused();
    // The page did not jump to the h1; it stays at the top
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const announcer = page.locator("#pjax-announcer");
    await expect(announcer).toHaveAttribute("aria-live", "polite");
    await expect(announcer).toHaveText(await page.title());
    // It lives outside the swapped content
    expect(await announcer.evaluate((el) => !el.closest(".main-content"))).toBe(
      true,
    );

    // Back: the home page comes back, focus is not moved to its h1
    await page.locator("#logo-container").focus();
    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator(".post-row").first()).toBeVisible();
    await expect(announcer).toHaveText(await page.title());
    await expect(page.locator("main h1")).not.toBeFocused();
  });
});
