import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computePerceptualAuditEvidence,
  MAXIMUM_NEAR_DUPLICATE_DISTANCE,
  PERCEPTUAL_AUDIT_METHOD,
  PERCEPTUAL_AUDIT_TOOL_NAME,
  PERCEPTUAL_AUDIT_TOOL_VERSION,
  PERCEPTUAL_DISTANCE_METRIC,
  PERCEPTUAL_HASH_BITS
} from "./perceptual-audit.mjs";
import { validateRealWorldSourceCandidates } from "../validate-real-world-source-candidates.mjs";

export const HOLDOUT_PROMOTION_POLICY_VERSION = "2026-07-14.7";
export const HOLDOUT_REVIEW_POLICY_VERSION = "2026-07-14.3";
export const REAL_WORLD_SOURCE_REVIEW_POLICY_VERSION = "2026-07-14.2";
export const HOLDOUT_LINEAGE_SCHEMA_VERSION = "3.0.0";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CANONICAL_HOLDOUT_SOURCE_PATH = path.join(REPO_ROOT, "docs/ai-evals/images/holdout/source-cases.json");
const CANONICAL_DEVELOPMENT_LICENSES_PATH = path.join(REPO_ROOT, "docs/ai-evals/licensed-images.json");

const EXPECTED_CASE_COUNT = 48;
const EXPECTED_GROUP_COUNT = 24;
const EXPECTED_REAL_WORLD_CASE_COUNT = 12;
const EXPECTED_REAL_WORLD_GROUP_COUNT = 6;
const EXPECTED_REAL_WORLD_GROUP_IDS = new Set([
  "holdout/dutch-canal-bistro",
  "holdout/indonesian-warung-terasi",
  "holdout/polish-milk-bar",
  "holdout/traditional-chinese-dim-sum",
  "holdout/turkish-lokanta-baklava",
  "holdout/vietnamese-street-grill"
]);
const EXPECTED_DEVELOPMENT_MANIFEST_SHA256 = "44ebf62ca87b1d80bb11ffdc9882c50c56d25f0305f83eaf7c534fa057e4ada4";
const EXPECTED_CRITICAL_CASE_COUNT = 24;
const EXPECTED_RETAKE_CASE_COUNT = 12;
const EXPECTED_TRANSLATION_CASE_COUNT = 12;
const EXPECTED_CASE_IDS = Array.from(
  { length: EXPECTED_CASE_COUNT },
  (_, index) => `I-${String(101 + index).padStart(3, "0")}`
);
const EXPECTED_LANGUAGE_COUNTS = {
  Dutch: 8,
  Indonesian: 8,
  Polish: 8,
  "Traditional Chinese": 8,
  Turkish: 8,
  Vietnamese: 8
};
const EXPECTED_QUALITY_COUNTS = {
  angled_photo: 12,
  blurred_crop: 12,
  clear_counter: 12,
  glare_fold: 12
};
const EXPECTED_SEVERITY_COUNTS = { mild: 24, severe: 24 };
const EXPECTED_CROSS_CONTACT_COUNTS = { false: 24, true: 24 };
const EXPECTED_SOURCE_COUNTS = { controlled: 36, licensed: 12 };
const EXPECTED_ALLERGEN_COUNTS = {
  Dairy: 18,
  Egg: 12,
  Fish: 12,
  Mustard: 4,
  Peanut: 10,
  Sesame: 6,
  Shellfish: 10,
  Soy: 8,
  Sulfites: 2,
  "Tree nuts": 12,
  "Wheat/gluten": 12
};
const NEAR_DUPLICATE_COMPARISON_SCOPE =
  "all_candidate_images_vs_all_development_images_and_all_candidate_pairs";
const NEAR_DUPLICATE_AUDIT_SCHEMA_VERSION = "2.0.0";
const NEAR_DUPLICATE_REPORT_SCHEMA_VERSION = "2.0.0";
const CANDIDATE_PAIR_SCOPE = "candidate_candidate";
const DEVELOPMENT_PAIR_SCOPE = "candidate_development";
const VISUAL_VERDICTS = new Set(["distinct", "near_duplicate", "exact_duplicate"]);

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function loadPromotionFileEvidence({
  candidate,
  developmentManifest,
  sourceAcquisitionManifest,
  sourceReview = null,
  sourceReviewPath = null
}) {
  const sourceImageSha256BySourceId = new Map();
  invariant(
    Array.isArray(sourceAcquisitionManifest?.sources),
    "Source acquisition manifest sources are missing."
  );
  for (const receipt of sourceAcquisitionManifest.sources) {
    invariant(nonEmptyString(receipt?.candidateSourceId), "Source receipt candidateSourceId is missing.");
    const portablePath = normalizePortableRelativePath(
      receipt?.localPath,
      `${receipt.candidateSourceId} source localPath`
    );
    invariant(
      portablePath.startsWith("output/ai-evals/real-world-source-intake/downloads/"),
      `${receipt.candidateSourceId} source localPath is outside the acquisition directory.`
    );
    const bytes = readRepoArtifact(portablePath, `${receipt.candidateSourceId} source image`);
    const actualSha256 = sha256Bytes(bytes);
    invariant(actualSha256 === receipt.sha256, `${receipt.candidateSourceId} source image bytes do not match the receipt.`);
    invariant(bytes.length === receipt.byteLength, `${receipt.candidateSourceId} source image byte length does not match the receipt.`);
    sourceImageSha256BySourceId.set(receipt.candidateSourceId, actualSha256);
  }

  const candidateImageSha256ByCaseId = loadManifestImageEvidence(candidate, "candidate");
  const developmentImageSha256ByCaseId = loadManifestImageEvidence(developmentManifest, "development");
  const reviewEvidenceSha256ByPath = new Map();
  if (sourceReview !== null) {
    invariant(nonEmptyString(sourceReviewPath), "Source review path is required to verify evidence files.");
    const reviewDirectory = path.dirname(path.resolve(sourceReviewPath));
    invariant(Array.isArray(sourceReview?.cases), "Source review cases are missing.");
    for (const reviewCase of sourceReview.cases) {
      for (const reviewName of ["rightsReview", "suitabilityReview", "transformationReview"]) {
        const review = reviewCase?.[reviewName];
        if (review?.status !== "approved") continue;
        const portablePath = normalizePortableRelativePath(
          review?.evidencePath,
          `${reviewCase?.id ?? "unknown"} ${reviewName} evidencePath`
        );
        const resolvedPath = resolveLineagePath(reviewDirectory, portablePath, `${reviewName} evidencePath`);
        invariant(fs.existsSync(resolvedPath), `${reviewCase.id} ${reviewName} evidence file is missing at ${resolvedPath}.`);
        const actualSha256 = sha256Bytes(fs.readFileSync(resolvedPath));
        invariant(actualSha256 === review.evidenceSha256, `${reviewCase.id} ${reviewName} evidence bytes do not match evidenceSha256.`);
        const previous = reviewEvidenceSha256ByPath.get(portablePath);
        invariant(previous === undefined || previous === actualSha256, `${portablePath} is reused with inconsistent evidence.`);
        reviewEvidenceSha256ByPath.set(portablePath, actualSha256);
      }
    }
  }

  return {
    sourceImageSha256BySourceId,
    candidateImageSha256ByCaseId,
    developmentImageSha256ByCaseId,
    reviewEvidenceSha256ByPath
  };
}

function loadManifestImageEvidence(manifest, label) {
  invariant(Array.isArray(manifest?.cases), `${label} manifest cases are missing.`);
  const evidence = new Map();
  for (const testCase of manifest.cases) {
    invariant(nonEmptyString(testCase?.id), `${label} case ID is missing.`);
    const portablePath = normalizePortableRelativePath(testCase?.image?.path, `${testCase.id} image.path`);
    invariant(
      portablePath.startsWith("docs/ai-evals/images/"),
      `${testCase.id} image.path is outside the benchmark image directory.`
    );
    const actualSha256 = sha256Bytes(readRepoArtifact(portablePath, `${testCase.id} ${label} image`));
    invariant(actualSha256 === testCase.image.sha256, `${testCase.id} ${label} image bytes do not match image.sha256.`);
    evidence.set(testCase.id, actualSha256);
  }
  return evidence;
}

function readRepoArtifact(portablePath, label) {
  const resolvedPath = path.resolve(REPO_ROOT, ...portablePath.split("/"));
  invariant(fs.existsSync(resolvedPath), `${label} is missing at ${resolvedPath}.`);
  return fs.readFileSync(resolvedPath);
}

export function createApprovalTemplate(candidate, candidateBytes) {
  invariant(Array.isArray(candidate?.cases) && candidate.cases.length > 0, "Candidate cases are missing.");
  return {
    schemaVersion: HOLDOUT_LINEAGE_SCHEMA_VERSION,
    reviewPolicyVersion: HOLDOUT_REVIEW_POLICY_VERSION,
    candidateManifestSha256: sha256Bytes(candidateBytes),
    cases: candidate.cases.map((testCase) => ({
      id: testCase.id,
      status: "pending",
      primaryReview: pendingReview(),
      secondaryReview: testCase.critical ? pendingReview() : null
    }))
  };
}

export function createNearDuplicateAuditTemplate(candidate, candidateBytes, developmentManifestBytes) {
  invariant(Array.isArray(candidate?.cases) && candidate.cases.length > 0, "Candidate cases are missing.");
  const normalizedDevelopmentBytes = requireCanonicalDevelopmentBytes(developmentManifestBytes);
  const developmentManifest = parseJsonBytes(
    normalizedDevelopmentBytes,
    "development manifest"
  );
  const developmentCaseIds = developmentInventory(developmentManifest).caseIds;
  const realWorldCases = candidate.cases.filter((testCase) => testCase?.sourceType === "licensed");
  return {
    schemaVersion: NEAR_DUPLICATE_AUDIT_SCHEMA_VERSION,
    promotionPolicyVersion: HOLDOUT_PROMOTION_POLICY_VERSION,
    status: "pending",
    candidateManifestSha256: sha256Bytes(candidateBytes),
    developmentManifestSha256: sha256Bytes(normalizedDevelopmentBytes),
    scope: {
      comparison: NEAR_DUPLICATE_COMPARISON_SCOPE,
      candidateCaseIds: candidate.cases.map((testCase) => testCase.id),
      developmentCaseIds
    },
    realWorldSubset: {
      requiredCaseCount: EXPECTED_REAL_WORLD_CASE_COUNT,
      status: "pending",
      cases: realWorldCases.map((testCase) => ({
        id: testCase.id,
        acquisitionType: null,
        rightsEvidenceSha256: null,
        notes: null
      })),
      reviewerId: null,
      reviewedAt: null,
      notes: null
    },
    perceptualAudit: {
      status: "pending",
      method: PERCEPTUAL_AUDIT_METHOD,
      toolName: PERCEPTUAL_AUDIT_TOOL_NAME,
      toolVersion: PERCEPTUAL_AUDIT_TOOL_VERSION,
      distanceMetric: PERCEPTUAL_DISTANCE_METRIC,
      hashBits: PERCEPTUAL_HASH_BITS,
      maximumNearDuplicateDistance: MAXIMUM_NEAR_DUPLICATE_DISTANCE,
      exactDuplicatePairs: [],
      nearDuplicatePairs: [],
      reportPath: null,
      reportSha256: null,
      reviewerId: null,
      reviewedAt: null,
      notes: null
    }
  };
}

