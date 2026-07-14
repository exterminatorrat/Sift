import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createConfigurationProvenance } from "../../supabase/functions/_shared/ai/configuration.mjs";
import {
  buildMenuPageLabel,
  buildSystemPrompt,
  buildUserPrompt,
  promptVersion
} from "../../supabase/functions/_shared/ai/prompts.mjs";
import { modelScanResultSchema, schemaVersion, toGeminiOpenApiSchema } from "../../supabase/functions/_shared/ai/schemas.mjs";
import { loadFrozenHoldoutPackage } from "./lib/holdout-integrity.mjs";
import {
  createManualScoringManifest,
  fingerprintEvidenceBytes
} from "./lib/manual-evidence.mjs";
import { main as writeFingerprints } from "./manual-workbench/fingerprint.mjs";

const ROOT = process.cwd();
const DEFAULT_SOURCE_CASES_PATH = "docs/ai-evals/image-cases.json";
const DEFAULT_PREPROCESSED_MANIFEST_PATH = "output/ai-evals/preprocessed/manifest.json";
const DEFAULT_PILOT_CASES = ["I-001", "I-028", "I-033"];
const MAX_PAGES_PER_CASE = 4;

const options = parseOptions(process.argv.slice(2));
const runId = String(options["run-id"] ?? `sift-manual-${new Date().toISOString().slice(0, 10)}`);
const model = String(options.model ?? "gemini-3.5-flash");
const thinkingLevel = String(options.thinking ?? "low");
const mediaResolution = normalizeMediaResolution(options["media-resolution"] ?? "MEDIA_RESOLUTION_UNSPECIFIED");
const promptContentOrder = normalizePromptContentOrder(options["content-order"] ?? "instruction_first");
const expectedPasses = normalizeExpectedPasses(options.passes ?? "1");
const sourceCasesPath = path.resolve(options.manifest ?? DEFAULT_SOURCE_CASES_PATH);
const preprocessedManifestPath = path.resolve(
  options["preprocessed-manifest"] ?? DEFAULT_PREPROCESSED_MANIFEST_PATH
);
const requestedIds = String(options.cases ?? DEFAULT_PILOT_CASES.join(","))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const runDirectory = path.resolve(options.output ?? `output/ai-evals/manual-prepared/${runId}`);

if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
  fail("--run-id may contain only letters, numbers, dots, underscores, and hyphens.");
}
if (!fs.existsSync(preprocessedManifestPath)) {
  fail("Prepared images are missing. Run npm run eval:ai:prepare-images first.");
}

const sourceManifestBytes = fs.readFileSync(sourceCasesPath);
const sourceDocument = JSON.parse(sourceManifestBytes.toString("utf8"));
const holdoutPackage = isHoldoutDocument(sourceDocument)
  ? await loadFrozenHoldoutPackage(sourceCasesPath)
  : null;
const sourceCases = normalizeSourceCases(sourceDocument);
const selectedIds = requestedIds.length === 1 && requestedIds[0].toLowerCase() === "all"
  ? sourceCases.map((item) => item.id)
  : requestedIds;
const sourceById = new Map(sourceCases.map((item) => [item.id, item]));
const imageManifest = readJson(preprocessedManifestPath);
if (!Array.isArray(imageManifest.cases)) {
  fail("--preprocessed-manifest must contain a cases array.");
}
const imageById = new Map();
for (const imageCase of imageManifest.cases) {
  if (imageById.has(imageCase.caseId)) {
    fail(`Preprocessed manifest contains duplicate case ${imageCase.caseId}.`);
  }
  imageById.set(imageCase.caseId, imageCase);
}
const selectedCases = selectedIds.map((caseId) => {
  const testCase = sourceById.get(caseId);
  const image = imageById.get(caseId);
  if (!testCase) fail(`Unknown benchmark case: ${caseId}`);
  if (!image) fail(`Prepared image is missing for ${caseId}.`);
  const sourceImagePaths = normalizeSourceImagePaths(testCase);
  const pages = normalizePreprocessedPages(image, {
    caseId,
    schemaVersion: imageManifest.schemaVersion
  });
  if (sourceImagePaths.length !== pages.length) {
    fail(
      `Prepared image count mismatch for ${caseId}: source has ${sourceImagePaths.length}, manifest has ${pages.length}.`
    );
  }
  for (let index = 0; index < pages.length; index += 1) {
    if (
      pages[index].sourcePath !== undefined &&
      pathIdentity(pages[index].sourcePath) !== pathIdentity(sourceImagePaths[index])
    ) {
      fail(`Prepared image order mismatch for ${caseId} page ${index + 1}.`);
    }
    verifyPreparedPage(pages[index], caseId, index);
  }
  return { testCase, pages };
});
if (new Set(selectedIds).size !== selectedIds.length) {
  fail("--cases contains a duplicate case ID.");
}

