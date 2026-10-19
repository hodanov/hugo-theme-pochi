#!/usr/bin/env node
// Stylelint with a ratchet. Every rule in .stylelintrc.json is a warning; the
// warnings are counted per "rule[property]" and compared with
// tests/baselines/stylelint.json, so existing debt is tolerated but must not
// grow (see scripts/lib/ratchet.cjs).
//
// Usage: node scripts/lint-css.mjs [--update]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import stylelint from "stylelint";
import ratchet from "./lib/ratchet.cjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, "tests/baselines/stylelint.json");
const update = process.argv.includes("--update");

const { results } = await stylelint.lint({
  cwd: root,
  files: "assets/css/**/*.css",
});

// Map a warning position to the declaration it sits in, so the key can name
// the property ("color-no-hex[background-color]"). Custom properties share
// one key ("--*") so renaming a variable does not move its warnings.
function declarationAt(decls, line, column) {
  const after = (a, b) =>
    a.line > b.line || (a.line === b.line && a.column >= b.column);
  const pos = { line, column };
  return decls.find((d) => after(pos, d.start) && after(d.end, pos));
}

const warnings = [];
const broken = [];
for (const result of results) {
  const file = path.relative(root, result.source);
  for (const w of result.invalidOptionWarnings) broken.push(w.text);
  const decls = [];
  postcss.parse(fs.readFileSync(result.source, "utf8")).walkDecls((d) => {
    const prop = d.prop.startsWith("--") ? "--*" : d.prop;
    decls.push({ prop, start: d.source.start, end: d.source.end });
  });
  for (const w of result.warnings) {
    if (w.severity === "error") {
      broken.push(`${file}:${w.line}:${w.column} ${w.text}`);
      continue;
    }
    const decl = declarationAt(decls, w.line, w.column);
    const key = decl ? `${w.rule}[${decl.prop}]` : w.rule;
    warnings.push({
      key,
      where: `${file}:${w.line}:${w.column}`,
      text: w.text,
    });
  }
}

if (broken.length > 0) {
  console.error(["[stylelint] 設定エラーか構文エラー:", ...broken].join("\n"));
  process.exit(2);
}

process.exitCode = ratchet.run({
  name: "stylelint",
  baselineFile,
  current: ratchet.countBy(warnings, (w) => w.key),
  update,
  updateHint: "`npm run lint:css:update`",
  details: (key) =>
    warnings.filter((w) => w.key === key).map((w) => `${w.where} ${w.text}`),
});
