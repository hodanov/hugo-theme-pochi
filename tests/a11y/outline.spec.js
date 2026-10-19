const { test, expect } = require("../e2e/fixtures");
const { settle } = require("../vrt/helpers");
const PAGES = require("./pages");

// Landmark and heading outline of each page as a text snapshot. It comes from
// the accessibility tree (ariaSnapshot) and keeps only landmarks and
// headings, indented by landmark nesting, so a lost <main>, a skipped heading
// level or a heading that moved to another region shows up as a diff.
const LANDMARKS = new Set([
  "banner",
  "complementary",
  "contentinfo",
  "form",
  "main",
  "navigation",
  "region",
  "search",
]);

function outline(snapshot) {
  const lines = [];
  const open = []; // indents of the landmarks enclosing the current line
  for (const line of snapshot.split("\n")) {
    const m = line.match(/^(\s*)- ([a-z]+)\b(.*)$/);
    if (!m) continue;
    const [, indent, role, rest] = m;
    while (open.length > 0 && open.at(-1) >= indent.length) open.pop();
    if (role !== "heading" && !LANDMARKS.has(role)) continue;
    lines.push(`${"  ".repeat(open.length)}- ${role}${rest.replace(/:$/, "")}`);
    if (role !== "heading") open.push(indent.length);
  }
  return `${lines.join("\n")}\n`;
}

for (const { id, path, waitFor } of PAGES) {
  test(`outline of ${id}`, async ({ page }) => {
    await page.goto(path);
    await settle(page, { theme: "light", waitFor });
    const snapshot = await page.locator("body").ariaSnapshot();
    expect(outline(snapshot)).toMatchSnapshot(`outline-${id}.txt`);
  });
}
