const { test, expect } = require("./fixtures");

const POST_URL = "/posts/p-15-code-copy/";

test.describe("F-15 Code copy button", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__copiedText = null;
      if (!navigator.clipboard) {
        navigator.clipboard = {};
      }
      navigator.clipboard.writeText = (text) => {
        window.__copiedText = text;
        return Promise.resolve();
      };
    });
  });

  // ── Injection ──────────────────────────────────────────

  test("copy buttons are injected into all pre blocks", async ({ page }) => {
    await page.goto(POST_URL);

    const preBlocks = page.locator("article pre");
    const count = await preBlocks.count();
    expect(count).toBeGreaterThan(0);

    const buttons = page.locator("article pre .code-copy-button");
    await expect(buttons).toHaveCount(count);
  });

  test("copy button has correct aria-label", async ({ page }) => {
    await page.goto(POST_URL);

    const btn = page.locator("article pre .code-copy-button").first();
    await expect(btn).toBeVisible();

    const label = await btn.getAttribute("aria-label");
    expect(label).toBeTruthy();
  });

  test("copy button contains an SVG icon", async ({ page }) => {
    await page.goto(POST_URL);

    const svg = page.locator("article pre .code-copy-button svg").first();
    await expect(svg).toBeVisible();
  });

  // ── Copy behaviour ─────────────────────────────────────

  test("clicking copy button copies code text to clipboard", async ({
    page,
  }) => {
    await page.goto(POST_URL);

    const btn = page.locator("article pre .code-copy-button").first();
    await btn.click();

    const copied = await page.evaluate(() => window.__copiedText);
    expect(copied).toBeTruthy();
    expect(copied).toContain("greet");
    // Line numbers must NOT be included in copied text
    expect(copied).not.toMatch(/^\d+\n/m);
  });

  test("copying code block with empty lines excludes line numbers", async ({
    page,
  }) => {
    await page.goto(POST_URL);

    // The Go code block (with empty lines) is the 3rd pre block
    const btns = page.locator("article pre .code-copy-button");
    const goBtn = btns.nth(2);
    await goBtn.click();

    const copied = await page.evaluate(() => window.__copiedText);
    expect(copied).toBeTruthy();
    expect(copied).toContain("fmt.Println");
    // Line numbers must NOT be included
    expect(copied).not.toMatch(/^\d+\n/m);
  });

  test("copy button shows check icon after copy", async ({ page }) => {
    await page.goto(POST_URL);

    const btn = page.locator("article pre .code-copy-button").first();
    await btn.click();

    await expect(btn).toHaveClass(/code-copy-button--copied/);
    const svg = btn.locator("svg polyline");
    await expect(svg).toBeVisible();
  });

  test("copy button reverts to original icon after feedback", async ({
    page,
  }) => {
    await page.goto(POST_URL);

    const btn = page.locator("article pre .code-copy-button").first();
    await btn.click();

    await expect(btn).toHaveClass(/code-copy-button--copied/);

    // Wait for feedback to revert (2s + buffer)
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return el && !el.classList.contains("code-copy-button--copied");
      },
      "article pre .code-copy-button",
      { timeout: 5000 },
    );

    await expect(btn).not.toHaveClass(/code-copy-button--copied/);
  });

  // ── No duplicate injection ─────────────────────────────

  test("buttons are not duplicated on repeated injection", async ({ page }) => {
    await page.goto(POST_URL);

    const preBlocks = page.locator("article pre");
    const count = await preBlocks.count();

    // Manually trigger re-injection
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent("pochi:afterSwap"));
    });

    const buttons = page.locator("article pre .code-copy-button");
    await expect(buttons).toHaveCount(count);
  });

  // ── PJAX ───────────────────────────────────────────────

  test("copy buttons work after PJAX navigation", async ({ page }) => {
    // Start on a different page
    await page.goto("/");

    // Set up PJAX swap listener
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

    // Navigate to the code-copy test post via PJAX
    const link = page.locator(`a[href="${POST_URL}"]`).first();
    // If the link exists on the page, click it; otherwise go directly
    const linkCount = await link.count();
    if (linkCount > 0) {
      await link.click();
      await page.waitForFunction(() => window.__pochiSwapDone === true);
    } else {
      await page.goto(POST_URL);
    }

    const buttons = page.locator("article pre .code-copy-button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // Verify copy still works
    await buttons.first().click();
    const copied = await page.evaluate(() => window.__copiedText);
    expect(copied).toBeTruthy();
  });
});
