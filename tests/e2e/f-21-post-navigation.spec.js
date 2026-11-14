const { test, expect } = require("./fixtures");

// N-02: what a reader needs to go on from a post — how long it takes,
// the posts before and after it, and a link to each heading.
test.describe("F-21 Post navigation", () => {
  test("the reading time sits on the date line of a post", async ({ page }) => {
    await page.goto("/posts/p-03-with-toc/");
    const readingTime = page.locator("article .kiji-date .reading-time");
    await expect(readingTime).toHaveText(/\d+ min read/);
  });

  test("the reading time is translated", async ({ page }) => {
    await page.goto("/ja/posts/p-01-sample-1/");
    await expect(page.locator("article .reading-time")).toHaveText(/約 \d+ 分/);
  });

  test("cards in a list show no reading time", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".post-row").first()).toBeVisible();
    await expect(page.locator(".post-row .reading-time")).toHaveCount(0);
  });

  test("links to the older and newer posts follow the article", async ({
    page,
  }) => {
    // p-03 (2024-03-10) sits between p-01-sample-2 (02-15) and p-15 (03-15)
    await page.goto("/posts/p-03-with-toc/");
    const nav = page.getByRole("navigation", {
      name: "Previous and next posts",
    });
    await expect(nav).toBeVisible();

    const prev = nav.locator('a[rel="prev"]');
    const next = nav.locator('a[rel="next"]');
    await expect(prev).toContainText("Sample Post Two");
    await expect(prev).toHaveAttribute("href", /\/posts\/p-01-sample-2\/$/);
    await expect(next).toContainText("Post With Code Blocks");
    await expect(next).toHaveAttribute("href", /\/posts\/p-15-code-copy\/$/);

    // Right after the article, before the comments
    const order = await page.evaluate(() => {
      const nav = document.querySelector(".post-nav");
      const article = document.querySelector("#contents article");
      const comments = document.querySelector(".comment-wrapper");
      const follows = (a, b) =>
        !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        afterArticle: follows(article, nav),
        beforeComments: !comments || follows(nav, comments),
      };
    });
    expect(order).toEqual({ afterArticle: true, beforeComments: true });
  });

  test("the oldest post links only to a newer one", async ({ page }) => {
    await page.goto("/posts/p-00-archive-2023/");
    const nav = page.locator(".post-nav");
    await expect(nav.locator('a[rel="next"]')).toHaveCount(1);
    await expect(nav.locator('a[rel="prev"]')).toHaveCount(0);
  });

  test("each heading has a link to itself, shown on focus", async ({
    page,
  }) => {
    await page.goto("/posts/p-03-with-toc/");
    const heading = page.locator("article h2#section-a");
    await expect(heading).toHaveText("Section A");

    const anchor = page.getByRole("link", {
      name: "Link to this section: Section A",
    });
    await expect(anchor).toHaveAttribute("href", "#section-a");
    await expect(anchor).toHaveCSS("opacity", "0");

    await anchor.focus();
    await expect(anchor).toHaveCSS("opacity", "1");
    await anchor.click();
    await expect(page).toHaveURL(/#section-a$/);
  });
});
