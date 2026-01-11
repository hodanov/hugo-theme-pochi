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
    const targetTitle = await firstPost
      .locator(".post-title h2")
      .innerText();
    const targetPath = new URL(targetHref, page.url()).pathname;

    // Click an internal link to trigger PJAX navigation.
    await firstPost.click();

    // Wait for PJAX swap + history update to the target path.
    await page.waitForFunction(() => window.__pochiSwapDone === true);
    await page.waitForFunction((path) => location.pathname === path, targetPath);

    // Confirm main content was replaced.
    await expect(page.locator("h1")).toHaveText(targetTitle);

    // Ensure post-swap UI behavior remains active.
    const wasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    const toggle = page.locator("#theme-toggle-switch");
    await expect(toggle).toBeVisible();

    await toggle.click();

    await page.waitForFunction(
      (expected) =>
        document.documentElement.classList.contains("dark") === expected,
      !wasDark,
    );
    await expect(toggle).toHaveAttribute("aria-pressed", (!wasDark).toString());
  });
});