export function createNearDuplicateReportTemplate(candidate, candidateBytes, developmentManifestBytes) {
  invariant(Array.isArray(candidate?.cases) && candidate.cases.length > 0, "Candidate cases are missing.");
  const normalizedDevelopmentBytes = requireCanonicalDevelopmentBytes(developmentManifestBytes);
  const developmentManifest = parseJsonBytes(normalizedDevelopmentBytes, "development manifest");
  const comparisons = expectedNearDuplicateComparisons(candidate, developmentManifest).map((comparison) => ({
    ...comparison,
    leftPerceptualHash: null,
    rightPerceptualHash: null,
    perceptualDistance: null,
    visualVerdict: null,
    notes: null
  }));
  const candidatePairCount = comparisons.filter((item) => item.scope === CANDIDATE_PAIR_SCOPE).length;
  const developmentPairCount = comparisons.length - candidatePairCount;
  return {
    schemaVersion: NEAR_DUPLICATE_REPORT_SCHEMA_VERSION,
    candidateManifestSha256: sha256Bytes(candidateBytes),
    developmentManifestSha256: sha256Bytes(normalizedDevelopmentBytes),
    comparisonScope: NEAR_DUPLICATE_COMPARISON_SCOPE,
    method: PERCEPTUAL_AUDIT_METHOD,
    toolName: PERCEPTUAL_AUDIT_TOOL_NAME,
    toolVersion: PERCEPTUAL_AUDIT_TOOL_VERSION,
    distanceMetric: PERCEPTUAL_DISTANCE_METRIC,
    hashBits: PERCEPTUAL_HASH_BITS,
    maximumNearDuplicateDistance: MAXIMUM_NEAR_DUPLICATE_DISTANCE,
    inventory: {
      candidateVsCandidateCount: candidatePairCount,
      candidateVsDevelopmentCount: developmentPairCount,
      totalCount: comparisons.length,
      comparisons
    }
  };
}

export function createRealWorldSourceReviewTemplate(
  candidate,
  candidateBytes,
  sourceIntakeBytes,
  sourceAcquisitionManifestBytes,
  fileEvidence
) {
  const inventory = buildRealWorldSourceInventory({
    candidate,
    sourceIntakeBytes,
    sourceAcquisitionManifestBytes,
    fileEvidence
  });
  return {
    schemaVersion: "2.0.0",
    reviewPolicyVersion: REAL_WORLD_SOURCE_REVIEW_POLICY_VERSION,
    status: "pending",
    candidateManifestSha256: sha256Bytes(requireBytes(candidateBytes, "candidate manifest")),
    sourceIntakeSha256: inventory.sourceIntakeSha256,
    sourceAcquisitionManifestSha256: inventory.sourceAcquisitionManifestSha256,
    cases: inventory.cases.map((item) => ({
      id: item.id,
      candidateSourceId: item.candidateSourceId,
      sourceImageSha256: item.sourceImageSha256,
      outputImageSha256: item.outputImageSha256,
      rightsReview: pendingEvidenceReview(),
      suitabilityReview: pendingEvidenceReview(),
      transformationReview: pendingEvidenceReview()
    }))
  };
}

export async function createFrozenHoldout(options) {
  const normalizedDevelopmentBytes = requireCanonicalDevelopmentBytes(options.developmentManifestBytes);
  const developmentManifest = parseJsonBytes(normalizedDevelopmentBytes, "development manifest");
  const perceptualEvidence = await computePerceptualAuditEvidence({
    candidate: options.candidate,
    developmentManifest,
    repoRoot: REPO_ROOT
  });
  return createFrozenHoldoutWithEvidence({
    ...options,
    developmentManifestBytes: normalizedDevelopmentBytes,
    perceptualEvidence
  });
}

function createFrozenHoldoutWithEvidence({
  candidate,
  approvals,
  nearDuplicateAudit,
  sourceReview,
  candidateBytes,
  approvalsBytes,
  nearDuplicateAuditBytes,
  nearDuplicateReportBytes,
  developmentManifestBytes,
  sourceIntakeBytes,
  sourceAcquisitionManifestBytes,
  sourceReviewBytes,
  fileEvidence,
  perceptualEvidence,
  candidateManifestPath = "holdout-v1.json",
  approvalsPath = "holdout-v1.approvals.json",
  nearDuplicateAuditPath = "holdout-v1.near-duplicate-audit.json",
  nearDuplicateReportPath,
  developmentManifestPath = "development-v1.json",
  sourceIntakePath = "real-world-source-candidates.json",
  sourceAcquisitionManifestPath = "holdout-v1.source-acquisition.json",
  sourceReviewPath = "holdout-v1.source-review.json",
  frozenManifestPath = "holdout-v1-frozen.json",
  promotedAt = new Date().toISOString()
}) {
  const normalizedCandidateBytes = requireBytes(candidateBytes, "candidate manifest");
  const normalizedApprovalsBytes = requireBytes(approvalsBytes, "holdout approvals");
  const normalizedAuditBytes = requireBytes(nearDuplicateAuditBytes, "near-duplicate audit");
  const normalizedReportBytes = requireBytes(nearDuplicateReportBytes, "near-duplicate audit report");
  const normalizedDevelopmentBytes = requireCanonicalDevelopmentBytes(developmentManifestBytes);
  const normalizedSourceIntakeBytes = requireBytes(sourceIntakeBytes, "real-world source intake");
  const normalizedSourceAcquisitionBytes = requireBytes(
    sourceAcquisitionManifestBytes,
    "real-world source acquisition manifest"
  );
  const normalizedSourceReviewBytes = requireBytes(sourceReviewBytes, "real-world source review");
  assertObjectMatchesBytes(candidate, normalizedCandidateBytes, "Candidate", "holdout candidate manifest");
  assertObjectMatchesBytes(approvals, normalizedApprovalsBytes, "Approval", "holdout approvals");
  assertObjectMatchesBytes(
    nearDuplicateAudit,
    normalizedAuditBytes,
    "Near-duplicate audit",
    "holdout near-duplicate audit"
  );
  assertObjectMatchesBytes(sourceReview, normalizedSourceReviewBytes, "Source review", "real-world source review");

  const developmentManifest = parseJsonBytes(normalizedDevelopmentBytes, "development manifest");
  const candidateSha256 = sha256Bytes(normalizedCandidateBytes);
  const approvalsSha256 = sha256Bytes(normalizedApprovalsBytes);
  const nearDuplicateAuditSha256 = sha256Bytes(normalizedAuditBytes);
  const nearDuplicateReportSha256 = sha256Bytes(normalizedReportBytes);
  const developmentManifestSha256 = sha256Bytes(normalizedDevelopmentBytes);
  const sourceIntakeSha256 = sha256Bytes(normalizedSourceIntakeBytes);
  const sourceAcquisitionManifestSha256 = sha256Bytes(normalizedSourceAcquisitionBytes);
  const sourceReviewSha256 = sha256Bytes(normalizedSourceReviewBytes);
  const normalizedNearDuplicateAuditPath = normalizePortableRelativePath(nearDuplicateAuditPath, "nearDuplicateAuditPath");
  const normalizedNearDuplicateReportPath = normalizePortableRelativePath(nearDuplicateReportPath, "nearDuplicateReportPath");
  const declaredReportPath = normalizePortableRelativePath(
    nearDuplicateAudit?.perceptualAudit?.reportPath,
    "perceptualAudit.reportPath"
  );
  const reportPathFromAudit = path.posix.normalize(
    path.posix.join(path.posix.dirname(normalizedNearDuplicateAuditPath), declaredReportPath)
  );
  invariant(
    reportPathFromAudit === normalizedNearDuplicateReportPath,
    "Near-duplicate audit reportPath does not identify the report frozen into lineage."
  );

  validateAuthoritativeCandidate(candidate, developmentManifest);
  const sourceReviewEvidence = validateRealWorldSourceReview({
    candidate,
    candidateSha256,
    sourceReview,
    sourceIntakeBytes: normalizedSourceIntakeBytes,
    sourceAcquisitionManifestBytes: normalizedSourceAcquisitionBytes,
    fileEvidence
  });
  validateNearDuplicateAudit({
    candidate,
    audit: nearDuplicateAudit,
    candidateSha256,
    developmentManifest,
    developmentManifestSha256,
    reportBytes: normalizedReportBytes,
    reportSha256: nearDuplicateReportSha256,
    sourceReviewEvidence,
    fileEvidence,
    perceptualEvidence
  });
  const frozenCases = validateAndApplyApprovals(candidate, approvals, candidateSha256);
  const promotion = {
    promotionPolicyVersion: HOLDOUT_PROMOTION_POLICY_VERSION,
    reviewPolicyVersion: HOLDOUT_REVIEW_POLICY_VERSION,
    candidateManifestSha256: candidateSha256,
    approvalsSha256,
    nearDuplicateAuditSha256,
    nearDuplicateReportSha256,
    developmentManifestSha256,
    sourceIntakeSha256,
    sourceAcquisitionManifestSha256,
    sourceReviewSha256
  };
  const frozen = {
    ...candidate,
    benchmarkId: "sift-menu-analysis-holdout-v1",
    status: "frozen",
    generatedBy: "scripts/ai-evals/promote-holdout.mjs",
    promotion,
    cases: frozenCases
  };
  const frozenBytes = jsonBytes(frozen);
  const lineage = {
    schemaVersion: HOLDOUT_LINEAGE_SCHEMA_VERSION,
    promotionPolicyVersion: HOLDOUT_PROMOTION_POLICY_VERSION,
    reviewPolicyVersion: HOLDOUT_REVIEW_POLICY_VERSION,
    pathBase: "lineage_directory",
    candidateManifestPath: normalizePortableRelativePath(candidateManifestPath, "candidateManifestPath"),
    candidateManifestSha256: candidateSha256,
    approvalsPath: normalizePortableRelativePath(approvalsPath, "approvalsPath"),
    approvalsSha256,
    nearDuplicateAuditPath: normalizedNearDuplicateAuditPath,
    nearDuplicateAuditSha256,
    nearDuplicateReportPath: normalizedNearDuplicateReportPath,
    nearDuplicateReportSha256,
    developmentManifestPath: normalizePortableRelativePath(developmentManifestPath, "developmentManifestPath"),
    developmentManifestSha256,
    sourceIntakePath: normalizePortableRelativePath(sourceIntakePath, "sourceIntakePath"),
    sourceIntakeSha256,
    sourceAcquisitionManifestPath: normalizePortableRelativePath(
      sourceAcquisitionManifestPath,
      "sourceAcquisitionManifestPath"
    ),
    sourceAcquisitionManifestSha256,
    sourceReviewPath: normalizePortableRelativePath(sourceReviewPath, "sourceReviewPath"),
    sourceReviewSha256,
    frozenManifestPath: normalizePortableRelativePath(frozenManifestPath, "frozenManifestPath"),
    frozenManifestSha256: sha256Bytes(frozenBytes),
    promotedAt: normalizeTimestamp(promotedAt, "promotedAt"),
    caseCount: frozenCases.length,
    groupCount: new Set(frozenCases.map((testCase) => testCase.groupId)).size,
    retiredGroupIds: [],
    replacementHistory: []
  };
  return { frozen, frozenBytes, lineage };
}

