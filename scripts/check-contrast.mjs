#!/usr/bin/env node
// Contrast check for the color tokens in assets/css/tokens.css.
//
// - Reads `:root` (light) and `:root.dark` (dark = light + overrides) with
//   postcss, and fails if the `prefers-color-scheme: dark` fallback block
//   drifts from `:root.dark`.
// - Resolves var() (with fallbacks), light-dark() and color-mix(), then
//   composites translucent colors over the background layers.
// - Judges every pair in scripts/contrast-pairs.json with WCAG 2.1 contrast;
//   APCA Lc is printed for reference only.
// - A failure must be listed in the pair's `known` (an audit ID), and a known
//   failure that now passes fails too, so the list stays exact.
//
// Usage: node scripts/check-contrast.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Color from "colorjs.io";
import postcss from "postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokensFile = path.join(root, "assets/css/tokens.css");
const { pairs } = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/contrast-pairs.json"), "utf8"),
);
const THEMES = ["light", "dark"];

class TokenError extends Error {}

// --- Token sources ---------------------------------------------------------

function declarations(rule) {
  const decls = {};
  rule.walkDecls(/^--/, (d) => {
    decls[d.prop] = d.value.replace(/\s+/g, " ").trim();
  });
  return decls;
}

function readTokens(css) {
  const ast = postcss.parse(css);
  let light;
  let dark;
  let fallback;
  ast.walkRules((rule) => {
    const parent = rule.parent;
    if (parent.type === "root" && rule.selector === ":root") {
      light = { ...light, ...declarations(rule) };
    } else if (parent.type === "root" && rule.selector === ":root.dark") {
      dark = { ...dark, ...declarations(rule) };
    } else if (
      parent.type === "atrule" &&
      parent.name === "media" &&
      /prefers-color-scheme:\s*dark/.test(parent.params)
    ) {
      fallback = { ...fallback, ...declarations(rule) };
    }
  });
  if (!light || !dark || !fallback) {
    throw new TokenError(
      ":root / :root.dark / prefers-color-scheme: dark のどれかが見つからない",
    );
  }
  return { light, dark, fallback };
}

// The JS-less fallback must declare exactly what `:root.dark` declares.
function fallbackDrift(dark, fallback) {
  const drift = [];
  for (const prop of new Set([
    ...Object.keys(dark),
    ...Object.keys(fallback),
  ])) {
    if (dark[prop] !== fallback[prop]) {
      drift.push(
        `${prop}: :root.dark=${dark[prop] ?? "（無し）"} / prefers-color-scheme=${fallback[prop] ?? "（無し）"}`,
      );
    }
  }
  return drift;
}

// --- Value resolution ------------------------------------------------------

// Find the last `name(` call in `value` (so it never contains another call of
// the same name) and return [start, argsStart, end].
function lastCall(value, name) {
  const re = new RegExp(`(^|[^a-z-])${name}\\(`, "gi");
  let start = -1;
  for (const m of value.matchAll(re)) start = m.index + m[1].length;
  if (start < 0) return null;
  let depth = 0;
  for (let i = start + name.length; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")" && --depth === 0) {
      return [start, start + name.length + 1, i + 1];
    }
  }
  throw new TokenError(`括弧が閉じていない: ${value}`);
}

function splitArgs(args) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of args) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

function replaceCalls(value, name, fn) {
  let call;
  while ((call = lastCall(value, name))) {
    const [start, argsStart, end] = call;
    const args = splitArgs(value.slice(argsStart, end - 1));
    value = value.slice(0, start) + fn(args) + value.slice(end);
  }
  return value;
}

const SPACES = { "display-p3": "p3", xyz: "xyz-d65" };

// color-mix() per CSS Color 5: normalise the percentages, mix premultiplied,
// and scale alpha down when they add up to less than 100%.
function colorMix([method, a, b]) {
  const space = method.replace(/^in\s+/, "").split(/\s+/)[0];
  // The percentage may come after ("red 30%") or before ("30% red").
  const parse = (arg) => {
    let m = arg.match(/^(.*?)\s+([\d.]+)%$/);
    if (m) return { color: m[1], p: Number(m[2]) };
    m = arg.match(/^([\d.]+)%\s+(.*)$/);
    if (m) return { color: m[2], p: Number(m[1]) };
    return { color: arg, p: undefined };
  };
  const c1 = parse(a);
  const c2 = parse(b);
  const p1 = c1.p ?? (c2.p === undefined ? 50 : 100 - c2.p);
  const p2 = c2.p ?? 100 - p1;
  const sum = p1 + p2;
  if (sum <= 0) throw new TokenError(`color-mix の割合が不正: ${a}, ${b}`);
  const mixed = Color.mix(c1.color, c2.color, p2 / sum, {
    space: SPACES[space] ?? space,
    premultiplied: true,
  }).to("srgb");
  if (sum < 100) mixed.alpha *= sum / 100;
  return mixed.toString();
}

