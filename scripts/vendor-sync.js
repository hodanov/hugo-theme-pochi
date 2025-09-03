#!/usr/bin/env node
/*
  Sync vendor libraries from node_modules to assets/js/vendor with stable names.
  - Source of truth: package.json devDependencies
  - Copies:
    fuse.js  -> assets/js/vendor/fuse.js
    mark.js  -> assets/js/vendor/mark.js
  - Writes/validates VENDOR.lock.json with sha256 and version metadata.
*/
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = path.resolve(__dirname, "..");
const assetsVendorDir = path.join(projectRoot, "assets", "js", "vendor");
const lockPath = path.join(projectRoot, "VENDOR.lock.json");

const pkg = require(path.join(projectRoot, "package.json"));

const specs = [
  {
    name: "fuse.js",
    version: (pkg.devDependencies && pkg.devDependencies["fuse.js"]) || "",
    src: path.join(
      projectRoot,
      "node_modules",
      "fuse.js",
      "dist",
      "fuse.min.js",
    ),
    dest: path.join(assetsVendorDir, "fuse.js"),
    header: (v) =>
      `/* vendored: fuse.js ${v} | https://github.com/krisk/Fuse | MIT */\n`,
  },
  {
    name: "mark.js",
    version: (pkg.devDependencies && pkg.devDependencies["mark.js"]) || "",
    src: path.join(
      projectRoot,
      "node_modules",
      "mark.js",
      "dist",
      "mark.min.js",
    ),
    dest: path.join(assetsVendorDir, "mark.js"),
    header: (v) => `/* vendored: mark.js ${v} | https://markjs.io/ | MIT */\n`,
  },
];

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch (_) {
    return { files: {} };
  }
}

function writeLock(lock) {
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
}

function copyWithHeader(src, dest, header) {
  const body = fs.readFileSync(src);
  const out = Buffer.concat([Buffer.from(header, "utf8"), body]);
  fs.writeFileSync(dest, out);
  return out;
}

function sync() {
  ensureDir(assetsVendorDir);
  const lock = readLock();
  for (const s of specs) {
    if (!fs.existsSync(s.src)) {
      throw new Error(`Missing ${s.name} at ${s.src}. Run: npm i`);
    }
    const out = copyWithHeader(s.src, s.dest, s.header(s.version));
    const hash = sha256(out);
    lock.files[s.dest.replace(projectRoot + path.sep, "")] = {
      package: s.name,
      version: s.version,
      sha256: hash,
    };
    console.log(
      `Synced ${s.name} -> ${path.relative(projectRoot, s.dest)} (${hash.slice(0, 8)}…)`,
    );
  }
  writeLock(lock);
}

function verify() {
  const lock = readLock();
  let ok = true;
  for (const s of specs) {
    const rel = s.dest.replace(projectRoot + path.sep, "");
    const meta = lock.files[rel];
    if (!meta) {
      console.error(`Missing lock entry for ${rel}`);
      ok = false;
      continue;
    }
    if (!fs.existsSync(s.dest)) {
      console.error(`Missing file ${rel}`);
      ok = false;
      continue;
    }
    const buf = fs.readFileSync(s.dest);
    const h = sha256(buf);
    if (h !== meta.sha256) {
      console.error(
        `Hash mismatch for ${rel}: lock=${meta.sha256} actual=${h}`,
      );
      ok = false;
    }
    if (s.version && meta.version && s.version !== meta.version) {
      console.error(
        `Version mismatch for ${rel}: lock=${meta.version} pkg=${s.version}`,
      );
      ok = false;
    }
  }
  if (!ok) process.exit(1);
  console.log("VENDOR verification OK");
}

if (process.argv.includes("--verify")) verify();
else sync();
