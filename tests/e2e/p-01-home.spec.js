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
    // The tag chips are links of their own; the card's link is the title
    const links = card.locator(".post-card-link");
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

  // Up to three tags, each a link to its tag page above the card's link
  test("card shows up to three tags that link to their pages", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.locator(".post-row", {
      has: page.locator("h2", { hasText: "Pagination Post 5" }),
    });
    const tags = card.locator(".post-card-tags a");
    await expect(tags).toHaveCount(3);
    await expect(tags.first()).toHaveText(/pager/i);

    // A plain click lands on the tag, not on the card's link under it
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/tags/pager/"),
      tags.first().click(),
    ]);
  });

  test("card's excerpt is cut after three lines", async ({ page }) => {
    await page.goto("/");

    const excerpt = page
      .locator(".post-row", {
        has: page.locator("h2", { hasText: "Pagination Post 5" }),
      })
      .locator(".post-excerpt");
    const { lines, cut } = await excerpt.evaluate((el) => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      return {
        lines: Math.round(el.clientHeight / lineHeight),
        cut: el.scrollHeight > el.clientHeight,
      };
    });
    expect(lines).toBe(3);
    expect(cut).toBe(true);
  });
});