export async function validateFrozenHoldoutArtifacts({
  frozen,
  frozenBytes,
  lineage,
  candidate,
  candidateBytes,
  approvals,
  approvalsBytes,
  nearDuplicateAudit,
  sourceReview,
  nearDuplicateAuditBytes,
  nearDuplicateReportBytes,
  developmentManifestBytes,
  sourceIntakeBytes,
  sourceAcquisitionManifestBytes,
  sourceReviewBytes,
  fileEvidence
}) {
  invariant(lineage?.schemaVersion === HOLDOUT_LINEAGE_SCHEMA_VERSION, "Holdout lineage schemaVersion is unsupported.");
  invariant(
    lineage?.promotionPolicyVersion === HOLDOUT_PROMOTION_POLICY_VERSION,
    `Holdout lineage promotionPolicyVersion must be ${HOLDOUT_PROMOTION_POLICY_VERSION}.`
  );
  invariant(
    lineage?.reviewPolicyVersion === HOLDOUT_REVIEW_POLICY_VERSION,
    `Holdout lineage reviewPolicyVersion must be ${HOLDOUT_REVIEW_POLICY_VERSION}.`
  );
  invariant(lineage?.pathBase === "lineage_directory", "Holdout lineage pathBase must be lineage_directory.");
  for (const key of [
    "candidateManifestPath",
    "approvalsPath",
    "nearDuplicateAuditPath",
    "nearDuplicateReportPath",
    "developmentManifestPath",
    "sourceIntakePath",
    "sourceAcquisitionManifestPath",
    "sourceReviewPath",
    "frozenManifestPath"
  ]) {
    normalizePortableRelativePath(lineage?.[key], key);
  }

  const normalizedCandidateBytes = requireBytes(candidateBytes, "candidate manifest");
  const normalizedApprovalsBytes = requireBytes(approvalsBytes, "holdout approvals");
  const normalizedAuditBytes = requireBytes(nearDuplicateAuditBytes, "near-duplicate audit");
  const normalizedReportBytes = requireBytes(nearDuplicateReportBytes, "near-duplicate audit report");
  const normalizedDevelopmentBytes = requireCanonicalDevelopmentBytes(developmentManifestBytes);
  const normalizedSourceIntakeBytes = requireBytes(sourceIntakeBytes, "real-world source intake");
  const normalizedSourceAcquisitionBytes = requireBytes(
    sourceAcquisitionManifestBytes,
    "real-world source acquisition manifest"
  );
  const normalizedSourceReviewBytes = requireBytes(sourceReviewBytes, "real-world source review");
  const normalizedFrozenBytes = requireBytes(frozenBytes, "frozen manifest");
  invariant(lineage.candidateManifestSha256 === sha256Bytes(normalizedCandidateBytes), "Candidate manifest hash does not match lineage.");
  invariant(lineage.approvalsSha256 === sha256Bytes(normalizedApprovalsBytes), "Approval bytes hash does not match lineage.");
  invariant(lineage.nearDuplicateAuditSha256 === sha256Bytes(normalizedAuditBytes), "Near-duplicate audit hash does not match lineage.");
  invariant(lineage.nearDuplicateReportSha256 === sha256Bytes(normalizedReportBytes), "Near-duplicate audit report hash does not match lineage.");
  invariant(lineage.developmentManifestSha256 === sha256Bytes(normalizedDevelopmentBytes), "Development manifest hash does not match lineage.");
  invariant(lineage.sourceIntakeSha256 === sha256Bytes(normalizedSourceIntakeBytes), "Source intake hash does not match lineage.");
  invariant(
    lineage.sourceAcquisitionManifestSha256 === sha256Bytes(normalizedSourceAcquisitionBytes),
    "Source acquisition manifest hash does not match lineage."
  );
  invariant(lineage.sourceReviewSha256 === sha256Bytes(normalizedSourceReviewBytes), "Source review hash does not match lineage.");
  invariant(lineage.frozenManifestSha256 === sha256Bytes(normalizedFrozenBytes), "Frozen manifest hash does not match lineage.");
  normalizeTimestamp(lineage.promotedAt, "lineage promotedAt");

  const rebuilt = await createFrozenHoldout({
    candidate,
    approvals,
    nearDuplicateAudit,
    sourceReview,
    candidateBytes: normalizedCandidateBytes,
    approvalsBytes: normalizedApprovalsBytes,
    nearDuplicateAuditBytes: normalizedAuditBytes,
    nearDuplicateReportBytes: normalizedReportBytes,
    developmentManifestBytes: normalizedDevelopmentBytes,
    sourceIntakeBytes: normalizedSourceIntakeBytes,
    sourceAcquisitionManifestBytes: normalizedSourceAcquisitionBytes,
    sourceReviewBytes: normalizedSourceReviewBytes,
    fileEvidence,
    candidateManifestPath: lineage.candidateManifestPath,
    approvalsPath: lineage.approvalsPath,
    nearDuplicateAuditPath: lineage.nearDuplicateAuditPath,
    nearDuplicateReportPath: lineage.nearDuplicateReportPath,
    developmentManifestPath: lineage.developmentManifestPath,
    sourceIntakePath: lineage.sourceIntakePath,
    sourceAcquisitionManifestPath: lineage.sourceAcquisitionManifestPath,
    sourceReviewPath: lineage.sourceReviewPath,
    frozenManifestPath: lineage.frozenManifestPath,
    promotedAt: lineage.promotedAt
  });
  invariant(normalizedFrozenBytes.equals(rebuilt.frozenBytes), "Frozen manifest bytes do not match the reviewed candidate and evidence.");
  invariant(JSON.stringify(frozen) === JSON.stringify(rebuilt.frozen), "Parsed frozen manifest does not match its exact bytes.");
  invariant(lineage.caseCount === EXPECTED_CASE_COUNT, "Holdout lineage caseCount must be 48.");
  invariant(lineage.groupCount === EXPECTED_GROUP_COUNT, "Holdout lineage groupCount must be 24.");
  invariant(Array.isArray(lineage.retiredGroupIds), "Holdout lineage retiredGroupIds must be an array.");
  invariant(Array.isArray(lineage.replacementHistory), "Holdout lineage replacementHistory must be an array.");
  invariant(JSON.stringify(lineage) === JSON.stringify(rebuilt.lineage), "Holdout lineage metadata is not the exact promotion record.");

  return {
    manifest: frozen,
    lineage,
    identity: {
      promotionPolicyVersion: HOLDOUT_PROMOTION_POLICY_VERSION,
      reviewPolicyVersion: HOLDOUT_REVIEW_POLICY_VERSION,
      candidateManifestSha256: lineage.candidateManifestSha256,
      approvalsSha256: lineage.approvalsSha256,
      nearDuplicateAuditSha256: lineage.nearDuplicateAuditSha256,
      nearDuplicateReportSha256: lineage.nearDuplicateReportSha256,
      developmentManifestSha256: lineage.developmentManifestSha256,
      sourceIntakeSha256: lineage.sourceIntakeSha256,
      sourceAcquisitionManifestSha256: lineage.sourceAcquisitionManifestSha256,
      sourceReviewSha256: lineage.sourceReviewSha256,
      frozenManifestSha256: lineage.frozenManifestSha256
    }
  };
}

