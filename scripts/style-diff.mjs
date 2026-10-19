#!/usr/bin/env node
// Computed-style diff of the CSS bundle against a base ref, for refactors that
// must not change how anything looks (tokens, @layer, file moves).
//
// - Builds example_site from the working tree and from <ref> (git archive),
//   serves the working-tree HTML, and renders every page twice: once with the
//   base CSS bundle and once with the new one (swapped in by page.route), so
//   template changes do not show up as CSS differences.
// - Compares every computed property of every element and its ::before /
//   ::after. Colors are normalised to 8-bit sRGB first, so `oklch()` vs
//   `rgb()` spellings of the same color are not differences.
// - VRT only sees the initial state. The "hover" and "focus" states rewrite
//   :hover / :active and :focus / :focus-visible / :focus-within in the CSS to
//   `:not(.__sd-never)`, which matches every element with the same
//   specificity, so those rules apply from the first paint (no transitions).
// - The "active" state turns on what scripts toggle: every aria-pressed /
//   aria-expanded becomes "true", the side nav opens and the scroll-to-top
//   button shows. Running transitions are finished before reading.
//
// Usage: node scripts/style-diff.mjs [--base origin/main] [--pages id,...]
//          [--themes light,dark] [--widths 375,768,1280]
//          [--states default,hover,focus,active]
// Writes .snapshot/style-diff/report.md; exits 1 when anything differs.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import postcss from "postcss";
import PAGES from "../tests/a11y/pages.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workDir = path.join(root, ".snapshot/style-diff");
const PORT = 4175;
const origin = `http://127.0.0.1:${PORT}`;
const WORKERS = 4;
const MAX_CONTEXTS = 5;

const option = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const list = (name, fallback) => option(name, fallback).split(",");
const baseRef = option("--base", "origin/main");
const pageIds = list("--pages", PAGES.map((p) => p.id).join(","));
const themes = list("--themes", "light,dark");
const widths = list("--widths", "375,768,1280").map(Number);
const states = list("--states", "default,hover,focus,active");

const unknown = pageIds.filter((id) => !PAGES.some((p) => p.id === id));
if (unknown.length > 0) {
  console.error(`[style-diff] 知らないページ: ${unknown.join(", ")}`);
  process.exit(2);
}

// --- Builds ----------------------------------------------------------------

