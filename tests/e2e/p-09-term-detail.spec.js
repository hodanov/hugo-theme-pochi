const { test, expect } = require("./fixtures");

test.describe("P-09 Term detail", () => {
  const targets = [
    { path: "/tags/alpha/", name: "tag" },
    { path: "/categories/news/", name: "category" },
  ];

  for (const target of targets) {
    test(`${target.name} detail shows post list`, async ({ page }) => {
      await page.goto(target.path);

      await expect(page.locator(".main-content")).toBeVisible();

      const listItems = page.locator(".post-row");
      await expect(listItems.first()).toBeVisible();
      const count = await listItems.count();
      expect(count).toBeGreaterThan(0);
    });
  }
});

// N-04: a term page says how many posts it holds, and what it is about
// when the term has a description (content/tags/alpha/_index.md).
test.describe("P-09 Term detail header", () => {
  test("the tag page shows its post count and description", async ({
    page,
  }) => {
    await page.goto("/tags/alpha/");
    await expect(page.locator("#contents h1")).toHaveText("Alpha");
    await expect(page.locator(".term-count")).toHaveText("2 posts");
    await expect(page.locator(".term-description")).toHaveText(
      "E2E: a tag with a description, shown under the heading of its page.",
    );
  });

  test("a term without a description shows only the count", async ({
    page,
  }) => {
    await page.goto("/tags/pager/");
    await expect(page.locator(".term-count")).toHaveText("5 posts");
    await expect(page.locator(".term-description")).toHaveCount(0);
  });

  test("one post is counted in the singular", async ({ page }) => {
    await page.goto("/tags/code/");
    await expect(page.locator(".term-count")).toHaveText("1 post");
  });

  test("the count is translated", async ({ page }) => {
    await page.goto("/ja/tags/alpha/");
    await expect(page.locator(".term-count")).toHaveText(/^\d+ 件の記事$/);
  });

  test("section lists show no count", async ({ page }) => {
    await page.goto("/posts/");
    await expect(page.locator(".post-row").first()).toBeVisible();
    await expect(page.locator(".term-count")).toHaveCount(0);
  });
});
