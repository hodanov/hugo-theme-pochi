const base = require("@playwright/test");

const ALLOWED_CONSOLE_ERRORS = [];
const ALLOWED_PAGE_ERRORS = [];

const matchesAllowList = (patterns, text) =>
  patterns.some((pattern) => pattern.test(text));

const formatConsoleError = (msg) => {
  const loc = msg.location();
  const suffix =
    loc && loc.url
      ? ` (${loc.url}:${loc.lineNumber}:${loc.columnNumber})`
      : "";
  return `${msg.text()}${suffix}`;
};

const test = base.test.extend({
  page: async ({ page }, use, testInfo) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on("pageerror", (err) => {
      const message = err && err.message ? err.message : String(err);
      if (!matchesAllowList(ALLOWED_PAGE_ERRORS, message)) {
        pageErrors.push(err);
      }
    });

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (matchesAllowList(ALLOWED_CONSOLE_ERRORS, text)) return;
      consoleErrors.push(msg);
    });

    await use(page);

    if (testInfo.status !== testInfo.expectedStatus) return;

    if (pageErrors.length === 0 && consoleErrors.length === 0) return;

    const lines = [];
    if (pageErrors.length > 0) {
      lines.push("pageerror:");
      pageErrors.forEach((err) => {
        const message = err && err.message ? err.message : String(err);
        lines.push(`- ${message}`);
      });
    }
    if (consoleErrors.length > 0) {
      lines.push("console.error:");
      consoleErrors.forEach((msg) => {
        lines.push(`- ${formatConsoleError(msg)}`);
      });
    }

    throw new Error(lines.join("\n"));
  },
});

module.exports = { test, expect: base.expect };
