// Minimal Playwright config for theme E2E
const path = require("path");
const E2E_PORT = process.env.E2E_PORT || "10391";
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${E2E_PORT}/`;
const themeRoot = path.resolve(__dirname);
const themesDir = path.dirname(themeRoot);
const themeName = path.basename(themeRoot);

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: "tests/e2e",
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: `hugo serve -s example_site --themesDir ${themesDir} -t ${themeName} --disableFastRender --bind 127.0.0.1 --port ${E2E_PORT} --baseURL ${baseURL} --buildDrafts --buildFuture`,
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 120 * 1000,
  },
};

module.exports = config;
