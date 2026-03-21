#!/usr/bin/env node
/**
 * Generates a build-time snapshot of the turtle exchange repo.
 *
 * Fetches index.json and all .lua script files from the exchange repo,
 * then writes src/turtle/exchange/exchange-snapshot.json with inline code.
 *
 * Usage:
 *   node scripts/generate-exchange-snapshot.mjs [--local <path>]
 *
 * Options:
 *   --local <path>  Read from a local directory instead of GitHub
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(
  PROJECT_ROOT,
  "src/turtle/exchange/exchange-snapshot.json",
);

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/needmorecowbell/drawfinity_turtle_exchange/main/";

function parseArgs() {
  const args = process.argv.slice(2);
  const localIdx = args.indexOf("--local");
  if (localIdx !== -1 && args[localIdx + 1]) {
    return { mode: "local", path: args[localIdx + 1] };
  }
  return { mode: "remote" };
}

async function fetchRemoteIndex() {
  const url = `${GITHUB_RAW_BASE}index.json`;
  console.log(`Fetching index from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch index.json (HTTP ${res.status})`);
  }
  return res.json();
}

async function fetchRemoteScript(entry) {
  const url = `${GITHUB_RAW_BASE}${entry.path}/${entry.id}.lua`;
  console.log(`  Fetching ${entry.id}.lua`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${entry.id}.lua (HTTP ${res.status})`,
    );
  }
  return res.text();
}

function readLocalIndex(localPath) {
  const indexPath = join(localPath, "index.json");
  console.log(`Reading index from ${indexPath}`);
  return JSON.parse(readFileSync(indexPath, "utf-8"));
}

function readLocalScript(localPath, entry) {
  const scriptPath = join(localPath, entry.path, `${entry.id}.lua`);
  console.log(`  Reading ${entry.id}.lua`);
  return readFileSync(scriptPath, "utf-8");
}

async function main() {
  const config = parseArgs();

  let index;
  let getScript;

  if (config.mode === "local") {
    console.log(`Using local exchange repo: ${config.path}`);
    index = readLocalIndex(config.path);
    getScript = (entry) => Promise.resolve(readLocalScript(config.path, entry));
  } else {
    console.log("Fetching from GitHub...");
    index = await fetchRemoteIndex();
    getScript = (entry) => fetchRemoteScript(entry);
  }

  console.log(
    `Found ${index.scripts.length} scripts (index version: ${index.version})`,
  );

  const scriptsWithCode = await Promise.all(
    index.scripts.map(async (entry) => {
      const code = await getScript(entry);
      return { ...entry, code };
    }),
  );

  const snapshot = {
    version: index.version,
    scripts: scriptsWithCode,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`\nSnapshot written to ${OUTPUT_PATH}`);
  console.log(`  ${scriptsWithCode.length} scripts bundled`);
}

main().catch((err) => {
  console.error("Error generating exchange snapshot:", err.message);
  process.exit(1);
});
