// Exact-match ratchet shared by the static checks (stylelint, html-validate,
// contrast) and the a11y suite.
//
// A baseline maps a key (e.g. "color-no-hex[color]") to a count. Any
// difference fails: a new key or a higher count is a regression, and a lower
// count is an improvement that has to be locked in by rewriting the baseline
// (the `*:update` scripts), so the numbers can only go down over time.
const fs = require("fs");
const path = require("path");

const byKey = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);

function readBaseline(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

function writeBaseline(file, counts) {
  const entries = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort(byKey);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`,
  );
}

function countBy(items, keyOf) {
  const counts = {};
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function compare(baseline, current) {
  const diff = { added: [], increased: [], decreased: [] };
  const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const key of [...keys].sort()) {
    const before = baseline[key] || 0;
    const after = current[key] || 0;
    if (before === after) continue;
    const entry = { key, before, after };
    if (before === 0) diff.added.push(entry);
    else if (after > before) diff.increased.push(entry);
    else diff.decreased.push(entry);
  }
  diff.ok =
    diff.added.length === 0 &&
    diff.increased.length === 0 &&
    diff.decreased.length === 0;
  return diff;
}

const MAX_DETAILS = 20;

// `details(key)` may return extra lines (e.g. file:line of each occurrence)
// printed under a new or increased key.
function formatReport({ name, baselineFile, diff, updateHint, details }) {
  const lines = [`[${name}] ベースライン（${baselineFile}）と一致しない`];
  const section = (title, mark, entries, withDetails) => {
    if (entries.length === 0) return;
    lines.push(`  ${title}:`);
    for (const { key, before, after } of entries) {
      lines.push(`    ${mark} ${key}: ${before} → ${after}`);
      if (withDetails && details) {
        const found = details(key);
        for (const line of found.slice(0, MAX_DETAILS)) {
          lines.push(`        ${line}`);
        }
        if (found.length > MAX_DETAILS) {
          lines.push(`        …ほか ${found.length - MAX_DETAILS} 件`);
        }
      }
    }
  };
  section("新規", "+", diff.added, true);
  section("増加", "▲", diff.increased, true);
  section("減少（改善）", "▼", diff.decreased, false);
  if (diff.added.length || diff.increased.length) {
    lines.push("  新規・増加した指摘は直すこと。");
  }
  if (diff.decreased.length) {
    lines.push(`  減少は改善。${updateHint} でベースラインを締めて。`);
  }
  return lines.join("\n");
}

// CLI helper for the static checks: rewrite the baseline when `update` is
// set, otherwise compare and print a report. Returns the exit code.
function run({ name, baselineFile, current, update, updateHint, details }) {
  const rel = path.relative(process.cwd(), baselineFile);
  if (update) {
    writeBaseline(baselineFile, current);
    const total = Object.values(current).reduce((a, n) => a + n, 0);
    console.log(`[${name}] ${rel} を更新した（${total} 件）`);
    return 0;
  }
  const diff = compare(readBaseline(baselineFile), current);
  if (diff.ok) {
    const total = Object.values(current).reduce((a, n) => a + n, 0);
    console.log(`[${name}] ベースラインと一致（既知 ${total} 件）`);
    return 0;
  }
  console.error(
    formatReport({ name, baselineFile: rel, diff, updateHint, details }),
  );
  return 1;
}

module.exports = {
  readBaseline,
  writeBaseline,
  countBy,
  compare,
  formatReport,
  run,
};