export async function loadFrozenHoldoutPackage(manifestPath) {
  const resolvedManifestPath = path.resolve(manifestPath);
  const lineagePath = resolvedManifestPath.replace(/\.json$/u, ".lineage.json");
  invariant(lineagePath !== resolvedManifestPath, "Frozen holdout manifest must use a .json extension.");
  invariant(fs.existsSync(lineagePath), `Frozen holdout lineage is missing at ${lineagePath}.`);

  const frozenBytes = fs.readFileSync(resolvedManifestPath);
  const lineage = parseJsonBytes(fs.readFileSync(lineagePath), "frozen holdout lineage");
  const frozen = parseJsonBytes(frozenBytes, "frozen holdout manifest");
  const lineageDirectory = path.dirname(lineagePath);
  const candidatePath = resolveLineagePath(lineageDirectory, lineage?.candidateManifestPath, "candidateManifestPath");
  const approvalsPath = resolveLineagePath(lineageDirectory, lineage?.approvalsPath, "approvalsPath");
  const nearDuplicateAuditPath = resolveLineagePath(
    lineageDirectory,
    lineage?.nearDuplicateAuditPath,
    "nearDuplicateAuditPath"
  );
  const nearDuplicateReportPath = resolveLineagePath(
    lineageDirectory,
    lineage?.nearDuplicateReportPath,
    "nearDuplicateReportPath"
  );
  const developmentManifestPath = resolveLineagePath(
    lineageDirectory,
    lineage?.developmentManifestPath,
    "developmentManifestPath"
  );
  const sourceIntakePath = resolveLineagePath(lineageDirectory, lineage?.sourceIntakePath, "sourceIntakePath");
  const sourceAcquisitionManifestPath = resolveLineagePath(
    lineageDirectory,
    lineage?.sourceAcquisitionManifestPath,
    "sourceAcquisitionManifestPath"
  );
  const sourceReviewPath = resolveLineagePath(lineageDirectory, lineage?.sourceReviewPath, "sourceReviewPath");
  const declaredFrozenPath = resolveLineagePath(lineageDirectory, lineage?.frozenManifestPath, "frozenManifestPath");
  invariant(declaredFrozenPath === resolvedManifestPath, "Lineage frozenManifestPath does not identify the supplied manifest.");

  const candidateBytes = fs.readFileSync(candidatePath);
  const approvalsBytes = fs.readFileSync(approvalsPath);
  const nearDuplicateAuditBytes = fs.readFileSync(nearDuplicateAuditPath);
  const nearDuplicateReportBytes = fs.readFileSync(nearDuplicateReportPath);
  const developmentManifestBytes = fs.readFileSync(developmentManifestPath);
  const sourceIntakeBytes = fs.readFileSync(sourceIntakePath);
  const sourceAcquisitionManifestBytes = fs.readFileSync(sourceAcquisitionManifestPath);
  const sourceReviewBytes = fs.readFileSync(sourceReviewPath);
  const candidate = parseJsonBytes(candidateBytes, "holdout candidate manifest");
  const approvals = parseJsonBytes(approvalsBytes, "holdout approvals");
  const nearDuplicateAudit = parseJsonBytes(nearDuplicateAuditBytes, "holdout near-duplicate audit");
  const sourceReview = parseJsonBytes(sourceReviewBytes, "real-world source review");
  const developmentManifest = parseJsonBytes(developmentManifestBytes, "development manifest");
  const sourceAcquisitionManifest = parseJsonBytes(
    sourceAcquisitionManifestBytes,
    "real-world source acquisition manifest"
  );
  const fileEvidence = loadPromotionFileEvidence({
    candidate,
    developmentManifest,
    sourceAcquisitionManifest,
    sourceReview,
    sourceReviewPath
  });
  return {
    ...await validateFrozenHoldoutArtifacts({
      frozen,
      frozenBytes,
      lineage,
      candidate,
      candidateBytes,
      approvals,
      approvalsBytes,
      nearDuplicateAudit,
      sourceReview,
      nearDuplicateAuditBytes,
      nearDuplicateReportBytes,
      developmentManifestBytes,
      sourceIntakeBytes,
      sourceAcquisitionManifestBytes,
      sourceReviewBytes,
      fileEvidence
    }),
    manifestPath: resolvedManifestPath,
    lineagePath,
    candidatePath,
    approvalsPath,
    nearDuplicateAuditPath,
    nearDuplicateReportPath,
    developmentManifestPath,
    sourceIntakePath,
    sourceAcquisitionManifestPath,
    sourceReviewPath
  };
}

function validateAuthoritativeCandidate(candidate, developmentManifest) {
  invariant(candidate?.status === "development", "Only a development candidate can be promoted.");
  invariant(candidate?.split === "test", "Only a test split can be promoted.");
  invariant(candidate?.benchmarkId === "sift-menu-analysis-holdout-candidate", "Promotion requires the authoritative holdout candidate benchmark ID.");
  invariant(candidate?.corpus?.caseCount === EXPECTED_CASE_COUNT, "Promotion requires corpus.caseCount = 48.");
  invariant(candidate?.corpus?.groupCount === EXPECTED_GROUP_COUNT, "Promotion requires corpus.groupCount = 24.");
  invariant(Array.isArray(candidate?.cases) && candidate.cases.length === EXPECTED_CASE_COUNT, "Promotion requires exactly 48 cases.");
  invariant(
    Array.isArray(candidate?.grouping?.groups) && candidate.grouping.groups.length === EXPECTED_GROUP_COUNT,
    "Promotion requires exactly 24 groups."
  );

  const caseIds = candidate.cases.map((testCase) => testCase?.id);
  invariant(sameSortedStrings(caseIds, EXPECTED_CASE_IDS), "Promotion requires the fixed I-101 through I-148 case membership.");
  invariant(new Set(caseIds).size === EXPECTED_CASE_COUNT, "Candidate case IDs are not unique.");
  const casesById = new Map(candidate.cases.map((testCase) => [testCase.id, testCase]));
  const coveredCaseIds = [];
  const candidateGroupIds = new Set();
  const candidateGroupNames = new Set();
  const groupSourceCounts = new Map();
  const groupLanguageCounts = new Map();
  for (const group of candidate.grouping.groups) {
    invariant(nonEmptyString(group?.id), "Candidate group IDs must be non-empty strings.");
    invariant(nonEmptyString(group?.name), `Candidate group ${group?.id ?? "unknown"} needs a name.`);
    const normalizedGroupName = normalizeGroupName(group.name);
    invariant(normalizedGroupName.length > 0, `Candidate group ${group.id} has an empty normalized name.`);
    invariant(!candidateGroupIds.has(group.id), `Candidate group ${group.id} is duplicated.`);
    invariant(!candidateGroupNames.has(normalizedGroupName), `Candidate group ${group.id} repeats a normalized group name.`);
    candidateGroupIds.add(group.id);
    candidateGroupNames.add(normalizedGroupName);
    invariant(Array.isArray(group?.caseIds) && group.caseIds.length === 2, `Candidate group ${group.id} must contain two cases.`);
    const groupCases = group.caseIds.map((caseId) => casesById.get(caseId));
    invariant(groupCases.every(Boolean), `Candidate group ${group.id} references an unknown case.`);
    coveredCaseIds.push(...group.caseIds);
    invariant(groupCases.every((testCase) => testCase.groupId === group.id), `Candidate group ${group.id} case linkage drifted.`);
    invariant(new Set(groupCases.map((testCase) => testCase.language)).size === 1, `Candidate group ${group.id} must use one language.`);
    invariant(new Set(groupCases.map((testCase) => testCase.cuisine)).size === 1, `Candidate group ${group.id} must use one cuisine label.`);
    invariant(new Set(groupCases.map((testCase) => testCase.qualityVariant)).size === 2, `Candidate group ${group.id} must use two quality variants.`);
    invariant(new Set(groupCases.map(caseCrossContact)).size === 2, `Candidate group ${group.id} must vary cross-contact sensitivity.`);
    const sourceTypes = new Set(groupCases.map((testCase) => testCase.sourceType));
    invariant(sourceTypes.size === 1, `Candidate group ${group.id} cannot mix controlled and real-world cases.`);
    const [sourceType] = sourceTypes;
    invariant(["controlled", "licensed"].includes(sourceType), `Candidate group ${group.id} has an invalid source type.`);
    invariant(
      group.kind === (sourceType === "licensed" ? "licensed_menu" : "controlled_template"),
      `Candidate group ${group.id} kind does not match its source type.`
    );
    increment(groupSourceCounts, sourceType);
    increment(groupLanguageCounts, groupCases[0].language);
  }
  invariant(new Set(coveredCaseIds).size === EXPECTED_CASE_COUNT, "Candidate groups must cover every case exactly once.");
  invariant(sameSortedStrings(coveredCaseIds, EXPECTED_CASE_IDS), "Candidate group membership is incomplete or duplicated.");
  assertExactCounts(groupSourceCounts, { controlled: 18, licensed: EXPECTED_REAL_WORLD_GROUP_COUNT }, "source group");
  const licensedGroupIds = new Set(
    candidate.grouping.groups
      .filter((group) => group.kind === "licensed_menu")
      .map((group) => group.id)
  );
  invariant(
    sameSortedStrings([...licensedGroupIds], [...EXPECTED_REAL_WORLD_GROUP_IDS]),
    "Promotion requires the six predeclared cross-language real-world groups."
  );
  assertExactCounts(groupLanguageCounts, Object.fromEntries(Object.keys(EXPECTED_LANGUAGE_COUNTS).map((language) => [language, 4])), "language group");

  const languageCounts = new Map();
  const qualityCounts = new Map();
  const severityCounts = new Map();
  const crossContactCounts = new Map();
  const sourceCounts = new Map();
  const allergenCounts = new Map();
  const cuisineCounts = new Map();
  const translationCounts = new Map();
  const imageHashes = new Set();
  const imagePaths = new Set();
  let criticalCaseCount = 0;
  let retakeCaseCount = 0;

  for (const testCase of candidate.cases) {
    invariant(testCase.split === "test", `${testCase.id} must remain in the test split.`);
    invariant(nonEmptyString(testCase.language), `${testCase.id} needs a language.`);
    invariant(nonEmptyString(testCase.cuisine), `${testCase.id} needs a cuisine.`);
    invariant(nonEmptyString(testCase.qualityVariant), `${testCase.id} needs a quality variant.`);
    invariant(
      testCase.profile?.restaurantLanguage === testCase.language,
      `${testCase.id} restaurant language must match the visible menu language.`
    );
    increment(languageCounts, testCase.language);
    increment(qualityCounts, testCase.qualityVariant);
    increment(severityCounts, caseSeverity(testCase));
    increment(crossContactCounts, String(caseCrossContact(testCase)));
    increment(sourceCounts, testCase.sourceType);
    increment(cuisineCounts, testCase.cuisine);
    if (testCase.profile.preferredLanguage !== testCase.profile.restaurantLanguage) {
      increment(translationCounts, testCase.language);
    }
    for (const allergy of testCase.profile.allergies) increment(allergenCounts, allergy.name);
    if (testCase.critical) criticalCaseCount += 1;
    if (testCase.expectations?.readability?.needsRetake) retakeCaseCount += 1;

    assertSha256(testCase.image?.sha256, `${testCase.id} image.sha256`);
    invariant(nonEmptyString(testCase.image?.path), `${testCase.id} image.path is required.`);
    invariant(!imageHashes.has(testCase.image.sha256), `${testCase.id} repeats an exact candidate image hash.`);
    invariant(!imagePaths.has(testCase.image.path), `${testCase.id} repeats a candidate image path.`);
    imageHashes.add(testCase.image.sha256);
    imagePaths.add(testCase.image.path);
    validateCaseSource(testCase);
  }

  assertExactCounts(languageCounts, EXPECTED_LANGUAGE_COUNTS, "language case");
  assertExactCounts(qualityCounts, EXPECTED_QUALITY_COUNTS, "quality variant");
  assertExactCounts(severityCounts, EXPECTED_SEVERITY_COUNTS, "profile severity");
  assertExactCounts(crossContactCounts, EXPECTED_CROSS_CONTACT_COUNTS, "cross-contact profile");
  assertExactCounts(sourceCounts, EXPECTED_SOURCE_COUNTS, "source case");
  assertExactCounts(allergenCounts, EXPECTED_ALLERGEN_COUNTS, "allergen");
  assertExactCounts(translationCounts, Object.fromEntries(Object.keys(EXPECTED_LANGUAGE_COUNTS).map((language) => [language, 2])), "cross-language case");
  invariant([...translationCounts.values()].reduce((sum, count) => sum + count, 0) === EXPECTED_TRANSLATION_CASE_COUNT, "Promotion requires exactly 12 cross-language cases.");
  invariant(cuisineCounts.size === EXPECTED_GROUP_COUNT, "Promotion requires 24 distinct cuisine labels.");
  invariant([...cuisineCounts.values()].every((count) => count === 2), "Each cuisine label must cover exactly one two-case group.");
  invariant(criticalCaseCount === EXPECTED_CRITICAL_CASE_COUNT, "Promotion requires exactly 24 critical cases.");
  invariant(retakeCaseCount === EXPECTED_RETAKE_CASE_COUNT, "Promotion requires exactly 12 poor-image retake cases.");

  assertSha256(candidate.corpus?.sourceManifest?.sha256, "candidate corpus.sourceManifest.sha256");
  assertSha256(candidate.corpus?.sha256, "candidate corpus.sha256");
  const corpusFingerprint = {
    sourceManifestSha256: candidate.corpus.sourceManifest.sha256,
    cases: candidate.cases.map((testCase) => ({
      id: testCase.id,
      groupId: testCase.groupId,
      imagePath: testCase.image.path,
      imageSha256: testCase.image.sha256
    }))
  };
  invariant(
    candidate.corpus.sha256 === sha256Bytes(Buffer.from(stableStringify(corpusFingerprint), "utf8")),
    "Candidate corpus SHA-256 is not the exact authoritative case/image fingerprint."
  );

  const development = developmentInventory(developmentManifest);
  const exactHashOverlap = [...imageHashes].filter((hash) => development.imageHashes.has(hash));
  invariant(exactHashOverlap.length === 0, "Candidate and development splits contain an exact duplicate image hash.");
  const exactPathOverlap = [...imagePaths].filter((imagePath) => development.imagePaths.has(imagePath));
  invariant(exactPathOverlap.length === 0, "Candidate and development splits contain an exact duplicate image path.");
  const developmentIds = new Set(development.caseIds);
  invariant(caseIds.every((caseId) => !developmentIds.has(caseId)), "Candidate and development splits contain a duplicate case ID.");
  invariant(
    [...candidateGroupIds].every((groupId) => !development.groupIds.has(groupId)),
    "Candidate and development splits contain a duplicate group ID."
  );
  invariant(
    [...candidateGroupNames].every((groupName) => !development.groupNames.has(groupName)),
    "Candidate and development splits contain a duplicate normalized group name."
  );
}

