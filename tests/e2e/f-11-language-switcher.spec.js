const { test, expect } = require("./fixtures");

test.describe("F-11 Language switcher", () => {
  test("switches to Japanese content", async ({ page }) => {
    await page.goto("/posts/p-01-sample-1/");

    // Only the other language is offered, as a link in that language
    const links = page.locator("#lang-switcher-container a");
    await expect(links).toHaveCount(1);
    const link = links.first();
    await expect(link).toHaveText("日本語");
    await expect(link).toHaveAttribute("hreflang", "ja");
    await expect(link).toHaveAttribute("lang", "ja");

    await link.click();

    await expect(page).toHaveURL(/\/ja\/posts\/p-01-sample-1\//);
    await expect(page.locator("h1")).toHaveText("サンプル記事1");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  });

  test("brand logo href updates after PJAX language switch", async ({
    page,
  }) => {
    await page.goto("/posts/p-01-sample-1/");

    const logo = page.locator("#logo-container");
    await expect(logo).toHaveAttribute("href", "/");

    await page.locator("#lang-switcher-container a").click();

    await expect(page).toHaveURL(/\/ja\/posts\/p-01-sample-1\//);
    await expect(logo).toHaveAttribute("href", "/ja/");
  });

  test("the link points back to English after switching", async ({ page }) => {
    await page.goto("/posts/p-01-sample-1/");
    await page.locator("#lang-switcher-container a").click();
    await expect(page).toHaveURL(/\/ja\/posts\/p-01-sample-1\//);

    const link = page.locator("#lang-switcher-container a");
    await expect(link).toHaveText("English");
    await expect(link).toHaveAttribute("href", "/posts/p-01-sample-1/");
  });

  test("body i18n labels update after PJAX language switch", async ({
    page,
  }) => {
    await page.goto("/posts/p-01-sample-1/");

    const enLabel = await page.evaluate(
      () => document.body.dataset.codeCopiedLabel,
    );
    expect(enLabel).toBe("Copied!");

    await page.locator("#lang-switcher-container a").click();

    await expect(page).toHaveURL(/\/ja\/posts\/p-01-sample-1\//);

    const jaLabel = await page.evaluate(
      () => document.body.dataset.codeCopiedLabel,
    );
    expect(jaLabel).toBe("コピーしました");
  });
});
