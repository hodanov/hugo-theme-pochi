const { test, expect } = require("./fixtures");

test.describe("P-01 Home", () => {
  test("home shows main content and at least one post card", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator(".main-content")).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    const cards = page.locator(".post-row");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  // Card pattern: the title is the only link (so its name is the title),
  // and its ::after makes the whole card clickable
  test("card's link is the title and the whole card is clickable", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.locator(".post-row").first();
    const links = card.locator("a");
    await expect(links).toHaveCount(1);
    const title = await card.locator("h2").innerText();
    await expect(links.first()).toHaveAccessibleName(title);
    // The thumbnail does not repeat the title
    await expect(card.locator("img").first()).toHaveAttribute("alt", "");

    // Permalinks carry the build's host; compare the path
    const path = new URL(await links.first().getAttribute("href")).pathname;
    // Click on the excerpt, away from the title. The link's ::after covers
    // it, so a locator click would refuse; click the spot with the mouse.
    const box = await card.locator(".post-excerpt").boundingBox();
    await Promise.all([
      page.waitForURL((url) => url.pathname === path),
      page.mouse.click(box.x + box.width / 2, box.y + box.height / 2),
    ]);
  });
});
