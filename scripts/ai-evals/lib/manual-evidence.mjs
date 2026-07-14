import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const MANUAL_SCORING_MANIFEST_VERSION = 1;
export const MANUAL_SCORING_ARTIFACT_TYPE = "sift-manual-scoring-manifest";

export function fingerprintEvidenceJson(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

export function fingerprintEvidenceBytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function projectScoringCase(testCase) {
  const labels = isRecord(testCase?.labels) ? testCase.labels : {};
  return {
    id: cleanString(testCase?.id),
    expectations: structuredClone(testCase?.expected ?? testCase?.expectations ?? {}),
    review: structuredClone(testCase?.review ?? null),
    grouping: {
      groupId: testCase?.groupId ?? labels.groupId ?? "unknown"
    },
    slices: {
      sourceType: testCase?.sourceType ?? labels.sourceType ?? "unknown",
      language: testCase?.language ?? labels.language ?? "unknown",
      cuisine: testCase?.cuisine ?? labels.cuisine ?? "unknown",
      qualityVariant: testCase?.qualityVariant ?? labels.qualityVariant ?? "unknown",
      critical: testCase?.critical ?? labels.critical ?? false
    }
  };
}

export function createManualScoringManifest({
  runId,
  sourceManifestBytes,
  sourceManifestPath,
  cases,
  holdoutIdentity = null
}) {
  const base = {
    formatVersion: MANUAL_SCORING_MANIFEST_VERSION,
    artifactType: MANUAL_SCORING_ARTIFACT_TYPE,
    runId,
    source: {
      manifestPath: sourceManifestPath,
      manifestSha256: fingerprintEvidenceBytes(sourceManifestBytes)
    },
    holdoutIdentity: holdoutIdentity ? structuredClone(holdoutIdentity) : null,
    cases: cases.map(projectScoringCase)
  };
  return {
    ...base,
    scoringManifestFingerprint: fingerprintEvidenceJson(base)
  };
}

export function loadAndValidateManualScoringEvidence({ runDirectory, config, preparedCases }) {
  const declaration = config?.evidence?.manualScoring;
  invariant(isRecord(declaration), "config.json must declare evidence.manualScoring.");
  const sourcePath = resolveEvidencePath(runDirectory, declaration.sourceManifestPath, "sourceManifestPath");
  const scoringPath = resolveEvidencePath(runDirectory, declaration.scoringManifestPath, "scoringManifestPath");
  const sourceBytes = fs.readFileSync(sourcePath);
  const sourceSha256 = fingerprintEvidenceBytes(sourceBytes);
  invariant(sourceSha256 === declaration.sourceManifestSha256, "Source manifest bytes do not match config evidence.");

  const manifest = readJson(scoringPath, "manual scoring manifest");
  invariant(manifest?.formatVersion === MANUAL_SCORING_MANIFEST_VERSION, "Manual scoring manifest formatVersion is unsupported.");
  invariant(manifest?.artifactType === MANUAL_SCORING_ARTIFACT_TYPE, "Manual scoring manifest artifactType is invalid.");
  invariant(manifest?.runId === config.runId, "Manual scoring manifest runId does not match config.json.");
  invariant(manifest?.source?.manifestPath === declaration.sourceManifestPath, "Manual scoring source path does not match config evidence.");
  invariant(manifest?.source?.manifestSha256 === sourceSha256, "Manual scoring source hash does not match the exact source snapshot bytes.");
  invariant(Array.isArray(manifest?.cases) && manifest.cases.length > 0, "Manual scoring manifest cases are missing.");

  const base = { ...manifest };
  delete base.scoringManifestFingerprint;
  const computedFingerprint = fingerprintEvidenceJson(base);
  invariant(manifest.scoringManifestFingerprint === computedFingerprint, "Manual scoring manifest fingerprint is invalid.");
  invariant(declaration.scoringManifestFingerprint === computedFingerprint, "Manual scoring manifest fingerprint does not match config evidence.");

  const expectedCases = preparedCases.map(projectScoringCase);
  invariant(
    canonicalJson(manifest.cases) === canonicalJson(expectedCases),
    "Prepared scoring labels, review metadata, grouping, or slices do not match the sealed scoring manifest."
  );
  return {
    declaration: structuredClone(declaration),
    sourcePath,
    sourceSha256,
    scoringPath,
    scoringManifestFingerprint: computedFingerprint,
    manifest
  };
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  switch (typeof value) {
    case "boolean": return value ? "true" : "false";
    case "number":
      invariant(Number.isFinite(value), "Cannot fingerprint a non-finite number.");
      return JSON.stringify(value);
    case "string": return JSON.stringify(value);
    case "object":
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
    default: throw new Error(`Cannot fingerprint value of type ${typeof value}.`);
  }
}

function resolveEvidencePath(runDirectory, value, label) {
  invariant(typeof value === "string" && value.trim(), `Manual scoring ${label} is missing.`);
  invariant(!path.isAbsolute(value), `Manual scoring ${label} must be relative to the prepared run.`);
  const root = path.resolve(runDirectory);
  const target = path.resolve(root, value);
  invariant(target.startsWith(`${root}${path.sep}`), `Manual scoring ${label} escapes the prepared run.`);
  return target;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
