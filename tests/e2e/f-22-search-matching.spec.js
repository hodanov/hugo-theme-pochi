const { test, expect } = require("./fixtures");

// N-05: the search finds a word wherever it is in a post, takes several
// words (all of them must appear), does not match a Japanese word by one
// of its characters, and says what to try when nothing is found.
async function search(page, path, query) {
  await page.goto(`${path}?q=${encodeURIComponent(query)}`);
  await expect(page.locator(".search-loading")).toBeHidden();
}

const titles = (page) =>
  page.locator("#search-results .post-card-link").allTextContents();

test.describe("F-22 Search matching", () => {
  test("a word far into a post is found", async ({ page }) => {
    await search(page, "/ja/search/", "形態素解析");
    expect(await titles(page)).toEqual(["サンプル記事1"]);
  });

  test("several words must all appear, in any place", async ({ page }) => {
    await search(page, "/ja/search/", "形態素解析　サンプル");
    expect(await titles(page)).toEqual(["サンプル記事1"]);

    await search(page, "/ja/search/", "形態素解析 存在しない語");
    expect(await titles(page)).toEqual([]);
  });

  test("a Japanese word does not match by one character", async ({ page }) => {
    // 「記」 is in the post (記事), 「録」 is not
    await search(page, "/ja/search/", "記録");
    expect(await titles(page)).toEqual([]);
  });

  test("posts without the word are left out", async ({ page }) => {
    // Fuse's defaults also listed the code-blocks, pagination and lightbox
    // posts for "TOC"
    await search(page, "/search/", "TOC");
    expect((await titles(page)).sort()).toEqual([
      "Post With TOC",
      "Post Without TOC",
    ]);
  });

  test("an English word still forgives a typo", async ({ page }) => {
    await search(page, "/search/", "Pagnation");
    expect((await titles(page)).length).toBeGreaterThan(0);
  });

  test("no results suggest what to try next", async ({ page }) => {
    await search(page, "/search/", "no-results-keyword-xyz");
    const help = page.locator(".search-results-help");
    await expect(help).toBeVisible();
    await expect(help.getByRole("link", { name: "Tags" })).toHaveAttribute(
      "href",
      "/tags/",
    );
    await expect(help.getByRole("link", { name: "Archives" })).toHaveAttribute(
      "href",
      "/archives/",
    );
  });

  test("the suggestions stay hidden when something is found", async ({
    page,
  }) => {
    await search(page, "/search/", "TOC");
    await expect(
      page.locator("#search-results .post-row").first(),
    ).toBeVisible();
    await expect(page.locator(".search-results-help")).toBeHidden();
  });
});

// N-01 follow-up: the related posts come from the site's `related` config.
// example_site counts newer posts too, so the oldest "alpha" post now
// lists the newer one.
test.describe("F-22 Related posts", () => {
  test("an older post lists a newer one with the same tag", async ({
    page,
  }) => {
    await page.goto("/posts/p-01-sample-1/");
    await expect(
      page.locator(".related-posts .post-card-link").first(),
    ).toHaveText("Post With TOC");
  });
});