const maxOutputTokens = 6000;
const responseSchema = toGeminiOpenApiSchema(modelScanResultSchema);
const preparedCases = selectedCases.map(({ testCase, pages }) => {
  const images = pages.map((page, index) => ({
    path: `images/${preparedImageName(testCase.id, index, pages.length)}`,
    sha256: page.outputSha256,
    label: buildMenuPageLabel(index, pages.length)
  }));
  return {
    schemaVersion: "2",
    id: testCase.id,
    name: `Evaluation case ${testCase.id}`,
    images,
    ...(images.length === 1 ? {
      imagePath: images[0].path,
      imageSha256: images[0].sha256,
      menuPageLabel: images[0].label
    } : {}),
    profile: {
      allergies: testCase.profile.allergies.map((allergy) => ({
        name: allergy.name,
        severity: allergy.severity,
        avoidCrossContact: allergy.avoidCrossContact,
        ...(allergy.notes ? { customDetails: allergy.notes } : {})
      })),
      preferredLanguage: testCase.profile.preferredLanguage,
      restaurantLanguage: testCase.profile.restaurantLanguage
    },
    promptContentOrder,
    userPrompt: buildUserPrompt({ ...testCase, images }),
    expected: mergeExpected(testCase),
    review: testCase.review ?? null,
    labels: {
      groupId: testCase.groupId,
      sourceType: testCase.sourceType,
      language: testCase.language,
      cuisine: testCase.cuisine,
      qualityVariant: testCase.qualityVariant,
      critical: testCase.critical
    }
  };
});
const sourceSnapshotPath = "evidence/source-manifest.json";
const scoringManifestPath = "evidence/scoring-manifest.json";
const scoringManifest = createManualScoringManifest({
  runId,
  sourceManifestBytes,
  sourceManifestPath: sourceSnapshotPath,
  cases: preparedCases,
  holdoutIdentity: holdoutPackage?.identity ?? null
});
const provenance = await createConfigurationProvenance({
  provider: "gemini",
  model,
  thinkingLevel,
  maxOutputTokens,
  providerSettings: {
    endpoint: "google_ai_studio",
    responseMimeType: "application/json",
    responseSchemaEnabled: true,
    groundingEnabled: false,
    mediaResolution,
    promptContentOrder,
    temperature: "provider_default"
  },
  wireSchema: responseSchema
});
const config = {
  formatVersion: 1,
  runId,
  model: {
    provider: "google-ai-studio",
    apiProvider: "gemini",
    name: model
  },
  prompt: {
    version: promptVersion,
    system: buildSystemPrompt()
  },
  schema: {
    version: schemaVersion,
    responseSchema
  },
  generationConfig: {
    thinkingLevel,
    maxOutputTokens,
    responseMimeType: "application/json",
    mediaResolution,
    temperature: "provider_default"
  },
  inputConfig: {
    promptContentOrder
  },
  executionPlan: {
    expectedPasses
  },
  evidence: {
    manualScoring: {
      sourceManifestPath: sourceSnapshotPath,
      sourceManifestSha256: fingerprintEvidenceBytes(sourceManifestBytes),
      scoringManifestPath,
      scoringManifestFingerprint: scoringManifest.scoringManifestFingerprint,
      holdoutIdentity: holdoutPackage?.identity ?? null
    }
  },
  preprocessing: {
    appVersion: provenance.imagePreprocessingVersion,
    benchmarkVersion: imageManifest.preprocessingVersion,
    benchmarkCorpusSha256: imageManifest.corpusSha256
  },
  provenance,
  imageBaseDirectory: ".",
  freshSessionReminder: [
    "Start a fresh Google AI Studio chat for every case and keep every model setting unchanged.",
    `Set media resolution to ${mediaResolution}.`,
    promptContentOrder === "image_first"
      ? "Upload the menu pages in displayed order before pasting the user prompt."
      : "Paste the user prompt before uploading the menu pages in displayed order."
  ].join(" ")
};

