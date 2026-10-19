#!/usr/bin/env node
// Minimal static file server for snapshot tests (VRT / a11y / LHCI).
// Zero dependencies so it runs inside the Playwright Docker image as-is.
//
// Usage: node scripts/serve-static.mjs <dir> [--port 4173] [--host 127.0.0.1]
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const dir = args.find(
  (a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"),
);
if (!dir) {
  console.error("usage: serve-static.mjs <dir> [--port N] [--host H]");
  process.exit(2);
}
const root = resolve(dir);
const port = Number(option("--port", "4173"));
const host = option("--host", "127.0.0.1");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const isFile = (p) => existsSync(p) && statSync(p).isFile();
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

function send(res, status, file) {
  res.writeHead(status, {
    "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(res);
}

function notFound(res, pathname) {
  // Hugo renders a 404.html per language (/404.html, /ja/404.html).
  const lang = pathname.split("/")[1];
  const candidates = [join(root, lang, "404.html"), join(root, "404.html")];
  const page = candidates.find(isFile);
  if (page) return send(res, 404, page);
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
}

createServer((req, res) => {
  const url = new URL(req.url, `http://${host}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const target = normalize(join(root, pathname));
  if (target !== root && !target.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (isDir(target)) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
      return;
    }
    const index = join(target, "index.html");
    return isFile(index) ? send(res, 200, index) : notFound(res, pathname);
  }
  return isFile(target) ? send(res, 200, target) : notFound(res, pathname);
}).listen(port, host, () => {
  console.log(`listening on http://${host}:${port}/`);
});