function buildRealWorldSourceInventory({ candidate, sourceIntakeBytes, sourceAcquisitionManifestBytes, fileEvidence }) {
  const normalizedIntakeBytes = requireBytes(sourceIntakeBytes, "real-world source intake");
  const normalizedAcquisitionBytes = requireBytes(
    sourceAcquisitionManifestBytes,
    "real-world source acquisition manifest"
  );
  const intake = parseJsonBytes(normalizedIntakeBytes, "real-world source intake");
  const acquisition = parseJsonBytes(normalizedAcquisitionBytes, "real-world source acquisition manifest");
  const sourceIntakeSha256 = sha256Bytes(normalizedIntakeBytes);
  const sourceAcquisitionManifestSha256 = sha256Bytes(normalizedAcquisitionBytes);

  invariant(intake?.schemaVersion === "1.0.0", "Real-world source intake schemaVersion is unsupported.");
  validateRealWorldSourceCandidates(
    intake,
    JSON.parse(fs.readFileSync(CANONICAL_HOLDOUT_SOURCE_PATH, "utf8")),
    JSON.parse(fs.readFileSync(CANONICAL_DEVELOPMENT_LICENSES_PATH, "utf8"))
  );
  invariant(
    intake?.status === "research_pending_rights_and_suitability_review",
    "Real-world source intake must remain an unapproved research artifact."
  );
  invariant(Array.isArray(intake?.candidates) && intake.candidates.length === 6, "Real-world source intake must contain six candidates.");
  invariant(acquisition?.schemaVersion === "2.0.0", "Real-world source acquisition schemaVersion is unsupported.");
  invariant(acquisition?.artifactType === "sift-real-world-source-acquisition", "Real-world source acquisition type is invalid.");
  invariant(acquisition?.mode === "download", "Real-world source acquisition must be established by --download.");
  invariant(acquisition?.status === "complete", "Real-world source acquisition must be complete before promotion.");
  invariant(acquisition?.sourceCount === 6, "Real-world source acquisition sourceCount must be six.");
  invariant(acquisition?.approvalStatus === "not_approved", "Acquisition receipts must not claim review approval.");
  invariant(acquisition?.containsBenchmarkLabels === false, "Acquisition receipts must remain label-blind.");
  invariant(acquisition?.intakeSha256 === sourceIntakeSha256, "Acquisition receipt does not match the exact source-intake bytes.");
  invariant(Array.isArray(acquisition?.sources) && acquisition.sources.length === 6, "Acquisition receipt must contain six sources.");

  const intakeByCaseId = new Map();
  const intakeBySourceId = new Map();
  for (const source of intake.candidates) {
    invariant(nonEmptyString(source?.candidateSourceId), "Source intake candidateSourceId is missing.");
    invariant(!intakeBySourceId.has(source.candidateSourceId), `Source intake repeats ${source.candidateSourceId}.`);
    intakeBySourceId.set(source.candidateSourceId, source);
    invariant(
      Array.isArray(source?.proposedReplacement?.caseIds) && source.proposedReplacement.caseIds.length === 2,
      `${source.candidateSourceId} must map one complete two-case group.`
    );
    for (const caseId of source.proposedReplacement.caseIds) {
      invariant(!intakeByCaseId.has(caseId), `Source intake maps case ${caseId} more than once.`);
      intakeByCaseId.set(caseId, source);
    }
  }

  const acquisitionBySourceId = new Map();
  for (const receipt of acquisition.sources) {
    invariant(nonEmptyString(receipt?.candidateSourceId), "Acquisition source ID is missing.");
    invariant(!acquisitionBySourceId.has(receipt.candidateSourceId), `Acquisition repeats ${receipt.candidateSourceId}.`);
    assertSha256(receipt?.sha256, `${receipt.candidateSourceId} acquisition sha256`);
    invariant(nonEmptyString(receipt?.resolvedUrl), `${receipt.candidateSourceId} acquisition resolvedUrl is missing.`);
    invariant(nonEmptyString(receipt?.sourceFileTitle), `${receipt.candidateSourceId} acquisition sourceFileTitle is missing.`);
    invariant(
      fileEvidence?.sourceImageSha256BySourceId?.get(receipt.candidateSourceId) === receipt.sha256,
      `${receipt.candidateSourceId} acquisition receipt is not bound to the actual source image bytes.`
    );
    acquisitionBySourceId.set(receipt.candidateSourceId, receipt);
  }
  invariant(
    sameSortedStrings([...acquisitionBySourceId.keys()], [...intakeBySourceId.keys()]),
    "Acquisition receipt must cover the exact six source-intake candidates."
  );

  const licensedCases = candidate.cases.filter((testCase) => testCase.sourceType === "licensed");
  invariant(licensedCases.length === EXPECTED_REAL_WORLD_CASE_COUNT, "Candidate must contain exactly 12 licensed cases.");
  const cases = licensedCases.map((testCase) => {
    const source = intakeByCaseId.get(testCase.id);
    invariant(source, `${testCase.id} is not mapped by the reviewed source intake.`);
    invariant(
      source.proposedReplacement.groupId === testCase.groupId,
      `${testCase.id} source intake maps a different holdout group.`
    );
    const receipt = acquisitionBySourceId.get(source.candidateSourceId);
    invariant(receipt, `${testCase.id} source ${source.candidateSourceId} lacks a trusted download receipt.`);
    invariant(receipt.sourcePageUrl === source.provenance.sourcePageUrl, `${testCase.id} acquisition source page drifted.`);
    invariant(receipt.downloadUrl === source.provenance.downloadUrl, `${testCase.id} acquisition download URL drifted.`);
    invariant(receipt.licenseIdentifier === source.license.identifier, `${testCase.id} acquisition license declaration drifted.`);
    invariant(testCase.provenance.sourceTitle === source.provenance.sourceTitle, `${testCase.id} source title drifted from intake.`);
    invariant(testCase.provenance.sourceCreator === source.provenance.sourceCreator, `${testCase.id} source creator drifted from intake.`);
    invariant(testCase.provenance.sourcePageUrl === source.provenance.sourcePageUrl, `${testCase.id} source page drifted from intake.`);
    invariant(testCase.license.identifier === source.license.identifier, `${testCase.id} license identifier drifted from intake.`);
    invariant(testCase.license.creator === source.provenance.sourceCreator, `${testCase.id} license creator drifted from intake.`);
    invariant(
      testCase.license.attributionRequired === source.license.attributionRequired,
      `${testCase.id} attribution requirement drifted from intake.`
    );
    invariant(testCase.license.licenseUrl === source.license.licenseUrl, `${testCase.id} license URL drifted from intake.`);
    invariant(testCase.license.sourcePageUrl === source.provenance.sourcePageUrl, `${testCase.id} rights source page drifted from intake.`);
    invariant(
      fileEvidence?.candidateImageSha256ByCaseId?.get(testCase.id) === testCase.image.sha256,
      `${testCase.id} transformed candidate bytes do not match image.sha256.`
    );
    return {
      id: testCase.id,
      candidateSourceId: source.candidateSourceId,
      sourceImageSha256: receipt.sha256,
      outputImageSha256: testCase.image.sha256
    };
  }).sort((left, right) => left.id.localeCompare(right.id));

  invariant(cases.length === 12, "Real-world source inventory must bind exactly 12 cases.");
  invariant(new Set(cases.map((item) => item.candidateSourceId)).size === 6, "Real-world source inventory must bind six independent sources.");
  return { sourceIntakeSha256, sourceAcquisitionManifestSha256, cases };
}

