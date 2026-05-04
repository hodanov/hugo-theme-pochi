const { test, expect } = require("./fixtures");

test.describe("F-11 Language switcher", () => {
  test("switches to Japanese content", async ({ page }) => {
    await page.goto("/posts/p-01-sample-1/");

    const select = page.locator("#language-select-top");
    await expect(select).toBeVisible();

    await select.selectOption({ label: "日本語" });

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

    const select = page.locator("#language-select-top");
    await select.selectOption({ label: "日本語" });

    await expect(page).toHaveURL(/\/ja\/posts\/p-01-sample-1\//);
    await expect(logo).toHaveAttribute("href", "/ja/");
  });

  test("body i18n labels update after PJAX language switch", async ({
    page,
  }) => {
    await page.goto("/posts/p-01-sample-1/");

    const enLabel = await page.evaluate(
      () => document.body.dataset.codeCopiedLabel,
    );
    expect(enLabel).toBe("Copied!");

    const select = page.locator("#language-select-top");
    await select.selectOption({ label: "日本語" });

    await expect(page).toHaveURL(/\/ja\/posts\/p-01-sample-1\//);

    const jaLabel = await page.evaluate(
      () => document.body.dataset.codeCopiedLabel,
    );
    expect(jaLabel).toBe("コピーしました");
  });
});
