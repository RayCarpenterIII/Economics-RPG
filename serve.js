#!/usr/bin/env node
/*
 * Zero-dependency development server for The Emberfold Valley.
 *
 *   node serve.js            serve on http://localhost:8420 and open the browser
 *   node serve.js --lan      also listen on your LAN IP so a phone on the same
 *                            Wi-Fi can play (the phone URL is printed at start)
 *   node serve.js --port N   use a different port
 *   node serve.js --no-open  do not open a browser window
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const args = process.argv.slice(2);
const lan = args.includes("--lan");
const noOpen = args.includes("--no-open");
const portIdx = args.indexOf("--port");
const port = portIdx >= 0 ? Number(args[portIdx + 1]) || 8420 : 8420;
const host = lan ? "0.0.0.0" : "127.0.0.1";
const root = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".md": "text/markdown; charset=utf-8"
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let filePath = path.normalize(path.join(root, urlPath === "/" ? "index.html" : urlPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found: " + urlPath);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
});

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === "IPv4" && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

server.listen(port, host, () => {
  const local = "http://localhost:" + port;
  console.log("");
  console.log("  The Emberfold Valley — development server");
  console.log("  Play on this computer:  " + local);
  if (lan) {
    for (const addr of lanAddresses()) {
      console.log("  Play on your phone:     http://" + addr + ":" + port + "  (same Wi-Fi)");
    }
  } else {
    console.log("  (run with --lan to also allow phones on your Wi-Fi to connect)");
  }
  console.log("  LLM setup guide:        docs/LLM-SETUP.md");
  console.log("  Stop with Ctrl+C");
  console.log("");
  if (!noOpen) {
    const opener = process.platform === "win32" ? "start \"\" " : process.platform === "darwin" ? "open " : "xdg-open ";
    exec(opener + local);
  }
});