function build(themeRoot, out) {
  execFileSync(
    "bash",
    [
      path.join(themeRoot, "scripts/build-site.sh"),
      out,
      "--minify",
      "--baseURL",
      `${origin}/`,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
}

function bundlePath(siteDir) {
  const html = fs.readFileSync(path.join(siteDir, "index.html"), "utf8");
  const href = html.match(/<link[^>]+href="?([^" >]*bundled[^" >]*\.css)/)?.[1];
  if (!href) throw new Error(`${siteDir} に CSS バンドルが無い`);
  return new URL(href, `${origin}/`).pathname;
}

fs.rmSync(workDir, { recursive: true, force: true });
const baseSrc = path.join(workDir, "base-src");
fs.mkdirSync(baseSrc, { recursive: true });
execFileSync("bash", [
  "-c",
  'git -C "$1" archive --format=tar "$2" | tar -x -C "$3"',
  "_",
  root,
  baseRef,
  baseSrc,
]);
const headSite = path.join(workDir, "head");
const baseSite = path.join(workDir, "base");
build(root, headSite);
build(baseSrc, baseSite);
const cssUrl = bundlePath(headSite);
const css = {
  base: fs.readFileSync(path.join(baseSite, bundlePath(baseSite)), "utf8"),
  head: fs.readFileSync(path.join(headSite, cssUrl), "utf8"),
};

// --- Forced states ---------------------------------------------------------

const STATE_PSEUDOS = {
  default: null,
  hover: /:(?:hover|active)(?![\w-])/g,
  focus: /:(?:focus-visible|focus-within|focus)(?![\w-])/g,
  active: null,
};
if (!states.every((s) => s in STATE_PSEUDOS)) {
  console.error(`[style-diff] 状態は ${Object.keys(STATE_PSEUDOS).join(", ")}`);
  process.exit(2);
}

// Runs in the page for the "active" state.
function activate() {
  for (const el of document.querySelectorAll("[aria-pressed]")) {
    el.setAttribute("aria-pressed", "true");
  }
  for (const el of document.querySelectorAll("[aria-expanded]")) {
    el.setAttribute("aria-expanded", "true");
  }
  document.querySelector("#side-nav")?.classList.add("is-active");
  document.querySelector("#scroll-to-top")?.classList.add("fade-in");
  getComputedStyle(document.body).color; // start the transitions now
  for (const animation of document.getAnimations()) {
    try {
      animation.finish();
    } catch {
      // Infinite animations cannot finish; they are the same on both sides.
    }
  }
}

function forceState(text, state) {
  const re = STATE_PSEUDOS[state];
  if (!re) return text;
  const ast = postcss.parse(text);
  ast.walkRules((rule) => {
    rule.selector = rule.selector.replace(re, ":not(.__sd-never)");
  });
  return ast.toString();
}

const stylesheets = Object.fromEntries(
  states.map((state) => [
    state,
    { base: forceState(css.base, state), head: forceState(css.head, state) },
  ]),
);

// --- In-page collection ----------------------------------------------------

// Runs in the page. Keeps the full styles on window.__sd and returns one
// hash per element and pseudo-element, so only mismatches cross the wire.
function collect() {
  const probe = document.createElement("div");
  probe.style.display = "none";
  document.documentElement.append(probe);
  const colorFn = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/g;
  const cache = new Map();
  const toSrgb = (c) => {
    if (cache.has(c)) return cache.get(c);
    probe.style.color = "";
    probe.style.color = `color-mix(in srgb, ${c} 100%, transparent)`;
    const m = getComputedStyle(probe).color.match(
      /color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([\d.e]+))?\)/,
    );
    const out = m
      ? `rgba(${[m[1], m[2], m[3]].map((n) => Math.round(Number(n) * 255)).join(", ")}, ${Number(m[4] ?? 1).toFixed(3)})`
      : c;
    cache.set(c, out);
    return out;
  };
  const read = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo);
    if (pseudo && cs.getPropertyValue("content") === "none") return null;
    const props = {};
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      if (name.startsWith("--")) continue;
      const value = cs.getPropertyValue(name);
      props[name] = value.includes("(")
        ? value.replace(colorFn, toSrgb)
        : value;
    }
    return props;
  };
  const hash = (props) => {
    if (!props) return "-";
    let h = 0x811c9dc5;
    for (const [k, v] of Object.entries(props)) {
      const s = `${k}:${v};`;
      for (let i = 0; i < s.length; i++) {
        h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
      }
    }
    return (h >>> 0).toString(36);
  };
  const label = (el) => {
    const parts = [];
    for (
      let n = el;
      n && n !== document.documentElement && parts.length < 4;
      n = n.parentElement
    ) {
      let s = n.localName;
      if (n.id) s += `#${n.id}`;
      else if (n.classList.length)
        s += `.${[...n.classList].slice(0, 2).join(".")}`;
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  const elements = [...document.querySelectorAll("body, body *")].filter(
    (el) => el !== probe,
  );
  const index = new Map(elements.map((el, i) => [el, i]));
  const styles = elements.map((el) => ({
    label: label(el),
    parent: index.get(el.parentElement) ?? -1,
    "": read(el, null),
    "::before": read(el, "::before"),
    "::after": read(el, "::after"),
  }));
  probe.remove();
  window.__sd = styles;
  return styles.map((s) => ({
    label: s.label,
    parent: s.parent,
    "": hash(s[""]),
    "::before": hash(s["::before"]),
    "::after": hash(s["::after"]),
  }));
}

async function settle(page, waitFor) {
  if (waitFor) await page.locator(waitFor).first().waitFor();
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) {
      img.loading = "eager";
    }
    await Promise.all(
      Array.from(document.images, (img) => img.decode().catch(() => {})),
    );
    await document.fonts.ready;
  });
}

