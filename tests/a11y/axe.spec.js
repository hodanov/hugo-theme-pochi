const path = require("path");
const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect } = require("../e2e/fixtures");
const { settle } = require("../vrt/helpers");
const ratchet = require("../../scripts/lib/ratchet.cjs");
const PAGES = require("./pages");

// Baseline keys are "<page>/<theme>/<rule>" and values the number of failing
// nodes. Every page must match its slice exactly (scripts/lib/ratchet.cjs).
const BASELINE = path.join(__dirname, "known-violations.json");
const BASELINE_NAME = "tests/a11y/known-violations.json";
const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const THEMES = ["light", "dark"];
const UPDATE = !!process.env.A11Y_UPDATE;

// A11Y_UPDATE=1 makes every test rewrite its own slice of the shared
// baseline, so the tests must run one after another in a single worker.
if (UPDATE) test.describe.configure({ mode: "default" });

const pick = (counts, keep) =>
  Object.fromEntries(Object.entries(counts).filter(([key]) => keep(key)));

for (const { id, path: url, waitFor } of PAGES) {
  for (const theme of THEMES) {
    test.describe(`${id} @${theme}`, () => {
      test.use({ colorScheme: theme });

      test("axe violations match the baseline", async ({ page }) => {
        await page.goto(url);
        await settle(page, { theme, waitFor });
        const { violations } = await new AxeBuilder({ page })
          .withTags(TAGS)
          .analyze();

        const prefix = `${id}/${theme}/`;
        const byKey = Object.fromEntries(
          violations.map((v) => [`${prefix}${v.id}`, v]),
        );
        const current = Object.fromEntries(
          Object.entries(byKey).map(([key, v]) => [key, v.nodes.length]),
        );
        const baseline = ratchet.readBaseline(BASELINE);

        if (UPDATE) {
          const others = pick(baseline, (key) => !key.startsWith(prefix));
          ratchet.writeBaseline(BASELINE, { ...others, ...current });
          return;
        }

        const diff = ratchet.compare(
          pick(baseline, (key) => key.startsWith(prefix)),
          current,
        );
        const report = ratchet.formatReport({
          name: `axe ${id} @${theme}`,
          baselineFile: BASELINE_NAME,
          diff,
          updateHint: "`npm run a11y:update`",
          details: (key) => {
            const v = byKey[key];
            if (!v) return [];
            return [
              `${v.help} (${v.helpUrl})`,
              ...v.nodes.map((n) => n.target.join(" ")),
            ];
          },
        });
        expect(diff.ok, report).toBe(true);
      });
    });
  }
}

// Runs last (in update mode the file is ordered), and drops keys of pages
// that were removed from pages.js.
test("baseline only lists audited pages", () => {
  const known = new Set(
    PAGES.flatMap(({ id }) => THEMES.map((theme) => `${id}/${theme}/`)),
  );
  const isKnown = (key) => known.has(key.replace(/[^/]+$/, ""));
  const baseline = ratchet.readBaseline(BASELINE);
  if (UPDATE) {
    ratchet.writeBaseline(BASELINE, pick(baseline, isKnown));
    return;
  }
  const stale = Object.keys(baseline).filter((key) => !isKnown(key));
  expect(stale, "`npm run a11y:update` で消して").toEqual([]);
});
