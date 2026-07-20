#!/usr/bin/env node
/* Build the modular source into a standalone, GitHub-Pages-ready HTML game. */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const checkOnly = process.argv.includes("--check");
const jsFiles = [
  "00-state-economy.js",
  "01-villages-npcs.js",
  "02-world-terrain.js",
  "03-dungeon.js",
  "04-shops.js",
  "05-player-combat.js",
  "06-time-schedules.js",
  "07-markets-building.js",
  "08-interactions.js",
  "08a-government.js",
  "08b-social.js",
  "09-dialogue-llm.js",
  "10-ui-panels.js",
  "11-save-load.js",
  "12-rendering.js",
  "13-input-boot.js"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\s+$/, "");
}

const template = read("src/index.template.html");
const css = read("src/styles/game.css");
const scripts = jsFiles.map(file => read(path.join("src/js", file)));
const combinedJs = scripts.join("\n\n") + "\n";

if (!template.includes("<!-- GAME_STYLES -->") || !template.includes("<!-- GAME_SCRIPTS -->")) {
  throw new Error("src/index.template.html is missing a build placeholder");
}

new vm.Script(combinedJs, { filename: "built-game.js" });

const releaseHtml = template
  .replace("<!-- GAME_STYLES -->", `<style>\n${css}\n</style>`)
  .replace("<!-- GAME_SCRIPTS -->", `<script>\n${combinedJs}</script>`) + "\n";

const devScripts = jsFiles
  .map(file => `<script src="src/js/${file}"></script>`)
  .join("\n");
const devHtml = template
  .replace("<!-- GAME_STYLES -->", '<link rel="stylesheet" href="src/styles/game.css">')
  .replace("<!-- GAME_SCRIPTS -->", devScripts) + "\n";

if (checkOnly) {
  const current = fs.readFileSync(path.join(root, "index.html"), "utf8");
  if (current !== releaseHtml) throw new Error("index.html is stale; run node build.js");
  console.log(`Build check passed (${jsFiles.length} JavaScript systems, standalone index.html is current).`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "index.html"), releaseHtml);
fs.writeFileSync(path.join(root, "dev.html"), devHtml);
fs.writeFileSync(path.join(root, "dist/index.html"), releaseHtml);
for (const asset of ["manifest.webmanifest", "icon.svg"]) {
  fs.copyFileSync(path.join(root, asset), path.join(root, "dist", asset));
}

console.log(`Built index.html and dist/index.html from ${jsFiles.length} JavaScript systems.`);
console.log("Use dev.html (or node serve.js --dev) to load the separate source files while editing.");
