import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sift-manual-prepare-"));
try {
  const candidatePath = path.join(root, "candidate.json");
  const frozenPath = path.join(root, "frozen.json");
  const imagesPath = path.join(root, "images.json");
  const imagePath = path.join(root, "menu.jpg");
  const candidate = createCandidate();
  writeJson(candidatePath, candidate);
  fs.writeFileSync(imagePath, Buffer.from("self-test-image", "utf8"));
  writeJson(imagesPath, {
    preprocessingVersion: "self-test",
    corpusSha256: "self-test",
    cases: [{ caseId: "H-001", outputPath: imagePath, outputSha256: "self-test-image-sha" }]
  });

  const pending = runPrepare({
    manifestPath: candidatePath,
    imagesPath,
    outputPath: path.join(root, "pending-output"),
    runId: "holdout-pending-self-test"
  });
  assert.equal(pending.status, 1);
  assert.match(pending.stderr, /lineage|frozen/i);

  const forgedFrozen = {
    ...structuredClone(candidate),
    status: "frozen"
  };
  writeJson(frozenPath, forgedFrozen);
  const forged = runPrepare({
    manifestPath: frozenPath,
    imagesPath,
    outputPath: path.join(root, "forged-output"),
    runId: "holdout-forged-self-test"
  });
  assert.equal(forged.status, 1);
  assert.match(forged.stderr, /lineage|frozen/i);

  const secondImagePath = path.join(root, "menu-2.jpg");
  const preparedPageOnePath = path.join(root, "prepared-page-1.jpg");
  const preparedPageTwoPath = path.join(root, "prepared-page-2.jpg");
  fs.writeFileSync(secondImagePath, Buffer.from("self-test-image-two", "utf8"));
  fs.writeFileSync(preparedPageOnePath, Buffer.from("prepared-page-one", "utf8"));
  fs.writeFileSync(preparedPageTwoPath, Buffer.from("prepared-page-two", "utf8"));
  const developmentPath = path.join(root, "development.json");
  const developmentImagesPath = path.join(root, "development-images.json");
  const developmentOutput = path.join(root, "development-output");
  writeJson(developmentPath, [
    createDevelopmentCase("M-001", {
      imagePaths: [imagePath, secondImagePath],
      expectations: {
        pages: [
          { pageNumber: 1, readability: { allowedValues: ["clear"] } },
          { pageNumber: 2, readability: { allowedValues: ["clear"] } }
        ]
      }
    }),
    createDevelopmentCase("S-001", { image: { path: imagePath } })
  ]);
  writeJson(developmentImagesPath, {
    schemaVersion: "2",
    preprocessingVersion: "self-test-v2",
    corpusSha256: "self-test-corpus",
    cases: [{
      caseId: "M-001",
      pageCount: 2,
      pages: [{
        pageNumber: 1,
        sourcePath: imagePath,
        outputPath: preparedPageOnePath,
        outputSha256: sha256File(preparedPageOnePath)
      }, {
        pageNumber: 2,
        sourcePath: secondImagePath,
        outputPath: preparedPageTwoPath,
        outputSha256: sha256File(preparedPageTwoPath)
      }]
    }, {
      caseId: "S-001",
      sourcePath: imagePath,
      outputPath: preparedPageOnePath,
      outputSha256: sha256File(preparedPageOnePath),
      pageCount: 1,
      pages: [{
        pageNumber: 1,
        sourcePath: imagePath,
        outputPath: preparedPageOnePath,
        outputSha256: sha256File(preparedPageOnePath)
      }]
    }]
  });

  const prepared = runPrepare({
    manifestPath: developmentPath,
    imagesPath: developmentImagesPath,
    outputPath: developmentOutput,
    runId: "multi-page-self-test",
    cases: "M-001,S-001"
  });
  assert.equal(prepared.status, 0, prepared.stderr);
  const multiCase = readJson(path.join(developmentOutput, "cases", "M-001.json"));
  assert.equal(multiCase.schemaVersion, "2");
  assert.deepEqual(
    multiCase.images.map((image) => image.path),
    ["images/M-001-p01.jpg", "images/M-001-p02.jpg"]
  );
  assert.deepEqual(
    multiCase.images.map((image) => image.sha256),
    [sha256File(preparedPageOnePath), sha256File(preparedPageTwoPath)]
  );
  assert.deepEqual(
    multiCase.images.map((image) => image.label),
    [
      "Menu page 1 of 2. Preserve this page order when reading the menu.",
      "Menu page 2 of 2. Preserve this page order when reading the menu."
    ]
  );
  assert.equal(Object.hasOwn(multiCase, "imagePath"), false);
  assert.equal(JSON.parse(multiCase.userPrompt).menuPageCount, 2);
  assert.equal(multiCase.expected.overallRisk, "ask_staff");
  assert.equal(multiCase.expected.pages.length, 2);
  assert.ok(fs.existsSync(path.join(developmentOutput, "images", "M-001-p01.jpg")));
  assert.ok(fs.existsSync(path.join(developmentOutput, "images", "M-001-p02.jpg")));

  const singleCase = readJson(path.join(developmentOutput, "cases", "S-001.json"));
  assert.equal(singleCase.images.length, 1);
  assert.equal(singleCase.imagePath, "images/S-001.jpg");
  assert.equal(singleCase.imageSha256, singleCase.images[0].sha256);
  assert.equal(singleCase.menuPageLabel, singleCase.images[0].label);
  assert.ok(fs.existsSync(path.join(developmentOutput, "images", "S-001.jpg")));

  const allOutput = path.join(root, "development-all-output");
  const preparedAll = runPrepare({
    manifestPath: developmentPath,
    imagesPath: developmentImagesPath,
    outputPath: allOutput,
    runId: "all-cases-self-test",
    cases: "all"
  });
  assert.equal(preparedAll.status, 0, preparedAll.stderr);
  assert.deepEqual(
    fs.readdirSync(path.join(allOutput, "cases")).sort(),
    ["M-001.json", "S-001.json"]
  );

  console.log(
    "Manual preparation self-test passed: pending and forged holdouts are rejected, while legacy single-page and ordered multi-page cases produce sealed v2 image evidence and compatible filenames."
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

function createCandidate() {
  return {
    schemaVersion: "1.0.0",
    benchmarkId: "sift-holdout-candidate-self-test",
    split: "test",
    status: "development",
    cases: [{
      id: "H-001",
      name: "Pending holdout",
      groupId: "holdout/self-test",
      sourceType: "controlled",
      language: "English",
      cuisine: "Test",
      qualityVariant: "clear",
      critical: true,
      profile: {
        preferredLanguage: "English",
        restaurantLanguage: "English",
        allergies: [{ name: "Sesame", severity: "severe", avoidCrossContact: true }]
      },
      expectations: { overallRisk: "avoid_unless_confirmed" },
      review: { status: "pending" }
    }]
  };
}

function createDevelopmentCase(id, imageFields) {
  return {
    id,
    ...imageFields,
    profile: {
      preferredLanguage: "English",
      restaurantLanguage: "English",
      allergies: [{ name: "Sesame", severity: "severe", avoidCrossContact: true }]
    },
    expected: { overallRisk: "ask_staff" },
    review: null,
    groupId: "manual/self-test",
    sourceType: "controlled",
    language: "English",
    cuisine: "Test",
    qualityVariant: "clear",
    critical: true
  };
}

function runPrepare({ manifestPath, imagesPath, outputPath, runId, cases = "H-001" }) {
  return spawnSync(process.execPath, [
    "scripts/ai-evals/prepare-manual-run.mjs",
    "--run-id", runId,
    "--cases", cases,
    "--manifest", manifestPath,
    "--preprocessed-manifest", imagesPath,
    "--output", outputPath
  ], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.writeFileSync(filePath, bytes);
  return bytes;
}
