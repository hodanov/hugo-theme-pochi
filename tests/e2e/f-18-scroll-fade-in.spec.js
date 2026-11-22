const { test, expect } = require("./fixtures");

// The scroll fade-in was removed: cards show as they are, on the first load
// and after a PJAX swap.
test.describe("F-18 No scroll fade-in", () => {
  test("post cards are never hidden for a fade-in", async ({ page }) => {
    await page.goto("/");
    await page.locator(".post-row a").first().click();
    await page.waitForFunction(() => location.pathname !== "/");
    await page.goBack();
    await page.waitForFunction(() => location.pathname === "/");

    const hidden = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll(".post-row")).filter(
          (el) =>
            el.classList.contains("scroll-fade-in") ||
            getComputedStyle(el).opacity !== "1",
        ).length,
    );
    expect(hidden).toBe(0);
    expect(
      await page.locator("body").getAttribute("data-scroll-fade-in"),
    ).toBeNull();
  });
});
