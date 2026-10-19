const { expect } = require("../e2e/fixtures");

const VIEWPORTS = {
  375: { width: 375, height: 812 },
  768: { width: 768, height: 1024 },
  1280: { width: 1280, height: 800 },
};

// Bring the page to a stable state before a screenshot: load lazy images,
// wait until every image is decoded and fonts are ready, and confirm the
// theme class set by the inline head script.
async function settle(page, { theme, waitFor } = {}) {
  if (waitFor) {
    await expect(page.locator(waitFor).first()).toBeVisible();
  }
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) {
      img.loading = "eager";
    }
    await Promise.all(
      Array.from(document.images, (img) => img.decode().catch(() => {})),
    );
    await document.fonts.ready;
  });
  if (theme === "dark") {
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  } else {
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  }
}

module.exports = { VIEWPORTS, settle };