function validateRealWorldSourceReview({
  candidate,
  candidateSha256,
  sourceReview,
  sourceIntakeBytes,
  sourceAcquisitionManifestBytes,
  fileEvidence
}) {
  const inventory = buildRealWorldSourceInventory({
    candidate,
    sourceIntakeBytes,
    sourceAcquisitionManifestBytes,
    fileEvidence
  });
  invariant(sourceReview?.schemaVersion === "2.0.0", "Real-world source review schemaVersion is unsupported.");
  invariant(
    sourceReview?.reviewPolicyVersion === REAL_WORLD_SOURCE_REVIEW_POLICY_VERSION,
    `Real-world source review policy must be ${REAL_WORLD_SOURCE_REVIEW_POLICY_VERSION}.`
  );
  invariant(sourceReview?.status === "approved", "Real-world source review must be approved before promotion.");
  invariant(sourceReview?.candidateManifestSha256 === candidateSha256, "Source review does not match the exact candidate bytes.");
  invariant(sourceReview?.sourceIntakeSha256 === inventory.sourceIntakeSha256, "Source review does not match the exact intake bytes.");
  invariant(
    sourceReview?.sourceAcquisitionManifestSha256 === inventory.sourceAcquisitionManifestSha256,
    "Source review does not match the exact acquisition receipt bytes."
  );
  invariant(Array.isArray(sourceReview?.cases), "Real-world source review cases are missing.");
  invariant(
    sameSortedStrings(sourceReview.cases.map((item) => item?.id), inventory.cases.map((item) => item.id)),
    "Real-world source review must cover the exact 12 licensed cases."
  );

  const expectedById = new Map(inventory.cases.map((item) => [item.id, item]));
  const rightsEvidenceByCaseId = new Map();
  for (const review of sourceReview.cases) {
    const expected = expectedById.get(review.id);
    invariant(review.candidateSourceId === expected.candidateSourceId, `${review.id} source review maps a different source.`);
    invariant(review.sourceImageSha256 === expected.sourceImageSha256, `${review.id} source-image hash drifted.`);
    invariant(review.outputImageSha256 === expected.outputImageSha256, `${review.id} output-image hash drifted.`);
    const rights = normalizeCompletedEvidenceReview(review.rightsReview, `${review.id} rights review`, fileEvidence);
    normalizeCompletedEvidenceReview(review.suitabilityReview, `${review.id} suitability review`, fileEvidence);
    normalizeCompletedEvidenceReview(review.transformationReview, `${review.id} transformation review`, fileEvidence);
    rightsEvidenceByCaseId.set(review.id, rights.evidenceSha256);
  }
  return { rightsEvidenceByCaseId };
}

function validateNearDuplicateAudit({
  candidate,
  audit,
  candidateSha256,
  developmentManifest,
  developmentManifestSha256,
  reportBytes,
  reportSha256,
  sourceReviewEvidence,
  fileEvidence,
  perceptualEvidence
}) {
  validateManifestFileEvidence(candidate, fileEvidence?.candidateImageSha256ByCaseId, "candidate");
  validateManifestFileEvidence(developmentManifest, fileEvidence?.developmentImageSha256ByCaseId, "development");
  invariant(
    audit?.schemaVersion === NEAR_DUPLICATE_AUDIT_SCHEMA_VERSION,
    `Near-duplicate audit schemaVersion must be ${NEAR_DUPLICATE_AUDIT_SCHEMA_VERSION}.`
  );
  invariant(
    audit?.promotionPolicyVersion === HOLDOUT_PROMOTION_POLICY_VERSION,
    `Near-duplicate audit promotionPolicyVersion must be ${HOLDOUT_PROMOTION_POLICY_VERSION}.`
  );
  invariant(audit?.status === "approved", "Near-duplicate audit must be approved before promotion.");
  invariant(audit?.candidateManifestSha256 === candidateSha256, "Near-duplicate audit does not match the exact candidate bytes.");
  invariant(
    audit?.developmentManifestSha256 === developmentManifestSha256,
    "Near-duplicate audit does not match the exact development manifest bytes."
  );
  invariant(audit?.scope?.comparison === NEAR_DUPLICATE_COMPARISON_SCOPE, "Near-duplicate audit comparison scope is incomplete.");
  invariant(
    sameSortedStrings(audit?.scope?.candidateCaseIds ?? [], candidate.cases.map((testCase) => testCase.id)),
    "Near-duplicate audit must cover every candidate case exactly once."
  );
  invariant(
    sameSortedStrings(audit?.scope?.developmentCaseIds ?? [], developmentInventory(developmentManifest).caseIds),
    "Near-duplicate audit must cover every development case exactly once."
  );

  const realWorldCases = candidate.cases.filter((testCase) => testCase.sourceType === "licensed");
  const subset = audit?.realWorldSubset;
  invariant(subset?.requiredCaseCount === EXPECTED_REAL_WORLD_CASE_COUNT, "Real-world audit must lock the required case count to 12.");
  invariant(subset?.status === "approved", "Real-world subset must be approved before promotion.");
  invariant(Array.isArray(subset?.cases), "Real-world subset evidence is missing.");
  invariant(
    sameSortedStrings(subset.cases.map((item) => item?.id), realWorldCases.map((testCase) => testCase.id)),
    "Real-world subset evidence must cover the exact 12 licensed/user-captured cases."
  );
  for (const item of subset.cases) {
    invariant(item?.acquisitionType === "licensed_external", `${item?.id ?? "Real-world case"} acquisition type is invalid.`);
    assertSha256(item?.rightsEvidenceSha256, `${item.id} rightsEvidenceSha256`);
    invariant(
      item.rightsEvidenceSha256 === sourceReviewEvidence?.rightsEvidenceByCaseId?.get(item.id),
      `${item.id} near-duplicate audit rights evidence is not the reviewed source evidence.`
    );
    invariant(nonEmptyString(item?.notes), `${item.id} needs real-world rights notes.`);
  }
  invariant(nonEmptyString(subset?.reviewerId), "Real-world subset needs a reviewerId.");
  normalizeTimestamp(subset?.reviewedAt, "real-world subset reviewedAt");
  invariant(nonEmptyString(subset?.notes), "Real-world subset needs review notes.");

  const perceptual = audit?.perceptualAudit;
  invariant(perceptual?.status === "approved", "Perceptual/near-duplicate audit must be approved before promotion.");
  invariant(perceptual?.method === PERCEPTUAL_AUDIT_METHOD, "Near-duplicate evidence must use perceptual hashing plus visual review.");
  invariant(perceptual?.toolName === PERCEPTUAL_AUDIT_TOOL_NAME, "Near-duplicate audit toolName is unsupported.");
  invariant(perceptual?.toolVersion === PERCEPTUAL_AUDIT_TOOL_VERSION, "Near-duplicate audit toolVersion is unsupported.");
  invariant(perceptual?.distanceMetric === PERCEPTUAL_DISTANCE_METRIC, "Near-duplicate audit distanceMetric is unsupported.");
  invariant(perceptual?.hashBits === PERCEPTUAL_HASH_BITS, "Near-duplicate audit hashBits is unsupported.");
  invariant(
    perceptual?.maximumNearDuplicateDistance === MAXIMUM_NEAR_DUPLICATE_DISTANCE,
    "Near-duplicate audit distance threshold is unsupported."
  );
  invariant(Array.isArray(perceptual?.exactDuplicatePairs), "Exact duplicate pairs must be an array.");
  invariant(Array.isArray(perceptual?.nearDuplicatePairs), "Near-duplicate pairs must be an array.");
  normalizePortableRelativePath(perceptual?.reportPath, "perceptualAudit.reportPath");
  assertSha256(perceptual?.reportSha256, "near-duplicate audit reportSha256");
  invariant(perceptual.reportSha256 === reportSha256, "Near-duplicate audit reportSha256 does not match the actual report bytes.");
  validateNearDuplicateReport({
    candidate,
    developmentManifest,
    candidateSha256,
    developmentManifestSha256,
    reportBytes,
    perceptualAudit: perceptual,
    perceptualEvidence
  });
  invariant(nonEmptyString(perceptual?.reviewerId), "Near-duplicate audit needs a reviewerId.");
  normalizeTimestamp(perceptual?.reviewedAt, "near-duplicate audit reviewedAt");
  invariant(nonEmptyString(perceptual?.notes), "Near-duplicate audit needs review notes.");
}

function validateManifestFileEvidence(manifest, evidenceByCaseId, label) {
  invariant(evidenceByCaseId instanceof Map, `${label} file evidence is missing.`);
  invariant(evidenceByCaseId.size === manifest.cases.length, `${label} file evidence is incomplete.`);
  for (const testCase of manifest.cases) {
    invariant(
      evidenceByCaseId.get(testCase.id) === testCase.image.sha256,
      `${testCase.id} ${label} image bytes are not bound to the manifest.`
    );
  }
}

