/**
 * Cross-platform guard tests.
 *
 * These tests scan source files for patterns known to cause Windows bugs.
 * They run as part of the normal test suite, catching regressions before
 * they reach production. Each rule corresponds to a real bug that was
 * shipped and fixed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const SRC_ROOT = join(__dirname, "..");

/** Recursively collect all .ts source files (excluding tests and node_modules). */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === "__tests__") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (extname(entry) === ".ts" && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

/** Read file content with path relative to src/ for readable error messages. */
function readSource(file: string): { content: string; rel: string } {
  const content = readFileSync(file, "utf-8");
  const rel = file.replace(SRC_ROOT + "/", "");
  return { content, rel };
}

describe("Cross-platform guards", () => {
  const sourceFiles = collectSourceFiles(SRC_ROOT);

  it("no hardcoded forward-slash path splitting in persistence code", () => {
    // Rule: Never use lastIndexOf("/") or split("/") to parse file paths.
    // Tauri's join() produces backslashes on Windows, so "/" won't match.
    // Use Tauri's dirname/basename from @tauri-apps/api/path instead.
    const violations: string[] = [];
    const pathParsingPattern = /(?:lastIndexOf|split|indexOf)\s*\(\s*["'`][/\\]["'`]\s*\)/g;

    for (const file of sourceFiles) {
      // Only check files that deal with filesystem paths (persistence, user config)
      if (!file.includes("/persistence/") && !file.includes("/user/")) continue;
      const { content, rel } = readSource(file);
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const match = pathParsingPattern.exec(lines[i]);
        if (match) {
          violations.push(`${rel}:${i + 1} — ${lines[i].trim()}`);
        }
        pathParsingPattern.lastIndex = 0;
      }
    }

    expect(
      violations,
      "Hardcoded path separator found. Use Tauri's dirname/basename from @tauri-apps/api/path instead.\n" +
        violations.join("\n"),
    ).toHaveLength(0);
  });

  it("all fetch() calls in Tauri-aware modules have Tauri HTTP fallback", () => {
    // Rule: Any module that calls fetch() for network requests and runs in
    // the Tauri desktop app must have a tauriFetch fallback, because
    // WebView2 on Windows may hang or block standard fetch for cross-origin URLs.
    const violations: string[] = [];

    // Files that make network requests and run in the Tauri app
    const networkFiles = sourceFiles.filter(
      (f) =>
        (f.includes("/exchange/") || f.includes("/sync/")) &&
        !f.endsWith("index.ts"),
    );

    for (const file of networkFiles) {
      const { content, rel } = readSource(file);
      // Check if the file calls fetch() directly
      const hasFetchCall = /\bfetch\s*\(/.test(content);
      if (!hasFetchCall) continue;

      // Check if it also has a Tauri HTTP fallback
      const hasTauriFallback =
        content.includes("@tauri-apps/plugin-http") ||
        content.includes("tauriFetch");
      if (!hasTauriFallback) {
        violations.push(
          `${rel} — calls fetch() but has no Tauri HTTP fallback for Windows WebView2`,
        );
      }
    }

    expect(
      violations,
      "Network module missing Tauri HTTP fallback. Add tauriFetch() pattern (see ExchangeClient.ts).\n" +
        violations.join("\n"),
    ).toHaveLength(0);
  });

  it("private async methods in UI/canvas code have error protection", () => {
    // Rule: When an async method is called from a synchronous event handler
    // (like pointerdown, click), unhandled rejections silently swallow errors
    // on Windows WebView2. All private async methods in UI/canvas modules
    // must have a try-catch in their body so errors are logged, not lost.
    const violations: string[] = [];

    for (const file of sourceFiles) {
      if (!file.includes("/canvas/") && !file.includes("/ui/")) continue;
      const { content, rel } = readSource(file);
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/private\s+async\s+\w+/.test(line)) continue;

        // Extract method name for readable error messages
        const nameMatch = line.match(/private\s+async\s+(\w+)/);
        const methodName = nameMatch ? nameMatch[1] : "unknown";

        // Scan the method body for a try block
        let braceDepth = 0;
        let hasTryCatch = false;
        let foundOpenBrace = false;
        for (let j = i; j < Math.min(i + 80, lines.length); j++) {
          if (lines[j].includes("{")) {
            foundOpenBrace = true;
            braceDepth += (lines[j].match(/{/g) || []).length;
          }
          if (lines[j].includes("}")) {
            braceDepth -= (lines[j].match(/}/g) || []).length;
          }
          if (/\btry\s*\{/.test(lines[j]) || /\btry$/.test(lines[j].trim())) {
            hasTryCatch = true;
            break;
          }
          if (foundOpenBrace && braceDepth <= 0) break;
        }
        if (!hasTryCatch) {
          violations.push(
            `${rel}:${i + 1} — private async ${methodName}() has no try-catch`,
          );
        }
      }
    }

    expect(
      violations,
      "Private async method in UI/canvas missing error protection. " +
        "Wrap body in try-catch to prevent silent failures on Windows WebView2.\n" +
        violations.join("\n"),
    ).toHaveLength(0);
  });

  it("Promise .then() chains in UI/canvas code have .catch() handlers", () => {
    // Rule: Any .then() chain in UI or canvas code must include a .catch()
    // to prevent unhandled rejections. On Windows WebView2, unhandled
    // rejections can silently swallow errors with no console output.
    const violations: string[] = [];

    for (const file of sourceFiles) {
      if (!file.includes("/canvas/") && !file.includes("/ui/")) continue;
      const { content, rel } = readSource(file);
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes(".then(")) continue;

        // Look ahead for .catch() in the same statement (within 10 lines)
        let hasCatch = false;
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes(".catch(")) {
            hasCatch = true;
            break;
          }
        }
        if (!hasCatch) {
          violations.push(`${rel}:${i + 1} — .then() without .catch(): ${lines[i].trim()}`);
        }
      }
    }

    expect(
      violations,
      "Promise chain missing .catch() handler. Add .catch() to prevent silent failures on Windows WebView2.\n" +
        violations.join("\n"),
    ).toHaveLength(0);
  });

  it("backdrop-filter in CSS has -webkit- fallback for WebKitGTK/Safari", () => {
    // Rule: Every `backdrop-filter` must be preceded by `-webkit-backdrop-filter`
    // with the same value. WebKitGTK (Linux Tauri) and older Safari WebViews
    // only support the prefixed version.
    const stylesPath = join(SRC_ROOT, "styles.css");
    const css = readFileSync(stylesPath, "utf-8");
    const lines = css.split("\n");
    const violations: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        line.startsWith("backdrop-filter:") &&
        !line.startsWith("-webkit-backdrop-filter")
      ) {
        // Check the previous non-empty line for -webkit- prefix
        let prevLine = "";
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].trim()) {
            prevLine = lines[j].trim();
            break;
          }
        }
        if (!prevLine.startsWith("-webkit-backdrop-filter")) {
          violations.push(
            `styles.css:${i + 1} — backdrop-filter without -webkit- fallback: ${line}`,
          );
        }
      }
    }

    expect(
      violations,
      "backdrop-filter missing -webkit- fallback. Add -webkit-backdrop-filter on the line before.\n" +
        violations.join("\n"),
    ).toHaveLength(0);
  });
});