fs.mkdirSync(path.join(runDirectory, "cases"), { recursive: true });
fs.mkdirSync(path.join(runDirectory, "images"), { recursive: true });
fs.mkdirSync(path.join(runDirectory, "evidence"), { recursive: true });
copyCompatibleFile(sourceCasesPath, path.join(runDirectory, sourceSnapshotPath));
writeCompatibleJson(path.join(runDirectory, scoringManifestPath), scoringManifest);
writeCompatibleJson(path.join(runDirectory, "config.json"), config, { ignoreFingerprints: true });

for (const { testCase, pages } of selectedCases) {
  for (let index = 0; index < pages.length; index += 1) {
    const imageName = preparedImageName(testCase.id, index, pages.length);
    const sourceImage = path.resolve(pages[index].outputPath);
    const targetImage = path.join(runDirectory, "images", imageName);
    copyCompatibleFile(sourceImage, targetImage);
  }
  const preparedCase = preparedCases.find((item) => item.id === testCase.id);
  writeCompatibleJson(path.join(runDirectory, "cases", `${testCase.id}.json`), preparedCase);
}

function normalizeSourceCases(document) {
  const cases = Array.isArray(document) ? document : document?.cases;
  if (!Array.isArray(cases)) {
    fail("--manifest must be a case array or a benchmark document with a cases array.");
  }
  return cases;
}

function isHoldoutDocument(document) {
  return !Array.isArray(document) && (
    String(document?.benchmarkId ?? "").includes("holdout") ||
    document?.split === "test"
  );
}

function mergeExpected(testCase) {
  if (isRecord(testCase.expected) && isRecord(testCase.expectations)) {
    return { ...testCase.expected, ...testCase.expectations };
  }
  return testCase.expected ?? testCase.expectations ?? {};
}

function normalizeSourceImagePaths(testCase) {
  const caseId = testCase?.id ?? "unknown";
  const singularFields = ["imagePath", "image"].filter((field) => Object.hasOwn(testCase, field));
  const pluralFields = ["imagePaths", "images"].filter((field) => Object.hasOwn(testCase, field));
  if (singularFields.length > 0 && pluralFields.length > 0) {
    fail(`Benchmark case ${caseId} ambiguously defines singular and plural image fields.`);
  }
  if (singularFields.length > 1 || pluralFields.length > 1) {
    fail(`Benchmark case ${caseId} ambiguously defines multiple image fields.`);
  }

  let values;
  let field;
  if (pluralFields.length === 1) {
    field = pluralFields[0];
    if (!Array.isArray(testCase[field])) {
      fail(`Benchmark case ${caseId} ${field} must be an array.`);
    }
    values = testCase[field];
  } else if (singularFields.length === 1) {
    field = singularFields[0];
    values = [testCase[field]];
  } else {
    fail(`Benchmark case ${caseId} has no image path.`);
  }

  if (values.length < 1 || values.length > MAX_PAGES_PER_CASE) {
    fail(`Benchmark case ${caseId} must define 1-${MAX_PAGES_PER_CASE} image pages.`);
  }
  const paths = values.map((value, index) => readSourceImagePath(
    value,
    `Benchmark case ${caseId} ${field}${pluralFields.length ? `[${index}]` : ""}`
  ));
  if (new Set(paths.map(pathIdentity)).size !== paths.length) {
    fail(`Benchmark case ${caseId} contains duplicate image paths.`);
  }
  for (const imagePath of paths) {
    let stats;
    try {
      stats = fs.statSync(path.resolve(imagePath));
    } catch {
      fail(`Benchmark case ${caseId} image file is missing: ${imagePath}.`);
    }
    if (!stats.isFile()) {
      fail(`Benchmark case ${caseId} image path is not a file: ${imagePath}.`);
    }
  }
  return paths;
}

function readSourceImagePath(value, label) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (isRecord(value) && typeof value.path === "string" && value.path.trim()) {
    return value.path.trim();
  }
  fail(`${label} must be a non-empty path string or an object with a path string.`);
}

