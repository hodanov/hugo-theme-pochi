// Playwright config for snapshot suites (VRT; a11y is added in a later step).
// Runs only inside the Playwright Docker image via scripts/pw-docker.sh, against
// a static build in .snapshot/site, so baselines are pinned to one environment.
const path = require("path");

if (!process.env.POCHI_PW_DOCKER || process.platform !== "linux") {
  throw new Error(
    "playwright.snapshot.config.js runs only inside Docker. Use `npm run vrt` or `npm run vrt:update`.",
  );
}

const PORT = 4173;

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 60 * 1000,
  retries: 0,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  outputDir: "test-results/snapshot",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/snapshot" }],
  ],
  // CI never writes baselines; locally, missing ones are created on first run.
  updateSnapshots: process.env.CI ? "none" : "missing",
  // No platform suffix: every baseline is produced in the same Linux image.
  snapshotPathTemplate: "{testDir}/__snapshots__/{arg}{ext}",
  expect: {
    timeout: 15 * 1000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Same image, same build: require an exact match. 0.02 still flags a
      // shift of a few levels in a single channel (e.g. #424242 -> #4a4a4a).
      threshold: 0.02,
      maxDiffPixels: 0,
      stylePath: path.join(__dirname, "tests/vrt/screenshot.css"),
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
  },
  webServer: {
    command: `node scripts/serve-static.mjs .snapshot/site --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30 * 1000,
  },
  projects: [{ name: "vrt", testDir: "tests/vrt" }],
};

module.exports = config;