function validateNearDuplicateReport({
  candidate,
  developmentManifest,
  candidateSha256,
  developmentManifestSha256,
  reportBytes,
  perceptualAudit,
  perceptualEvidence
}) {
  const report = parseJsonBytes(requireBytes(reportBytes, "near-duplicate audit report"), "near-duplicate audit report");
  invariant(
    report?.schemaVersion === NEAR_DUPLICATE_REPORT_SCHEMA_VERSION,
    `Near-duplicate audit report schemaVersion must be ${NEAR_DUPLICATE_REPORT_SCHEMA_VERSION}.`
  );
  invariant(report?.candidateManifestSha256 === candidateSha256, "Near-duplicate audit report does not match the exact candidate bytes.");
  invariant(
    report?.developmentManifestSha256 === developmentManifestSha256,
    "Near-duplicate audit report does not match the exact development manifest bytes."
  );
  invariant(report?.comparisonScope === NEAR_DUPLICATE_COMPARISON_SCOPE, "Near-duplicate audit report comparison scope is incomplete.");
  invariant(report?.method === perceptualAudit.method, "Near-duplicate audit report method does not match the approved audit.");
  invariant(report?.toolName === perceptualAudit.toolName, "Near-duplicate audit report toolName does not match the approved audit.");
  invariant(report?.toolVersion === perceptualAudit.toolVersion, "Near-duplicate audit report toolVersion does not match the approved audit.");
  invariant(report?.distanceMetric === perceptualAudit.distanceMetric, "Near-duplicate audit report distanceMetric does not match the approved audit.");
  invariant(report?.hashBits === perceptualAudit.hashBits, "Near-duplicate audit report hashBits does not match the approved audit.");
  invariant(
    report?.maximumNearDuplicateDistance === perceptualAudit.maximumNearDuplicateDistance,
    "Near-duplicate audit report distance threshold does not match the approved audit."
  );

  const expectedComparisons = expectedNearDuplicateComparisons(candidate, developmentManifest);
  validateComputedPerceptualEvidence(candidate, developmentManifest, perceptualEvidence, expectedComparisons);
  const expectedById = new Map(expectedComparisons.map((comparison) => [comparison.comparisonId, comparison]));
  const expectedCandidatePairCount = expectedComparisons.filter((item) => item.scope === CANDIDATE_PAIR_SCOPE).length;
  const expectedDevelopmentPairCount = expectedComparisons.length - expectedCandidatePairCount;
  const inventory = report?.inventory;
  invariant(inventory?.candidateVsCandidateCount === expectedCandidatePairCount, "Near-duplicate report has an incomplete candidate-vs-candidate inventory.");
  invariant(inventory?.candidateVsDevelopmentCount === expectedDevelopmentPairCount, "Near-duplicate report has an incomplete candidate-vs-development inventory.");
  invariant(inventory?.totalCount === expectedComparisons.length, "Near-duplicate report total comparison count is incomplete.");
  invariant(Array.isArray(inventory?.comparisons), "Near-duplicate report comparisons are missing.");
  invariant(inventory.comparisons.length === expectedComparisons.length, "Near-duplicate report must include the complete comparison inventory.");

  const seen = new Set();
  const exactDuplicateIds = [];
  const nearDuplicateIds = [];
  for (const comparison of inventory.comparisons) {
    invariant(nonEmptyString(comparison?.comparisonId), "Near-duplicate report comparisonId is missing.");
    invariant(!seen.has(comparison.comparisonId), `Near-duplicate report repeats comparison ${comparison.comparisonId}.`);
    seen.add(comparison.comparisonId);
    const expected = expectedById.get(comparison.comparisonId);
    invariant(expected, `Near-duplicate report contains unrelated comparison ${comparison.comparisonId}.`);
    for (const key of ["scope", "leftCaseId", "rightCaseId", "leftImageSha256", "rightImageSha256"]) {
      invariant(comparison?.[key] === expected[key], `Near-duplicate report comparison ${comparison.comparisonId} has the wrong ${key}.`);
    }
    const computed = perceptualEvidence.comparisonsById.get(comparison.comparisonId);
    invariant(
      comparison?.leftPerceptualHash === computed.leftPerceptualHash &&
        comparison?.rightPerceptualHash === computed.rightPerceptualHash,
      `Near-duplicate report comparison ${comparison.comparisonId} has forged perceptual hashes.`
    );
    invariant(
      comparison?.perceptualDistance === computed.perceptualDistance,
      `Near-duplicate report comparison ${comparison.comparisonId} has a forged perceptualDistance.`
    );
    invariant(
      VISUAL_VERDICTS.has(comparison?.visualVerdict),
      `Near-duplicate report comparison ${comparison.comparisonId} needs a visual verdict.`
    );
    if (comparison.perceptualDistance <= perceptualAudit.maximumNearDuplicateDistance) {
      invariant(
        nonEmptyString(comparison?.notes),
        `Near-threshold comparison ${comparison.comparisonId} needs visual-review notes.`
      );
    }
    if (comparison.visualVerdict === "exact_duplicate") exactDuplicateIds.push(comparison.comparisonId);
    if (comparison.visualVerdict === "near_duplicate") nearDuplicateIds.push(comparison.comparisonId);
    invariant(
      comparison.leftImageSha256 !== comparison.rightImageSha256,
      `Exact duplicate image bytes in ${comparison.comparisonId} block promotion.`
    );
  }
  invariant(seen.size === expectedById.size, "Near-duplicate report does not cover the complete expected comparison inventory.");

  const declaredExactIds = normalizeDeclaredPairIds(perceptualAudit.exactDuplicatePairs, expectedComparisons, "exact duplicate");
  const declaredNearIds = normalizeDeclaredPairIds(perceptualAudit.nearDuplicatePairs, expectedComparisons, "near duplicate");
  invariant(sameSortedStrings(declaredExactIds, exactDuplicateIds), "Exact duplicate pairs do not match the actual audit report.");
  invariant(sameSortedStrings(declaredNearIds, nearDuplicateIds), "Near-duplicate pairs do not match the actual audit report.");
  invariant(exactDuplicateIds.length === 0, "Exact duplicate pairs in the audit report block promotion.");
  invariant(nearDuplicateIds.length === 0, "Near-duplicate pairs in the audit report block promotion.");
}

function validateComputedPerceptualEvidence(
  candidate,
  developmentManifest,
  perceptualEvidence,
  expectedComparisons
) {
  invariant(perceptualEvidence?.method === PERCEPTUAL_AUDIT_METHOD, "Computed perceptual evidence method is unsupported.");
  invariant(perceptualEvidence?.toolName === PERCEPTUAL_AUDIT_TOOL_NAME, "Computed perceptual evidence toolName is unsupported.");
  invariant(perceptualEvidence?.toolVersion === PERCEPTUAL_AUDIT_TOOL_VERSION, "Computed perceptual evidence toolVersion is unsupported.");
  invariant(perceptualEvidence?.distanceMetric === PERCEPTUAL_DISTANCE_METRIC, "Computed perceptual evidence distanceMetric is unsupported.");
  invariant(perceptualEvidence?.hashBits === PERCEPTUAL_HASH_BITS, "Computed perceptual evidence hashBits is unsupported.");
  invariant(
    perceptualEvidence?.maximumNearDuplicateDistance === MAXIMUM_NEAR_DUPLICATE_DISTANCE,
    "Computed perceptual evidence threshold is unsupported."
  );
  invariant(
    perceptualEvidence?.candidateHashesByCaseId instanceof Map &&
      perceptualEvidence.candidateHashesByCaseId.size === candidate.cases.length,
    "Computed candidate perceptual hashes are incomplete."
  );
  invariant(
    perceptualEvidence?.developmentHashesByCaseId instanceof Map &&
      perceptualEvidence.developmentHashesByCaseId.size === developmentManifest.cases.length,
    "Computed development perceptual hashes are incomplete."
  );
  invariant(
    perceptualEvidence?.comparisonsById instanceof Map &&
      perceptualEvidence.comparisonsById.size === expectedComparisons.length,
    "Computed perceptual comparison inventory is incomplete."
  );
  for (const testCase of candidate.cases) {
    assertPerceptualHash(
      perceptualEvidence.candidateHashesByCaseId.get(testCase.id),
      `${testCase.id} candidate perceptual hash`
    );
  }
  for (const testCase of developmentManifest.cases) {
    assertPerceptualHash(
      perceptualEvidence.developmentHashesByCaseId.get(testCase.id),
      `${testCase.id} development perceptual hash`
    );
  }
  for (const comparison of expectedComparisons) {
    const computed = perceptualEvidence.comparisonsById.get(comparison.comparisonId);
    invariant(computed?.comparisonId === comparison.comparisonId, `Computed perceptual evidence is missing ${comparison.comparisonId}.`);
    assertPerceptualHash(computed.leftPerceptualHash, `${comparison.comparisonId} left perceptual hash`);
    assertPerceptualHash(computed.rightPerceptualHash, `${comparison.comparisonId} right perceptual hash`);
    invariant(
      Number.isInteger(computed.perceptualDistance) &&
        computed.perceptualDistance >= 0 &&
        computed.perceptualDistance <= PERCEPTUAL_HASH_BITS,
      `${comparison.comparisonId} computed perceptual distance is invalid.`
    );
  }
}

function assertPerceptualHash(value, label) {
  invariant(
    typeof value === "string" && new RegExp(`^[0-9a-f]{${PERCEPTUAL_HASH_BITS / 4}}$`, "u").test(value),
    `${label} is invalid.`
  );
}

function expectedNearDuplicateComparisons(candidate, developmentManifest) {
  const candidateCases = [...candidate.cases].sort((left, right) => left.id.localeCompare(right.id));
  const developmentCases = [...developmentManifest.cases].sort((left, right) => left.id.localeCompare(right.id));
  const comparisons = [];
  for (let leftIndex = 0; leftIndex < candidateCases.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidateCases.length; rightIndex += 1) {
      comparisons.push(comparisonIdentity(CANDIDATE_PAIR_SCOPE, candidateCases[leftIndex], candidateCases[rightIndex]));
    }
  }
  for (const candidateCase of candidateCases) {
    for (const developmentCase of developmentCases) {
      comparisons.push(comparisonIdentity(DEVELOPMENT_PAIR_SCOPE, candidateCase, developmentCase));
    }
  }
  return comparisons;
}

function comparisonIdentity(scope, leftCase, rightCase) {
  return {
    comparisonId: `${scope}:${leftCase.id}:${rightCase.id}`,
    scope,
    leftCaseId: leftCase.id,
    rightCaseId: rightCase.id,
    leftImageSha256: leftCase.image.sha256,
    rightImageSha256: rightCase.image.sha256
  };
}

function normalizeDeclaredPairIds(pairs, expectedComparisons, label) {
  invariant(Array.isArray(pairs), `Near-duplicate audit ${label} pairs must be an array.`);
  const expectedById = new Map(expectedComparisons.map((comparison) => [comparison.comparisonId, comparison]));
  const expectedByCases = new Map();
  for (const comparison of expectedComparisons) {
    expectedByCases.set(`${comparison.leftCaseId}:${comparison.rightCaseId}`, comparison.comparisonId);
    if (comparison.scope === CANDIDATE_PAIR_SCOPE) {
      expectedByCases.set(`${comparison.rightCaseId}:${comparison.leftCaseId}`, comparison.comparisonId);
    }
  }
  return pairs.map((pair) => {
    const comparisonId = nonEmptyString(pair?.comparisonId)
      ? pair.comparisonId
      : expectedByCases.get(`${pair?.leftCaseId}:${pair?.rightCaseId}`);
    invariant(nonEmptyString(comparisonId) && expectedById.has(comparisonId), `Near-duplicate audit ${label} pair is unrelated to the comparison inventory.`);
    return comparisonId;
  });
}

