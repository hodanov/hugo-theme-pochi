#!/usr/bin/env node
// Minimal static file server for snapshot tests (VRT / a11y / Lighthouse).
// Zero dependencies so it runs inside the Playwright Docker image as-is.
//
// Usage: node scripts/serve-static.mjs <dir> [--port 4173] [--host 127.0.0.1] [--gzip]
//   --gzip  compress text responses like a production host does, so
//           Lighthouse measures realistic transfer sizes.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const dir = args.find(
  (a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"),
);
if (!dir) {
  console.error("usage: serve-static.mjs <dir> [--port N] [--host H] [--gzip]");
  process.exit(2);
}
const root = resolve(dir);
const port = Number(option("--port", "4173"));
const host = option("--host", "127.0.0.1");
const gzip = args.includes("--gzip");

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
const isText = (type) => /^text\/|json|xml|svg/.test(type);

function send(req, res, status, file) {
  const type = MIME[extname(file)] ?? "application/octet-stream";
  const headers = { "Content-Type": type, "Cache-Control": "no-store" };
  const compress =
    gzip && isText(type) && /\bgzip\b/.test(req.headers["accept-encoding"]);
  if (compress) {
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
  }
  res.writeHead(status, headers);
  const body = createReadStream(file);
  (compress ? body.pipe(createGzip()) : body).pipe(res);
}

function notFound(req, res, pathname) {
  // Hugo renders a 404.html per language (/404.html, /ja/404.html).
  const lang = pathname.split("/")[1];
  const candidates = [join(root, lang, "404.html"), join(root, "404.html")];
  const page = candidates.find(isFile);
  if (page) return send(req, res, 404, page);
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
    return isFile(index)
      ? send(req, res, 200, index)
      : notFound(req, res, pathname);
  }
  return isFile(target)
    ? send(req, res, 200, target)
    : notFound(req, res, pathname);
}).listen(port, host, () => {
  console.log(`listening on http://${host}:${port}/`);
});
