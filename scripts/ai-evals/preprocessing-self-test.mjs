import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const BUNDLED_PYTHON = path.join(
  os.homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe"
);
const PYTHON_EXECUTABLE = findPython();

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sift-preprocessing-"));
try {
  const imagePaths = Array.from({ length: 5 }, (_unused, index) => {
    const imagePath = path.join(temporaryRoot, `page-${index + 1}.png`);
    fs.writeFileSync(imagePath, TINY_PNG);
    return imagePath;
  });
  const manifestPath = path.join(temporaryRoot, "valid.json");
  const outputPath = path.join(temporaryRoot, "output");
  writeJson(manifestPath, {
    cases: [{
      id: "legacy-path",
      imagePath: imagePaths[0]
    }, {
      id: "legacy-object",
      image: { path: imagePaths[1] }
    }, {
      id: "multi-paths",
      imagePaths: [imagePaths[0], imagePaths[1]]
    }, {
      id: "multi-images",
      images: [{ path: imagePaths[1] }, imagePaths[0]]
    }]
  });

  const valid = runPreprocessor(manifestPath, outputPath);
  assert.equal(valid.status, 0, valid.stderr);
  const prepared = readJson(path.join(outputPath, "manifest.json"));
  assert.equal(prepared.schemaVersion, "2");
  assert.match(prepared.corpusSha256, /^[a-f0-9]{64}$/);

  const byId = new Map(prepared.cases.map((testCase) => [testCase.caseId, testCase]));
  const legacy = byId.get("legacy-path");
  assert.equal(legacy.pageCount, 1);
  assert.equal(legacy.outputPath, legacy.pages[0].outputPath);
  assert.equal(path.basename(legacy.outputPath), "legacy-path.jpg");
  assert.equal(legacy.sourcePath, imagePaths[0]);

  const multiPaths = byId.get("multi-paths");
  assert.deepEqual(multiPaths.pages.map((page) => page.pageNumber), [1, 2]);
  assert.deepEqual(multiPaths.pages.map((page) => page.sourcePath), imagePaths.slice(0, 2));
  assert.deepEqual(
    multiPaths.pages.map((page) => path.basename(page.outputPath)),
    ["multi-paths-p01.jpg", "multi-paths-p02.jpg"]
  );

  const multiImages = byId.get("multi-images");
  assert.deepEqual(multiImages.pages.map((page) => page.sourcePath), [imagePaths[1], imagePaths[0]]);
  assert.ok(prepared.cases.every((testCase) => testCase.pages.every((page) => (
    fs.existsSync(page.outputPath) && /^[a-f0-9]{64}$/.test(page.outputSha256)
  ))));

  assertRejected({
    id: "ambiguous",
    imagePath: imagePaths[0],
    imagePaths: [imagePaths[1]]
  }, /ambiguous/i);
  assertRejected({
    id: "duplicate",
    imagePaths: [imagePaths[0], imagePaths[0]]
  }, /duplicate/i);
  assertRejected({
    id: "missing",
    imagePath: path.join(temporaryRoot, "missing.png")
  }, /missing/i);
  assertRejected({
    id: "empty",
    images: []
  }, /1-4/i);
  assertRejected({
    id: "too-many",
    imagePaths
  }, /1-4/i);

  console.log(
    "Preprocessing self-test passed: legacy and ordered image inputs, schema v2 pages, compatible single-page output, numbered multi-page files, and 1-4 page validation."
  );

  function assertRejected(testCase, pattern) {
    const invalidManifest = path.join(temporaryRoot, `${testCase.id}.json`);
    const invalidOutput = path.join(temporaryRoot, `output-${testCase.id}`);
    writeJson(invalidManifest, { cases: [testCase] });
    const result = runPreprocessor(invalidManifest, invalidOutput);
    assert.equal(result.status, 1);
    assert.match(result.stderr, pattern);
  }
} finally {
  const resolvedRoot = path.resolve(temporaryRoot);
  const tempPrefix = `${path.resolve(os.tmpdir())}${path.sep}`;
  if (!resolvedRoot.startsWith(tempPrefix) || !path.basename(resolvedRoot).startsWith("sift-preprocessing-")) {
    throw new Error(`Refusing to remove unexpected self-test directory ${resolvedRoot}.`);
  }
  fs.rmSync(resolvedRoot, { recursive: true, force: true });
}

function runPreprocessor(manifestPath, outputPath) {
  return spawnSync(PYTHON_EXECUTABLE, [
    "scripts/prepare-ai-eval-images.py",
    "--manifest", manifestPath,
    "--output", outputPath
  ], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}

function findPython() {
  const candidates = [
    process.env.SIFT_PYTHON,
    fs.existsSync(BUNDLED_PYTHON) ? BUNDLED_PYTHON : null,
    process.platform === "win32" ? "python.exe" : "python3",
    "python"
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    const check = spawnSync(candidate, ["-c", "import PIL"], { encoding: "utf8" });
    if (!check.error && check.status === 0) return candidate;
  }
  throw new Error("Preprocessing self-test requires Python with Pillow.");
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