function validateAndApplyApprovals(candidate, approvals, candidateSha256) {
  invariant(approvals?.schemaVersion === HOLDOUT_LINEAGE_SCHEMA_VERSION, `Approval schemaVersion must be ${HOLDOUT_LINEAGE_SCHEMA_VERSION}.`);
  invariant(
    approvals?.reviewPolicyVersion === HOLDOUT_REVIEW_POLICY_VERSION,
    `Approval reviewPolicyVersion must be ${HOLDOUT_REVIEW_POLICY_VERSION}.`
  );
  invariant(approvals?.candidateManifestSha256 === candidateSha256, "Approvals do not match the exact candidate manifest bytes.");
  invariant(Array.isArray(approvals?.cases), "Approval cases are missing.");

  const candidateIds = candidate.cases.map((testCase) => testCase.id);
  const approvalIds = approvals.cases.map((review) => review?.id);
  invariant(approvalIds.every(nonEmptyString), "Approval case IDs must be non-empty strings.");
  invariant(new Set(approvalIds).size === approvalIds.length, "Approval case IDs are not unique.");
  invariant(sameSortedStrings(candidateIds, approvalIds), "Approvals must cover every candidate case exactly once.");

  const reviewsById = new Map(approvals.cases.map((review) => [review.id, review]));
  return candidate.cases.map((testCase) => {
    const approval = reviewsById.get(testCase.id);
    invariant(approval?.status === "approved", `${testCase.id} is not approved.`);
    const primaryReview = normalizeCompletedReview(approval.primaryReview, `${testCase.id} primary review`);
    let secondaryReview = null;
    if (testCase.critical || approval.secondaryReview !== null) {
      secondaryReview = normalizeCompletedReview(approval.secondaryReview, `${testCase.id} secondary review`);
      invariant(
        secondaryReview.reviewerId !== primaryReview.reviewerId,
        `${testCase.id} primary and secondary reviewers must differ.`
      );
    }
    invariant(!testCase.critical || secondaryReview !== null, `${testCase.id} is critical and needs an independent secondary review.`);

    return {
      ...testCase,
      review: {
        status: "approved",
        reviewPolicyVersion: HOLDOUT_REVIEW_POLICY_VERSION,
        primaryReview,
        secondaryReview
      }
    };
  });
}

function validateCaseSource(testCase) {
  assertSha256(testCase.provenance?.sourceRecordSha256, `${testCase.id} provenance.sourceRecordSha256`);
  if (testCase.sourceType === "controlled") {
    invariant(testCase.provenance?.origin === "controlled_fixture", `${testCase.id} controlled provenance is invalid.`);
    invariant(testCase.license?.status === "internal_fixture", `${testCase.id} controlled license is invalid.`);
    return;
  }
  invariant(testCase.sourceType === "licensed", `${testCase.id} sourceType must be controlled or licensed.`);
  invariant(testCase.provenance?.origin === "licensed_external", `${testCase.id} real-world provenance must be licensed_external.`);
  invariant(nonEmptyString(testCase.provenance?.sourceTitle), `${testCase.id} real-world source title is required.`);
  invariant(nonEmptyString(testCase.provenance?.sourceCreator), `${testCase.id} real-world source creator is required.`);
  invariant(isHttpsUrl(testCase.provenance?.sourcePageUrl), `${testCase.id} real-world provenance needs an HTTPS source URL.`);
  invariant(testCase.license?.status === "declared", `${testCase.id} real-world rights must be declared.`);
  invariant(nonEmptyString(testCase.license?.identifier), `${testCase.id} needs a license or consent identifier.`);
  invariant(nonEmptyString(testCase.license?.creator), `${testCase.id} needs a rights-holder/creator.`);
  invariant(typeof testCase.license?.attributionRequired === "boolean", `${testCase.id} attribution requirement is missing.`);
  invariant(isHttpsUrl(testCase.license?.sourcePageUrl), `${testCase.id} rights record needs an HTTPS source URL.`);
  invariant(nonEmptyString(testCase.license?.notes), `${testCase.id} needs rights notes.`);
}

function developmentInventory(manifest) {
  invariant(Array.isArray(manifest?.cases) && manifest.cases.length > 0, "Development manifest cases are missing.");
  invariant(Array.isArray(manifest?.grouping?.groups) && manifest.grouping.groups.length > 0, "Development manifest groups are missing.");
  const caseIds = manifest.cases.map((testCase) => testCase?.id);
  invariant(caseIds.every(nonEmptyString), "Development case IDs must be non-empty strings.");
  invariant(new Set(caseIds).size === caseIds.length, "Development case IDs are not unique.");
  const imageHashes = new Set();
  const imagePaths = new Set();
  for (const testCase of manifest.cases) {
    assertSha256(testCase.image?.sha256, `Development case ${testCase.id} image.sha256`);
    invariant(nonEmptyString(testCase.image?.path), `Development case ${testCase.id} image.path is required.`);
    invariant(!imageHashes.has(testCase.image.sha256), `Development case ${testCase.id} repeats an exact image hash.`);
    invariant(!imagePaths.has(testCase.image.path), `Development case ${testCase.id} repeats an image path.`);
    imageHashes.add(testCase.image.sha256);
    imagePaths.add(testCase.image.path);
  }
  const groupIds = new Set();
  const groupNames = new Set();
  for (const group of manifest.grouping.groups) {
    invariant(nonEmptyString(group?.id), "Development group IDs must be non-empty strings.");
    invariant(nonEmptyString(group?.name), `Development group ${group.id} needs a name.`);
    const normalizedName = normalizeGroupName(group.name);
    invariant(normalizedName.length > 0, `Development group ${group.id} has an empty normalized name.`);
    invariant(!groupIds.has(group.id), `Development group ${group.id} is duplicated.`);
    invariant(!groupNames.has(normalizedName), `Development group ${group.id} repeats a normalized name.`);
    groupIds.add(group.id);
    groupNames.add(normalizedName);
  }
  return { caseIds, imageHashes, imagePaths, groupIds, groupNames };
}

function caseSeverity(testCase) {
  const allergies = testCase?.profile?.allergies;
  invariant(Array.isArray(allergies) && allergies.length > 0, `${testCase?.id ?? "Candidate case"} needs allergies.`);
  const severities = new Set(allergies.map((allergy) => allergy?.severity));
  invariant(severities.size === 1, `${testCase.id} must use one profile severity.`);
  const [severity] = severities;
  invariant(["mild", "severe"].includes(severity), `${testCase.id} severity must be mild or severe.`);
  return severity;
}

function caseCrossContact(testCase) {
  const values = new Set(testCase.profile.allergies.map((allergy) => allergy?.avoidCrossContact));
  invariant(values.size === 1 && [...values].every((value) => typeof value === "boolean"), `${testCase.id} must use one boolean cross-contact setting.`);
  return [...values][0];
}

function assertExactCounts(actual, expected, label) {
  const actualObject = Object.fromEntries([...actual.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
  const expectedObject = Object.fromEntries(Object.entries(expected).sort(([left], [right]) => left.localeCompare(right)));
  invariant(
    JSON.stringify(actualObject) === JSON.stringify(expectedObject),
    `${label} distribution is not authoritative. Expected ${JSON.stringify(expectedObject)}, received ${JSON.stringify(actualObject)}.`
  );
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function pendingReview() {
  return { status: "pending", reviewerId: null, reviewedAt: null, notes: null };
}

function pendingEvidenceReview() {
  return {
    status: "pending",
    reviewerId: null,
    reviewedAt: null,
    evidencePath: null,
    evidenceSha256: null,
    notes: null
  };
}

function normalizeCompletedReview(value, label) {
  invariant(value?.status === "approved", `${label} must be approved.`);
  invariant(nonEmptyString(value?.reviewerId), `${label} needs a reviewerId.`);
  invariant(nonEmptyString(value?.notes), `${label} needs review notes.`);
  return {
    status: "approved",
    reviewerId: value.reviewerId.trim(),
    reviewedAt: normalizeTimestamp(value.reviewedAt, `${label} reviewedAt`),
    notes: value.notes.trim()
  };
}

function normalizeCompletedEvidenceReview(value, label, fileEvidence) {
  const review = normalizeCompletedReview(value, label);
  const evidencePath = normalizePortableRelativePath(value?.evidencePath, `${label} evidencePath`);
  assertSha256(value?.evidenceSha256, `${label} evidenceSha256`);
  invariant(
    fileEvidence?.reviewEvidenceSha256ByPath?.get(evidencePath) === value.evidenceSha256,
    `${label} evidence file is missing or does not match evidenceSha256.`
  );
  return { ...review, evidencePath, evidenceSha256: value.evidenceSha256 };
}

function normalizeTimestamp(value, label) {
  invariant(nonEmptyString(value) && Number.isFinite(Date.parse(value)), `${label} must be a valid timestamp.`);
  return new Date(value).toISOString();
}

function resolveLineagePath(lineageDirectory, value, label) {
  const portable = normalizePortableRelativePath(value, label);
  return path.resolve(lineageDirectory, ...portable.split("/"));
}

function normalizePortableRelativePath(value, label) {
  invariant(nonEmptyString(value), `Holdout lineage ${label} is missing.`);
  const normalized = value.trim().replaceAll("\\", "/");
  invariant(!path.posix.isAbsolute(normalized) && !/^[A-Za-z]:\//u.test(normalized), `Holdout lineage ${label} must be relative.`);
  invariant(normalized.split("/").every((part) => part !== "" && part !== "." && part !== ".."), `Holdout lineage ${label} is invalid.`);
  return normalized;
}

function assertObjectMatchesBytes(value, bytes, objectLabel, byteLabel) {
  invariant(
    JSON.stringify(value) === JSON.stringify(parseJsonBytes(bytes, byteLabel)),
    `${objectLabel} object does not match the supplied ${byteLabel} bytes.`
  );
}

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(toBuffer(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requireBytes(value, label) {
  invariant(value !== undefined && value !== null, `${label} bytes are required for exact promotion lineage.`);
  return toBuffer(value);
}

function requireCanonicalDevelopmentBytes(value) {
  const bytes = requireBytes(value, "development manifest");
  invariant(
    sha256Bytes(bytes) === EXPECTED_DEVELOPMENT_MANIFEST_SHA256,
    "Development manifest bytes do not match the canonical development-v1 identity. Bump the promotion policy deliberately before changing this boundary."
  );
  return bytes;
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string" || value instanceof Uint8Array) return Buffer.from(value);
  throw new Error("Integrity bytes must be a string, Buffer, or Uint8Array.");
}

function sameSortedStrings(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function stableStringify(value) {
  if (value === null || ["string", "boolean", "number"].includes(typeof value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  invariant(value && typeof value === "object", "Cannot hash a non-JSON value.");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function assertSha256(value, label) {
  invariant(typeof value === "string" && /^[0-9a-f]{64}$/u.test(value), `${label} must be a SHA-256 digest.`);
}

function isHttpsUrl(value) {
  return typeof value === "string" && /^https:\/\//u.test(value);
}

function normalizeGroupName(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