function resolve(tokens, name, theme, seen = []) {
  if (seen.includes(name)) {
    throw new TokenError(`循環参照: ${[...seen, name].join(" → ")}`);
  }
  const raw = tokens[name];
  if (raw === undefined) return undefined;
  let value = replaceCalls(raw, "var", ([ref, fallback]) => {
    const resolved = resolve(tokens, ref, theme, [...seen, name]);
    if (resolved !== undefined) return resolved;
    if (fallback !== undefined) return fallback;
    throw new TokenError(`${name} が未定義の ${ref} を参照している`);
  });
  // Innermost first, whichever function it is.
  for (;;) {
    const ld = lastCall(value, "light-dark");
    const cm = lastCall(value, "color-mix");
    if (!ld && !cm) break;
    if (ld && (!cm || ld[0] > cm[0])) {
      value = replaceCalls(value, "light-dark", ([l, d]) =>
        theme === "dark" ? d : l,
      );
    } else {
      value = replaceCalls(value, "color-mix", colorMix);
    }
  }
  return value;
}

function toColor(tokens, name, theme) {
  const value = resolve(tokens, name, theme);
  if (value === undefined) throw new TokenError(`${name} が未定義`);
  try {
    return new Color(value).to("srgb");
  } catch {
    throw new TokenError(`${name} を色として解釈できない: ${value}`);
  }
}

// Source-over compositing in sRGB.
function over(top, bottom) {
  const a = top.alpha;
  const coords = top.coords.map((c, i) => c * a + bottom.coords[i] * (1 - a));
  return new Color("srgb", coords, 1);
}

function backdrop(tokens, bg, theme) {
  const layers = (Array.isArray(bg) ? bg : [bg]).map((n) =>
    toColor(tokens, n, theme),
  );
  let result = layers.pop();
  if (result.alpha < 1) {
    throw new TokenError(`一番下の背景 ${[bg].flat().at(-1)} が不透明でない`);
  }
  while (layers.length) result = over(layers.pop(), result);
  return result;
}

// --- Main ------------------------------------------------------------------

const hex = (c) => c.toString({ format: "hex", collapse: false });

let tokenSets;
try {
  tokenSets = readTokens(fs.readFileSync(tokensFile, "utf8"));
} catch (err) {
  if (!(err instanceof TokenError)) throw err;
  console.error(`[contrast] ${err.message}`);
  process.exit(2);
}
const drift = fallbackDrift(tokenSets.dark, tokenSets.fallback);
const byTheme = {
  light: tokenSets.light,
  dark: { ...tokenSets.light, ...tokenSets.dark },
};

const rows = [];
const problems = [];
try {
  for (const theme of THEMES) {
    const tokens = byTheme[theme];
    for (const pair of pairs) {
      const bg = backdrop(tokens, pair.bg, theme);
      const fg = over(toColor(tokens, pair.fg, theme), bg);
      const ratio = bg.contrast(fg, "WCAG21");
      const apca = bg.contrast(fg, "APCA");
      const known = pair.known?.[theme];
      const pass = ratio >= pair.min;
      let status = "OK";
      if (!pass && known) status = `既知 ${known}`;
      if (!pass && !known) {
        status = "NG";
        problems.push(
          `新規の不合格: ${pair.id} @${theme} ${ratio.toFixed(2)}:1 < ${pair.min}（${pair.use}）`,
        );
      }
      if (pass && known) {
        status = `解消 ${known}`;
        problems.push(
          `既知の不合格が解消した: ${pair.id} @${theme} ${ratio.toFixed(2)}:1 ≥ ${pair.min}。contrast-pairs.json の known から ${known} を外して`,
        );
      }
      rows.push([
        theme,
        pair.id,
        `${hex(fg)} / ${hex(bg)}`,
        ratio.toFixed(2),
        String(pair.min),
        `Lc ${apca.toFixed(1)}`,
        status,
      ]);
    }
  }
} catch (err) {
  if (!(err instanceof TokenError)) throw err;
  console.error(`[contrast] ${err.message}`);
  process.exit(2);
}

const header = ["theme", "pair", "fg / bg", "ratio", "min", "APCA", "result"];
const widths = header.map((h, i) =>
  Math.max(h.length, ...rows.map((r) => r[i].length)),
);
for (const row of [header, ...rows]) {
  console.log(row.map((cell, i) => cell.padEnd(widths[i])).join("  "));
}

for (const line of drift) {
  problems.push(
    `prefers-color-scheme のフォールバックが :root.dark とずれている: ${line}`,
  );
}
if (problems.length > 0) {
  console.error(
    ["", "[contrast] 失敗:", ...problems.map((p) => `  ${p}`)].join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log("\n[contrast] 既知の不合格以外はすべて基準を満たす");
}