async function render(browser, job, side) {
  const context = await browser.newContext({
    viewport: { width: job.width, height: 900 },
    colorScheme: job.theme,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const body = stylesheets[job.state][side];
  await page.route(`${origin}${cssUrl}`, (route) =>
    route.fulfill({ contentType: "text/css; charset=utf-8", body }),
  );
  await page.goto(`${origin}${job.path}`);
  await settle(page, job.waitFor);
  if (job.state === "active") await page.evaluate(activate);
  const hashes = await page.evaluate(collect);
  return { context, page, hashes };
}

// --- Main ------------------------------------------------------------------

function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(
      process.execPath,
      ["scripts/serve-static.mjs", headSite, "--port", String(PORT)],
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

const jobs = [];
for (const id of pageIds) {
  const { path: url, waitFor } = PAGES.find((p) => p.id === id);
  for (const theme of themes) {
    for (const width of widths) {
      for (const state of states) {
        jobs.push({ id, path: url, waitFor, theme, width, state });
      }
    }
  }
}

// key "label, pseudo, props, base, head" -> list of "page@theme/width/state"
const diffs = new Map();
const failures = [];
const PSEUDOS = ["", "::before", "::after"];

async function runJob(browser, job) {
  const where = `${job.id}@${job.theme}/${job.width}/${job.state}`;
  const [a, b] = await Promise.all([
    render(browser, job, "base"),
    render(browser, job, "head"),
  ]);
  try {
    if (a.hashes.length !== b.hashes.length) {
      failures.push(
        `${where}: 要素数が違う（${a.hashes.length} / ${b.hashes.length}）`,
      );
      return;
    }
    // "<index><pseudo>" -> Map(prop -> "base\0head")
    const changed = new Map();
    for (let i = 0; i < a.hashes.length; i++) {
      for (const pseudo of PSEUDOS) {
        if (a.hashes[i][pseudo] === b.hashes[i][pseudo]) continue;
        const get = (side) =>
          side.page.evaluate(([n, p]) => window.__sd[n][p], [i, pseudo]);
        const [pa, pb] = await Promise.all([get(a), get(b)]);
        const props = new Map();
        for (const prop of new Set([
          ...Object.keys(pa ?? {}),
          ...Object.keys(pb ?? {}),
        ])) {
          const va = pa?.[prop] ?? "（無し）";
          const vb = pb?.[prop] ?? "（無し）";
          if (va !== vb) props.set(prop, `${va}\0${vb}`);
        }
        changed.set(`${i}${pseudo}`, props);
      }
    }
    for (const [key, props] of changed) {
      const i = Number.parseInt(key, 10);
      const pseudo = key.slice(String(i).length);
      // A change the parent (or, for a pseudo-element, its element) has too
      // is usually inherited; report it only where it starts.
      const parent = changed.get(pseudo ? `${i}` : `${a.hashes[i].parent}`);
      const byPair = new Map();
      for (const [prop, pair] of props) {
        if (parent?.get(prop) === pair) continue;
        if (!byPair.has(pair)) byPair.set(pair, []);
        byPair.get(pair).push(prop);
      }
      for (const [pair, names] of byPair) {
        const id = [b.hashes[i].label, pseudo, names.join(", "), pair].join(
          "\0",
        );
        if (!diffs.has(id)) diffs.set(id, new Set());
        diffs.get(id).add(where);
      }
    }
  } finally {
    await a.context.close();
    await b.context.close();
  }
}

const server = await startServer();
const browser = await chromium.launch();
let done = 0;
try {
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      for (let job; (job = queue.shift());) {
        await runJob(browser, job);
        process.stdout.write(`[style-diff] ${++done}/${jobs.length}\r`);
      }
    }),
  );
} finally {
  await browser.close();
  server.removeAllListeners("exit");
  server.kill();
}

const contexts = (set) => {
  const wheres = [...set];
  return wheres.length > MAX_CONTEXTS
    ? `${wheres.slice(0, MAX_CONTEXTS).join(", ")} ほか ${wheres.length - MAX_CONTEXTS} 件`
    : wheres.join(", ");
};
const lines = [
  `# style:diff（${baseRef} → 作業ツリー）`,
  "",
  `${jobs.length} 通り（ページ ${pageIds.length} × テーマ ${themes.length} × 幅 ${widths.length} × 状態 ${states.length}）。親要素と同じ変化は継承とみなして省く。`,
  "",
];
for (const f of failures) lines.push(`- ❌ ${f}`);
const byElement = new Map();
for (const [key, wheres] of diffs) {
  const [label, pseudo, names, va, vb] = key.split("\0");
  const props = names.split(", ");
  const prop =
    props.length > 4
      ? `${props.slice(0, 3).join(", ")} ほか ${props.length - 3} 個`
      : names;
  const el = `${label}${pseudo}`;
  if (!byElement.has(el)) byElement.set(el, []);
  byElement
    .get(el)
    .push(`  - ${prop}: \`${va}\` → \`${vb}\`（${contexts(wheres)}）`);
}
for (const [el, rows] of byElement) lines.push(`- \`${el}\``, ...rows);
if (diffs.size === 0 && failures.length === 0) lines.push("差分なし");
const report = `${lines.join("\n")}\n`;
fs.writeFileSync(path.join(workDir, "report.md"), report);
console.log(`\n${report}`);
console.log(
  `レポート: ${path.relative(root, path.join(workDir, "report.md"))}`,
);
process.exitCode = diffs.size > 0 || failures.length > 0 ? 1 : 0;
