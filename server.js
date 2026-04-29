const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const rootDir = __dirname;

const DEFAULT_PORT = 3000;
const cliPortRaw = process.argv[2];
const cliPort = cliPortRaw ? Number(cliPortRaw) : NaN;
const envPort = process.env.PORT ? Number(process.env.PORT) : NaN;

// Priority: PORT env var > CLI arg > default
const requestedPort = Number.isFinite(envPort)
  ? envPort
  : Number.isFinite(cliPort)
    ? cliPort
    : DEFAULT_PORT;

const host = process.env.HOST || "127.0.0.1";

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function safeResolve(requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([/\\])+/, "");
  const resolved = path.resolve(rootDir, normalized);
  if (!resolved.startsWith(rootDir)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url || "/");
    let pathname = parsed.pathname || "/";

    // Strip query; url.parse already does it, but keep it explicit
    if (!pathname.startsWith("/")) pathname = "/" + pathname;

    // Default route
    if (pathname === "/") pathname = "/index.html";

    // Prevent directory listing
    if (pathname.endsWith("/")) {
      send(res, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
      return;
    }

    const filePath = safeResolve(pathname);
    if (!filePath) {
      send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
      return;
    }

    fs.stat(filePath, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeByExt[ext] || "application/octet-stream";

      res.setHeader("Content-Type", contentType);
      // No-cache to ensure changes appear immediately
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Internal Server Error");
      });
      stream.pipe(res);
    });
  } catch {
    send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Internal Server Error");
  }
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(
      `Porta ${requestedPort} já está em uso. Feche o processo que está usando ${host}:${requestedPort} e rode novamente.`
    );
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.error("Server error:", err);
  process.exit(1);
});

server.listen(requestedPort, host, () => {
  const address = server.address();
  const actualPort = address && typeof address === "object" ? address.port : requestedPort;

  // eslint-disable-next-line no-console
  console.log(`Dashboard servindo em http://${host}:${actualPort}`);
});