function normalizePreprocessedPages(image, { caseId, schemaVersion }) {
  const isV2 = String(schemaVersion ?? "1") === "2";
  let sourcePages;
  if (Array.isArray(image.pages)) {
    sourcePages = image.pages;
  } else if (Object.hasOwn(image, "pages")) {
    fail(`Prepared pages for ${caseId} must be an array.`);
  } else if (isV2) {
    fail(`Schema v2 prepared image case ${caseId} is missing pages.`);
  } else {
    sourcePages = [image];
  }
  if (sourcePages.length < 1 || sourcePages.length > MAX_PAGES_PER_CASE) {
    fail(`Prepared image case ${caseId} must contain 1-${MAX_PAGES_PER_CASE} pages.`);
  }

  const pages = sourcePages.map((page, index) => {
    if (!isRecord(page)) fail(`Prepared image ${caseId} page ${index + 1} must be an object.`);
    if (page.pageNumber !== undefined && page.pageNumber !== index + 1) {
      fail(`Prepared image ${caseId} page numbers must be consecutive and ordered.`);
    }
    if (typeof page.outputPath !== "string" || !page.outputPath.trim()) {
      fail(`Prepared image ${caseId} page ${index + 1} is missing outputPath.`);
    }
    if (isV2 && (typeof page.sourcePath !== "string" || !page.sourcePath.trim())) {
      fail(`Prepared image ${caseId} page ${index + 1} is missing sourcePath.`);
    }
    return {
      sourcePath: typeof page.sourcePath === "string" && page.sourcePath.trim()
        ? page.sourcePath.trim()
        : undefined,
      outputPath: page.outputPath.trim(),
      outputSha256: normalizeSha256(page.outputSha256, `Prepared image ${caseId} page ${index + 1}`)
    };
  });
  if (new Set(pages.map((page) => pathIdentity(page.outputPath))).size !== pages.length) {
    fail(`Prepared image case ${caseId} contains duplicate output paths.`);
  }
  return pages;
}

function verifyPreparedPage(page, caseId, index) {
  const imagePath = path.resolve(page.outputPath);
  let bytes;
  try {
    bytes = fs.readFileSync(imagePath);
  } catch {
    fail(`Prepared image file is missing for ${caseId} page ${index + 1}: ${imagePath}.`);
  }
  const actualSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== page.outputSha256) {
    fail(`Prepared image SHA-256 mismatch for ${caseId} page ${index + 1}.`);
  }
}

function normalizeSha256(value, label) {
  if (typeof value !== "string") fail(`${label} is missing outputSha256.`);
  const normalized = value.trim().toLowerCase().replace(/^sha256:/, "");
  if (!/^[a-f0-9]{64}$/.test(normalized)) fail(`${label} outputSha256 is invalid.`);
  return normalized;
}

function preparedImageName(caseId, index, pageCount) {
  return pageCount === 1
    ? `${caseId}.jpg`
    : `${caseId}-p${String(index + 1).padStart(2, "0")}.jpg`;
}

function pathIdentity(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeMediaResolution(value) {
  const normalized = String(value).trim().toUpperCase();
  const allowed = new Set([
    "MEDIA_RESOLUTION_UNSPECIFIED",
    "MEDIA_RESOLUTION_LOW",
    "MEDIA_RESOLUTION_MEDIUM",
    "MEDIA_RESOLUTION_HIGH"
  ]);
  if (!allowed.has(normalized)) {
    fail(`Unsupported --media-resolution value: ${value}`);
  }
  return normalized;
}

function normalizePromptContentOrder(value) {
  const normalized = String(value).trim().toLowerCase().replaceAll("-", "_");
  if (normalized !== "instruction_first" && normalized !== "image_first") {
    fail(`Unsupported --content-order value: ${value}`);
  }
  return normalized;
}

function normalizeExpectedPasses(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 10) {
    fail("--passes must be an integer from 1 to 10.");
  }
  return normalized;
}

writeFingerprints(["--run", runDirectory, "--write"]);
console.log(`Prepared manual run ${runId} with ${selectedCases.length} cases at ${runDirectory}`);
console.log(`Expected passes: ${expectedPasses}`);
console.log(`Start: node scripts/ai-evals/manual-workbench/server.mjs --run "${runDirectory}" --pass 1`);

function parseOptions(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) fail(`Unexpected argument: ${key}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`${key} requires a value.`);
    parsed[key.slice(2)] = value;
    index += 1;
  }
  return parsed;
}

function writeCompatibleJson(filePath, value, { ignoreFingerprints = false } = {}) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(filePath)) {
    const existingValue = readJson(filePath);
    if (ignoreFingerprints && existingValue && typeof existingValue === "object") {
      delete existingValue.fingerprints;
    }
    if (`${JSON.stringify(existingValue, null, 2)}\n` !== next) {
      fail(`Prepared run input changed at ${filePath}. Use a new --run-id instead of overwriting evidence.`);
    }
    return;
  }
  fs.writeFileSync(filePath, next, "utf8");
}

function copyCompatibleFile(source, target) {
  const next = fs.readFileSync(source);
  if (fs.existsSync(target)) {
    if (!fs.readFileSync(target).equals(next)) {
      fail(`Prepared image changed at ${target}. Use a new --run-id.`);
    }
    return;
  }
  fs.writeFileSync(target, next);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
