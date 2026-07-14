import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import Jimp from "jimp-compact";

export const PERCEPTUAL_AUDIT_METHOD = "perceptual_hash_and_visual_review";
export const PERCEPTUAL_AUDIT_TOOL_NAME = "sift-dhash";
export const PERCEPTUAL_AUDIT_TOOL_VERSION = "1.0.0+jimp-compact-0.16.1";
export const PERCEPTUAL_DISTANCE_METRIC = "dhash_256_hamming";
export const PERCEPTUAL_HASH_BITS = 256;
export const MAXIMUM_NEAR_DUPLICATE_DISTANCE = 16;

const CANDIDATE_PAIR_SCOPE = "candidate_candidate";
const DEVELOPMENT_PAIR_SCOPE = "candidate_development";
const BENCHMARK_IMAGE_ROOT = "docs/ai-evals/images/";
const perceptualHashByImageSha256 = new Map();

export async function computePerceptualAuditEvidence({ candidate, developmentManifest, repoRoot }) {
  const candidateImages = await loadManifestImageHashes(candidate, "candidate", repoRoot);
  const developmentImages = await loadManifestImageHashes(
    developmentManifest,
    "development",
    repoRoot
  );
  const comparisonsById = new Map();
  const candidateCases = [...candidate.cases].sort(compareCaseIds);
  const developmentCases = [...developmentManifest.cases].sort(compareCaseIds);

  for (let leftIndex = 0; leftIndex < candidateCases.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidateCases.length; rightIndex += 1) {
      addComparison(
        comparisonsById,
        CANDIDATE_PAIR_SCOPE,
        candidateCases[leftIndex],
        candidateCases[rightIndex],
        candidateImages,
        candidateImages
      );
    }
  }
  for (const candidateCase of candidateCases) {
    for (const developmentCase of developmentCases) {
      addComparison(
        comparisonsById,
        DEVELOPMENT_PAIR_SCOPE,
        candidateCase,
        developmentCase,
        candidateImages,
        developmentImages
      );
    }
  }

  return {
    method: PERCEPTUAL_AUDIT_METHOD,
    toolName: PERCEPTUAL_AUDIT_TOOL_NAME,
    toolVersion: PERCEPTUAL_AUDIT_TOOL_VERSION,
    distanceMetric: PERCEPTUAL_DISTANCE_METRIC,
    hashBits: PERCEPTUAL_HASH_BITS,
    maximumNearDuplicateDistance: MAXIMUM_NEAR_DUPLICATE_DISTANCE,
    candidateHashesByCaseId: toHashMap(candidateImages),
    developmentHashesByCaseId: toHashMap(developmentImages),
    comparisonsById
  };
}

export function applyPerceptualEvidenceToReport(report, evidence) {
  const next = structuredClone(report);
  next.method = evidence.method;
  next.toolName = evidence.toolName;
  next.toolVersion = evidence.toolVersion;
  next.distanceMetric = evidence.distanceMetric;
  next.hashBits = evidence.hashBits;
  next.maximumNearDuplicateDistance = evidence.maximumNearDuplicateDistance;
  next.inventory.comparisons = next.inventory.comparisons.map((comparison) => {
    const computed = evidence.comparisonsById.get(comparison.comparisonId);
    invariant(computed, `Perceptual evidence is missing ${comparison.comparisonId}.`);
    return {
      ...comparison,
      leftPerceptualHash: computed.leftPerceptualHash,
      rightPerceptualHash: computed.rightPerceptualHash,
      perceptualDistance: computed.perceptualDistance
    };
  });
  return next;
}

async function loadManifestImageHashes(manifest, label, repoRoot) {
  invariant(Array.isArray(manifest?.cases), `${label} manifest cases are missing.`);
  const byCaseId = new Map();

  for (const testCase of manifest.cases) {
    invariant(nonEmptyString(testCase?.id), `${label} case ID is missing.`);
    invariant(!byCaseId.has(testCase.id), `${label} case ID ${testCase.id} is duplicated.`);
    const portablePath = normalizeImagePath(testCase?.image?.path, `${testCase.id} image.path`);
    const absolutePath = path.resolve(repoRoot, ...portablePath.split("/"));
    invariant(fs.existsSync(absolutePath), `${testCase.id} image is missing at ${absolutePath}.`);
    const bytes = fs.readFileSync(absolutePath);
    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    invariant(
      actualSha256 === testCase?.image?.sha256,
      `${testCase.id} ${label} image bytes do not match image.sha256.`
    );

    let perceptualHash = perceptualHashByImageSha256.get(actualSha256);
    if (perceptualHash === undefined) {
      const image = await Jimp.read(bytes);
      perceptualHash = differenceHash256(image);
      perceptualHashByImageSha256.set(actualSha256, perceptualHash);
    }
    byCaseId.set(testCase.id, { perceptualHash, imageSha256: actualSha256 });
  }
  return byCaseId;
}

function differenceHash256(image) {
  const normalized = image.clone().resize(17, 16).greyscale();
  const bits = [];
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const left = normalized.bitmap.data[(y * 17 + x) * 4];
      const right = normalized.bitmap.data[(y * 17 + x + 1) * 4];
      bits.push(left > right ? 1 : 0);
    }
  }
  return bitsToHex(bits);
}

function bitsToHex(bits) {
  invariant(bits.length === PERCEPTUAL_HASH_BITS, "Perceptual hash has the wrong bit length.");
  let output = "";
  for (let index = 0; index < bits.length; index += 4) {
    output += Number.parseInt(bits.slice(index, index + 4).join(""), 2).toString(16);
  }
  return output;
}

function hammingDistance(leftHash, rightHash) {
  invariant(leftHash.length === rightHash.length, "Perceptual hashes have different lengths.");
  let distance = 0;
  for (let index = 0; index < leftHash.length; index += 1) {
    const difference = Number.parseInt(leftHash[index], 16) ^ Number.parseInt(rightHash[index], 16);
    distance += POPCOUNT[difference];
  }
  return distance;
}

function addComparison(
  comparisonsById,
  scope,
  leftCase,
  rightCase,
  leftImages,
  rightImages
) {
  const comparisonId = `${scope}:${leftCase.id}:${rightCase.id}`;
  invariant(!comparisonsById.has(comparisonId), `Perceptual comparison ${comparisonId} is duplicated.`);
  const left = leftImages.get(leftCase.id);
  const right = rightImages.get(rightCase.id);
  invariant(left && right, `Perceptual comparison ${comparisonId} is missing image evidence.`);
  comparisonsById.set(comparisonId, {
    comparisonId,
    leftPerceptualHash: left.perceptualHash,
    rightPerceptualHash: right.perceptualHash,
    perceptualDistance: hammingDistance(left.perceptualHash, right.perceptualHash)
  });
}

function toHashMap(imagesByCaseId) {
  return new Map(
    [...imagesByCaseId.entries()].map(([caseId, image]) => [caseId, image.perceptualHash])
  );
}

function normalizeImagePath(value, label) {
  invariant(nonEmptyString(value), `${label} must be a non-empty string.`);
  const normalized = value.trim().replaceAll("\\", "/");
  invariant(!path.posix.isAbsolute(normalized) && !/^[A-Za-z]:\//u.test(normalized), `${label} must be relative.`);
  invariant(
    normalized.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
    `${label} contains an invalid path segment.`
  );
  invariant(normalized.startsWith(BENCHMARK_IMAGE_ROOT), `${label} is outside the benchmark image directory.`);
  return normalized;
}

function compareCaseIds(left, right) {
  return left.id.localeCompare(right.id, "en", { numeric: true });
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
