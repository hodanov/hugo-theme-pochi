const { test, expect } = require("./fixtures");
const { devices } = require("@playwright/test");

function mockLikeApi(page) {
  let postCount = 0;
  return page.route("**/like?slug=*", (route) => {
    const method = route.request().method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slug: "p-03-with-toc", count: 5 }),
      });
    }
    if (method === "POST") {
      postCount++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slug: "p-03-with-toc", count: 5 + postCount }),
      });
    }
    return route.continue();
  });
}

test.describe("F-10 Like button", () => {
  test("increments count and marks as liked", async ({ page }) => {
    await mockLikeApi(page);

    await page.goto("/posts/p-03-with-toc/");

    const likeBtn = page.locator("[data-like-button]").first();
    const countEl = page.locator("[data-like-count]").first();

    await expect(likeBtn).toBeVisible();

    // Wait for initial count to load from mock API
    await expect(countEl).toHaveText("5");
    await expect(likeBtn).toHaveAttribute("aria-pressed", "false");

    // Click like
    await likeBtn.click();

    // Count increments and button shows liked state
    await expect(countEl).toHaveText("6");
    await expect(likeBtn).toHaveAttribute("aria-pressed", "true");

    // Second click is ignored (already liked via localStorage)
    await likeBtn.click();
    await expect(countEl).toHaveText("6");
  });

  test("mobile: action bar is visible and functional", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();

    await mockLikeApi(page);

    await page.goto("/posts/p-03-with-toc/");

    const actionBar = page.locator("#action-bar-mobile");
    await expect(actionBar).toBeVisible();

    const likeBtn = actionBar.locator("[data-like-button]");
    const countEl = actionBar.locator("[data-like-count]");

    await expect(likeBtn).toBeVisible();
    await expect(countEl).toHaveText("5");

    await likeBtn.click();
    await expect(countEl).toHaveText("6");
    await expect(likeBtn).toHaveAttribute("aria-pressed", "true");

    await context.close();
  });

  test("mobile: action bar shown on posts without TOC", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();

    await mockLikeApi(page);

    await page.goto("/posts/p-04-no-toc/");

    const actionBar = page.locator("#action-bar-mobile");
    await expect(actionBar).toBeVisible();

    const likeBtn = actionBar.locator("[data-like-button]");
    await expect(likeBtn).toBeVisible();

    await context.close();
  });
});
