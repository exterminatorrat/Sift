import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const bundledPython = path.join(
  os.homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe"
);
const candidates = [
  process.env.SIFT_PYTHON,
  fs.existsSync(bundledPython) ? bundledPython : null,
  process.platform === "win32" ? "python.exe" : "python3",
  "python"
].filter(Boolean);

let lastError = "No Python runtime was found.";
for (const executable of [...new Set(candidates)]) {
  const result = spawnSync(executable, [
    "scripts/generate-ai-multipage-fixtures.py",
    ...process.argv.slice(2)
  ], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  if (!result.error && result.status === 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(0);
  }
  lastError = result.error?.message || result.stderr || `Python exited with status ${result.status}.`;
}

console.error(`Could not generate multi-page AI fixtures: ${lastError.trim()}`);
console.error("Install Python with Pillow or set SIFT_PYTHON to a compatible Python executable.");
process.exit(1);
