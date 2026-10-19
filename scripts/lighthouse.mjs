#!/usr/bin/env node
// Lighthouse over the static example_site build (.snapshot/site).
//
// - Serves the build with gzip (scripts/serve-static.mjs) and runs Lighthouse
//   (mobile defaults, simulated throttling) several times per page, each in a
//   fresh headless Chrome, keeping the median run as Lighthouse CI does.
// - Checks the median run against scripts/lighthouse-targets.json: "warn"
//   assertions are only reported, "error" ones fail the run.
// - Writes the median HTML/JSON reports and summary.md to .lighthouse/, and
//   appends the summary to $GITHUB_STEP_SUMMARY on GitHub Actions.
//
// Chrome comes from CHROME_PATH, or Playwright's Chromium by default.
//
// Usage: node scripts/lighthouse.mjs [--runs N]   (`npm run lighthouse` builds first)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { computeMedianRun } from "lighthouse/core/lib/median-run.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/lighthouse-targets.json"), "utf8"),
);
const runsIndex = process.argv.indexOf("--runs");
const runs = Number(
  runsIndex === -1 ? targets.runs : process.argv[runsIndex + 1],
);
const siteDir = path.join(root, ".snapshot/site");
const outDir = path.join(root, ".lighthouse");
const PORT = 4173;
const chromePath = process.env.CHROME_PATH || chromium.executablePath();

if (!fs.existsSync(path.join(siteDir, "index.html"))) {
  console.error(
    "[lighthouse] .snapshot/site が無い。`npm run lighthouse` で実行して",
  );
  process.exit(2);
}
if (!fs.existsSync(chromePath)) {
  console.error(
    `[lighthouse] Chrome が見つからない（${chromePath}）。\`npx playwright install chromium\` か CHROME_PATH で指定して`,
  );
  process.exit(2);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(
      process.execPath,
      ["scripts/serve-static.mjs", siteDir, "--port", String(PORT), "--gzip"],
      { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
    );
    server.on("exit", (code) =>
      reject(new Error(`serve-static exited (${code})`)),
    );
    server.stdout.on("data", (chunk) => {
      if (String(chunk).includes("listening on")) resolve(server);
    });
  });
}

async function runOnce(url) {
  const chrome = await launch({
    chromePath,
    // Ubuntu 24.04 runners block Chrome's user-namespace sandbox.
    chromeFlags: ["--headless=new", "--no-sandbox"],
  });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "html",
      logLevel: "error",
    });
    const { lhr } = result;
    if (lhr.runtimeError) {
      throw new Error(
        `${url}: ${lhr.runtimeError.code} ${lhr.runtimeError.message}`,
      );
    }
    return { lhr, html: result.report };
  } finally {
    await chrome.kill();
  }
}

// --- Assertions (Lighthouse CI's shape) -----------------------------------

function actualValue(lhr, key, options) {
  if (key.startsWith("categories:")) {
    return lhr.categories[key.slice("categories:".length)]?.score;
  }
  if (key.startsWith("resource-summary:")) {
    const [, type] = key.split(":");
    const items = lhr.audits["resource-summary"]?.details?.items ?? [];
    return items.find((i) => i.resourceType === type)?.transferSize ?? 0;
  }
  const audit = lhr.audits[key];
  if (!audit) return undefined;
  if ("maxLength" in options) return audit.details?.items?.length ?? 0;
  return audit.numericValue;
}

function check(lhr) {
  const failures = [];
  for (const [key, [level, options]] of Object.entries(targets.assertions)) {
    if (level === "off") continue;
    const actual = actualValue(lhr, key, options);
    if (actual === undefined || actual === null) {
      failures.push({ level: "error", key, message: "値を取得できない" });
      continue;
    }
    const [limitName, limit] = Object.entries(options)[0];
    const ok = limitName === "minScore" ? actual >= limit : actual <= limit;
    if (!ok) {
      const shown = Number.isInteger(actual) ? actual : actual.toFixed(3);
      failures.push({
        level,
        key,
        message: `${shown}（${limitName} ${limit}）`,
      });
    }
  }
  return failures;
}

// --- Summary ---------------------------------------------------------------

const score = (lhr, id) => Math.round((lhr.categories[id]?.score ?? 0) * 100);
const ms = (lhr, id) => `${Math.round(lhr.audits[id].numericValue)} ms`;
const kb = (lhr, type) =>
  `${(actualValue(lhr, `resource-summary:${type}:size`, {}) / 1024).toFixed(1)} KB`;

function summarize(results) {
  const lines = [
    `## Lighthouse（example_site、モバイル、${runs} 回の中央値）`,
    "",
    "| page | Perf | A11y | BP | SEO | LCP | CLS | TBT | CSS | JS |",
    "| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |",
  ];
  for (const { id, path: url, lhr } of results) {
    lines.push(
      `| ${id} (\`${url}\`) | ${score(lhr, "performance")} | ${score(lhr, "accessibility")} | ${score(lhr, "best-practices")} | ${score(lhr, "seo")} | ${ms(lhr, "largest-contentful-paint")} | ${lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3)} | ${ms(lhr, "total-blocking-time")} | ${kb(lhr, "stylesheet")} | ${kb(lhr, "script")} |`,
    );
  }
  const failed = results.flatMap(({ id, failures }) =>
    failures.map(
      (f) =>
        `- ${f.level === "error" ? "❌" : "⚠️"} ${id}: \`${f.key}\` ${f.message}`,
    ),
  );
  lines.push(
    "",
    failed.length ? "### 基準を外れた項目" : "すべての基準を満たした。",
  );
  if (failed.length) lines.push("", ...failed);
  lines.push(
    "",
    `Lighthouse ${results[0].lhr.lighthouseVersion}、${results[0].lhr.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0] ?? "Chrome"}`,
  );
  return `${lines.join("\n")}\n`;
}

// --- Main ------------------------------------------------------------------

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const server = await startServer();
const results = [];
try {
  for (const { id, path: urlPath } of targets.urls) {
    const url = new URL(urlPath, `http://127.0.0.1:${PORT}/`).href;
    const all = [];
    for (let i = 1; i <= runs; i++) {
      process.stdout.write(`[lighthouse] ${id} ${i}/${runs}\r`);
      all.push(await runOnce(url));
    }
    const median = computeMedianRun(all.map((r) => r.lhr));
    const { lhr, html } = all.find((r) => r.lhr === median);
    fs.writeFileSync(path.join(outDir, `${id}.html`), html);
    fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(lhr));
    results.push({ id, path: urlPath, lhr, failures: check(lhr) });
    console.log(`[lighthouse] ${id} 完了（Perf ${score(lhr, "performance")}）`);
  }
} catch (err) {
  console.error(`[lighthouse] 実行に失敗した: ${err.message}`);
  process.exitCode = 2;
} finally {
  server.removeAllListeners("exit");
  server.kill();
}

if (results.length === targets.urls.length) {
  const summary = summarize(results);
  fs.writeFileSync(path.join(outDir, "summary.md"), summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  console.log(`\n${summary}`);
  console.log(`レポート: ${path.relative(root, outDir)}/<page>.html`);
  const errors = results
    .flatMap((r) => r.failures)
    .filter((f) => f.level === "error");
  if (errors.length > 0) process.exitCode = 1;
}
