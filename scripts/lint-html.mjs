#!/usr/bin/env node
// html-validate over a built site with a ratchet: messages are counted per
// rule and compared with tests/baselines/html-validate.json (see
// scripts/lib/ratchet.cjs). Build the site first, unminified so locations
// stay readable (`npm run lint:html` does both).
//
// Usage: node scripts/lint-html.mjs <siteDir> [--update]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileSystemConfigLoader, HtmlValidate } from "html-validate";
import ratchet from "./lib/ratchet.cjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, "tests/baselines/html-validate.json");
const args = process.argv.slice(2);
const update = args.includes("--update");
const siteDir = args.find((a) => !a.startsWith("--"));
if (!siteDir) {
  console.error("usage: lint-html.mjs <siteDir> [--update]");
  process.exit(2);
}

const files = fs
  .readdirSync(siteDir, { recursive: true })
  .filter((f) => f.endsWith(".html"))
  .sort();
if (files.length === 0) {
  console.error(`[html-validate] ${siteDir} に HTML が無い`);
  process.exit(2);
}

// Hugo's built-in alias pages (`/page/1/` → `/` and so on) are a bare
// <head> with a meta refresh; the theme does not render them.
const isAlias = (html) =>
  /<meta http-equiv="?refresh/i.test(html) && !/<body/i.test(html);

// Configuration is read from .htmlvalidate.json at the repository root.
const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader());
const messages = [];
for (const file of files) {
  const html = fs.readFileSync(path.join(siteDir, file), "utf8");
  if (isAlias(html)) continue;
  const report = await htmlvalidate.validateString(html, file);
  for (const result of report.results) {
    for (const m of result.messages) {
      messages.push({
        rule: m.ruleId,
        where: `${file}:${m.line}:${m.column}`,
        text: m.message,
      });
    }
  }
}

process.exitCode = ratchet.run({
  name: "html-validate",
  baselineFile,
  current: ratchet.countBy(messages, (m) => m.rule),
  update,
  updateHint: "`npm run lint:html:update`",
  details: (rule) =>
    messages.filter((m) => m.rule === rule).map((m) => `${m.where} ${m.text}`),
});
