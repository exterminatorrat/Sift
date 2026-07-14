import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  createApprovalTemplate,
  createFrozenHoldout,
  createNearDuplicateAuditTemplate,
  createNearDuplicateReportTemplate,
  createRealWorldSourceReviewTemplate,
  HOLDOUT_PROMOTION_POLICY_VERSION,
  HOLDOUT_REVIEW_POLICY_VERSION,
  loadPromotionFileEvidence,
  sha256Bytes,
  validateFrozenHoldoutArtifacts
} from "./lib/holdout-integrity.mjs";
import {
  applyPerceptualEvidenceToReport,
  computePerceptualAuditEvidence,
  MAXIMUM_NEAR_DUPLICATE_DISTANCE,
  PERCEPTUAL_AUDIT_METHOD,
  PERCEPTUAL_AUDIT_TOOL_NAME,
  PERCEPTUAL_AUDIT_TOOL_VERSION,
  PERCEPTUAL_DISTANCE_METRIC,
  PERCEPTUAL_HASH_BITS
} from "./lib/perceptual-audit.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_CANDIDATE = "docs/ai-evals/benchmark-v1/holdout-v1.json";
const DEFAULT_DEVELOPMENT = "docs/ai-evals/benchmark-v1/development-v1.json";
const DEFAULT_AUDIT = "docs/ai-evals/benchmark-v1/holdout-v1.near-duplicate-audit.json";
const DEFAULT_OUTPUT = "docs/ai-evals/benchmark-v1/holdout-v1-frozen.json";
const DEFAULT_SOURCE_INTAKE = "docs/ai-evals/benchmark-v1/real-world-source-candidates.json";
const DEFAULT_SOURCE_ACQUISITION = "docs/ai-evals/benchmark-v1/holdout-v1.source-acquisition.json";
const DEFAULT_SOURCE_REVIEW = "docs/ai-evals/benchmark-v1/holdout-v1.source-review.json";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function promoteCandidate(candidate, approvals, candidateBytes, options = {}) {
  const approvalsBytes = options.approvalsBytes ?? `${JSON.stringify(approvals, null, 2)}\n`;
  return await createFrozenHoldout({ candidate, approvals, candidateBytes, approvalsBytes, ...options });
}

function approvalTemplate(candidate, candidateBytes) {
  return createApprovalTemplate(candidate, candidateBytes);
}

function auditTemplate(candidate, candidateBytes, developmentManifestBytes) {
  return createNearDuplicateAuditTemplate(candidate, candidateBytes, developmentManifestBytes);
}

function reportTemplate(candidate, candidateBytes, developmentManifestBytes) {
  return createNearDuplicateReportTemplate(candidate, candidateBytes, developmentManifestBytes);
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--") || !args[index + 1]) throw new Error(`Invalid argument: ${key}`);
    options[key.slice(2)] = args[index + 1];
    index += 1;
  }
  return options;
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  const options = parseOptions(args);
  const candidatePath = path.resolve(REPO_ROOT, options.candidate ?? DEFAULT_CANDIDATE);
  const developmentPath = path.resolve(REPO_ROOT, options.development ?? DEFAULT_DEVELOPMENT);
  invariant(
    developmentPath === path.resolve(REPO_ROOT, DEFAULT_DEVELOPMENT),
    `Holdout promotion only accepts the canonical ${DEFAULT_DEVELOPMENT} development boundary.`
  );
  const candidateBytes = await readFile(candidatePath);
  const developmentManifestBytes = await readFile(developmentPath);
  const candidate = JSON.parse(candidateBytes.toString("utf8"));
  const developmentManifest = JSON.parse(developmentManifestBytes.toString("utf8"));

  if (command === "self-test") {
    await runSelfTest(candidate, candidateBytes, developmentManifestBytes);
    return;
  }

  if (command === "template") {
    invariant(nonEmptyString(options.output), "template requires --output <path>.");
    await writeFile(
      path.resolve(REPO_ROOT, options.output),
      `${JSON.stringify(approvalTemplate(candidate, candidateBytes), null, 2)}\n`,
      "utf8"
    );
    console.log(`Wrote pending review template to ${options.output}.`);
    return;
  }

  if (command === "audit-template") {
    invariant(nonEmptyString(options.output), "audit-template requires --output <path>.");
    const auditOutputPath = path.resolve(REPO_ROOT, options.output);
    const audit = auditTemplate(candidate, candidateBytes, developmentManifestBytes);
    if (nonEmptyString(options.report)) {
      const reportOutputPath = path.resolve(REPO_ROOT, options.report);
      audit.perceptualAudit.reportPath = portableRelative(path.dirname(auditOutputPath), reportOutputPath);
      normalizeDeclaredReportPath(audit.perceptualAudit.reportPath);
      const perceptualEvidence = await computePerceptualAuditEvidence({
        candidate,
        developmentManifest,
        repoRoot: REPO_ROOT
      });
      await writeFile(
        reportOutputPath,
        `${JSON.stringify(applyPerceptualEvidenceToReport(
          reportTemplate(candidate, candidateBytes, developmentManifestBytes),
          perceptualEvidence
        ), null, 2)}\n`,
        "utf8"
      );
    }
    await writeFile(
      auditOutputPath,
      `${JSON.stringify(audit, null, 2)}\n`,
      "utf8"
    );
    console.log(`Wrote pending real-world/perceptual audit template to ${options.output}.`);
    return;
  }

  if (command === "source-review-template") {
    invariant(nonEmptyString(options.output), "source-review-template requires --output <path>.");
    const sourceIntakePath = path.resolve(REPO_ROOT, options.intake ?? DEFAULT_SOURCE_INTAKE);
    const sourceAcquisitionPath = path.resolve(REPO_ROOT, options.acquisition ?? DEFAULT_SOURCE_ACQUISITION);
    const sourceIntakeBytes = await readFile(sourceIntakePath);
    const sourceAcquisitionManifestBytes = await readFile(sourceAcquisitionPath);
    const sourceAcquisitionManifest = JSON.parse(sourceAcquisitionManifestBytes.toString("utf8"));
    const fileEvidence = loadPromotionFileEvidence({
      candidate,
      developmentManifest,
      sourceAcquisitionManifest
    });
    await writeFile(
      path.resolve(REPO_ROOT, options.output),
      `${JSON.stringify(createRealWorldSourceReviewTemplate(
        candidate,
        candidateBytes,
        sourceIntakeBytes,
        sourceAcquisitionManifestBytes,
        fileEvidence
      ), null, 2)}\n`,
      "utf8"
    );
    console.log(`Wrote pending source review template to ${options.output}.`);
    return;
  }

  if (command === "promote") {
    invariant(nonEmptyString(options.approvals), "promote requires --approvals <path>.");
    invariant(nonEmptyString(options.audit), "promote requires --audit <near-duplicate-audit.json>.");
    const approvalsPath = path.resolve(REPO_ROOT, options.approvals);
    const auditPath = path.resolve(REPO_ROOT, options.audit);
    const sourceIntakePath = path.resolve(REPO_ROOT, options.intake ?? DEFAULT_SOURCE_INTAKE);
    const sourceAcquisitionPath = path.resolve(REPO_ROOT, options.acquisition ?? DEFAULT_SOURCE_ACQUISITION);
    const sourceReviewPath = path.resolve(REPO_ROOT, options["source-review"] ?? DEFAULT_SOURCE_REVIEW);
    const approvalsBytes = await readFile(approvalsPath);
    const nearDuplicateAuditBytes = await readFile(auditPath);
    const sourceIntakeBytes = await readFile(sourceIntakePath);
    const sourceAcquisitionManifestBytes = await readFile(sourceAcquisitionPath);
    const sourceReviewBytes = await readFile(sourceReviewPath);
    const approvals = JSON.parse(approvalsBytes.toString("utf8"));
    const nearDuplicateAudit = JSON.parse(nearDuplicateAuditBytes.toString("utf8"));
    const sourceReview = JSON.parse(sourceReviewBytes.toString("utf8"));
    const sourceAcquisitionManifest = JSON.parse(sourceAcquisitionManifestBytes.toString("utf8"));
    const fileEvidence = loadPromotionFileEvidence({
      candidate,
      developmentManifest,
      sourceAcquisitionManifest,
      sourceReview,
      sourceReviewPath
    });
    const perceptualEvidence = await computePerceptualAuditEvidence({
      candidate,
      developmentManifest,
      repoRoot: REPO_ROOT
    });
    const { reportPath, reportBytes } = await readDeclaredAuditReport(auditPath, nearDuplicateAudit);
    const outputPath = path.resolve(REPO_ROOT, options.output ?? DEFAULT_OUTPUT);
    const outputDirectory = path.dirname(outputPath);
    const { frozenBytes, lineage } = await promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      sourceReview,
      sourceReviewBytes,
      sourceIntakeBytes,
      sourceAcquisitionManifestBytes,
      fileEvidence,
      perceptualEvidence,
      nearDuplicateAudit,
      nearDuplicateAuditBytes,
      nearDuplicateReportBytes: reportBytes,
      developmentManifestBytes,
      candidateManifestPath: portableRelative(outputDirectory, candidatePath),
      approvalsPath: portableRelative(outputDirectory, approvalsPath),
      nearDuplicateAuditPath: portableRelative(outputDirectory, auditPath),
      nearDuplicateReportPath: portableRelative(outputDirectory, reportPath),
      developmentManifestPath: portableRelative(outputDirectory, developmentPath),
      sourceIntakePath: portableRelative(outputDirectory, sourceIntakePath),
      sourceAcquisitionManifestPath: portableRelative(outputDirectory, sourceAcquisitionPath),
      sourceReviewPath: portableRelative(outputDirectory, sourceReviewPath),
      frozenManifestPath: portableRelative(outputDirectory, outputPath)
    });
    await writeCompatibleBytes(outputPath, frozenBytes);
    await writeCompatibleBytes(
      outputPath.replace(/\.json$/u, ".lineage.json"),
      Buffer.from(`${JSON.stringify(lineage, null, 2)}\n`, "utf8")
    );
    console.log(`Frozen holdout written to ${path.relative(REPO_ROOT, outputPath)}.`);
    return;
  }

  console.log(
    "Usage:\n" +
      "  node scripts/ai-evals/promote-holdout.mjs template --output <review.json>\n" +
      "  node scripts/ai-evals/promote-holdout.mjs audit-template --output <audit.json> [--report <report.json>]\n" +
      "  node scripts/ai-evals/promote-holdout.mjs source-review-template --acquisition <receipt.json> --output <source-review.json>\n" +
      "  node scripts/ai-evals/promote-holdout.mjs promote --approvals <review.json> --audit <audit.json> --acquisition <receipt.json> --source-review <source-review.json> [--output <frozen.json>]\n" +
      "  node scripts/ai-evals/promote-holdout.mjs self-test"
  );
}

async function runSelfTest(syntheticCandidate, syntheticCandidateBytes, developmentManifestBytes) {
  const syntheticApprovals = completeApprovals(approvalTemplate(syntheticCandidate, syntheticCandidateBytes));
  const placeholderSources = placeholderSourceEvidence();
  const syntheticEvidence = await completeAuditBundle(
    syntheticCandidate,
    syntheticCandidateBytes,
    developmentManifestBytes,
    placeholderSources
  );
  await assertPromotionFails(
    () => promoteCandidate(syntheticCandidate, syntheticApprovals, syntheticCandidateBytes, {
      approvalsBytes: jsonBytes(syntheticApprovals),
      ...promotionEvidenceOptions(syntheticEvidence, placeholderSources),
      developmentManifestBytes
    }),
    /source (case|group) distribution|real-world/i,
    "The all-synthetic candidate was promotable."
  );

  const undersized = structuredClone(syntheticCandidate);
  undersized.cases = undersized.cases.slice(0, 2);
  undersized.corpus.caseCount = 2;
  const undersizedBytes = jsonBytes(undersized);
  const undersizedApprovals = completeApprovals(approvalTemplate(undersized, undersizedBytes));
  const undersizedEvidence = await completeAuditBundle(undersized, undersizedBytes, developmentManifestBytes, placeholderSources);
  await assertPromotionFails(
    () => promoteCandidate(undersized, undersizedApprovals, undersizedBytes, {
      expectedCaseCount: 2,
      approvalsBytes: jsonBytes(undersizedApprovals),
      ...promotionEvidenceOptions(undersizedEvidence, placeholderSources),
      developmentManifestBytes
    }),
    /48 cases|caseCount = 48/i,
    "A caller-controlled expected count bypassed the fixed 48-case release policy."
  );

  const candidate = createPromotableSelfTestCandidate(syntheticCandidate);
  const candidateBytes = jsonBytes(candidate);
  const approvals = completeApprovals(approvalTemplate(candidate, candidateBytes));
  const approvalsBytes = jsonBytes(approvals);
  const sourceEvidence = completeSourceReviewBundle(candidate, candidateBytes);
  const evidence = await completeAuditBundle(candidate, candidateBytes, developmentManifestBytes, sourceEvidence);
  const { nearDuplicateAudit, nearDuplicateAuditBytes, nearDuplicateReport, nearDuplicateReportBytes } = evidence;
  const promoted = await promoteCandidate(candidate, approvals, candidateBytes, {
    approvalsBytes,
    ...promotionEvidenceOptions(evidence, sourceEvidence),
    developmentManifestBytes,
    promotedAt: "2026-07-14T00:00:00.000Z"
  });
  invariant(promoted.frozen.status === "frozen", "Approved authoritative candidate did not freeze.");
  invariant(promoted.lineage.caseCount === 48 && promoted.lineage.groupCount === 24, "Frozen lineage has the wrong fixed corpus size.");

  const firstSourceId = sourceEvidence.sourceReview.cases[0].candidateSourceId;
  const forgedSourceFiles = cloneFileEvidence(sourceEvidence.fileEvidence);
  forgedSourceFiles.sourceImageSha256BySourceId.set(firstSourceId, "0".repeat(64));
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      ...promotionEvidenceOptions(evidence, { ...sourceEvidence, fileEvidence: forgedSourceFiles }),
      developmentManifestBytes
    }),
    /actual source image bytes/i,
    "Promotion accepted a source receipt that was not bound to source file bytes."
  );

  const forgedCandidateFiles = cloneFileEvidence(sourceEvidence.fileEvidence);
  forgedCandidateFiles.candidateImageSha256ByCaseId.set("I-101", "0".repeat(64));
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      ...promotionEvidenceOptions(evidence, { ...sourceEvidence, fileEvidence: forgedCandidateFiles }),
      developmentManifestBytes
    }),
    /transformed candidate bytes|candidate image bytes/i,
    "Promotion accepted transformed candidate bytes that did not match the manifest."
  );

  const firstEvidencePath = sourceEvidence.sourceReview.cases[0].rightsReview.evidencePath;
  const forgedReviewFiles = cloneFileEvidence(sourceEvidence.fileEvidence);
  forgedReviewFiles.reviewEvidenceSha256ByPath.set(firstEvidencePath, "0".repeat(64));
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      ...promotionEvidenceOptions(evidence, { ...sourceEvidence, fileEvidence: forgedReviewFiles }),
      developmentManifestBytes
    }),
    /evidence file is missing or does not match/i,
    "Promotion accepted review evidence that was not bound to evidence file bytes."
  );

  const wrongLanguage = structuredClone(candidate);
  wrongLanguage.cases[0].language = "English";
  await assertCandidateMutationFails(wrongLanguage, approvals, developmentManifestBytes, sourceEvidence, /one language|language case distribution/i);

  const wrongSource = structuredClone(candidate);
  wrongSource.cases.find((testCase) => testCase.sourceType === "licensed").sourceType = "controlled";
  await assertCandidateMutationFails(wrongSource, approvals, developmentManifestBytes, sourceEvidence, /source type|source case distribution|cannot mix controlled/i);

  const wrongLicensedGroups = structuredClone(candidate);
  const licensedGroup = wrongLicensedGroups.grouping.groups.find((group) => group.kind === "licensed_menu");
  const controlledGroup = wrongLicensedGroups.grouping.groups.find((group) => group.kind === "controlled_template");
  licensedGroup.kind = "controlled_template";
  controlledGroup.kind = "licensed_menu";
  wrongLicensedGroups.cases
    .filter((testCase) => testCase.groupId === licensedGroup.id)
    .forEach((testCase) => { testCase.sourceType = "controlled"; });
  wrongLicensedGroups.cases
    .filter((testCase) => testCase.groupId === controlledGroup.id)
    .forEach((testCase) => { testCase.sourceType = "licensed"; });
  await assertCandidateMutationFails(
    wrongLicensedGroups,
    approvals,
    developmentManifestBytes,
    sourceEvidence,
    /six predeclared cross-language real-world groups/i
  );

  const nonCanonicalDevelopmentBytes = Buffer.concat([developmentManifestBytes, Buffer.from("\n", "utf8")]);
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      ...promotionEvidenceOptions(evidence, sourceEvidence),
      developmentManifestBytes: nonCanonicalDevelopmentBytes
    }),
    /canonical development-v1 identity/i,
    "Promotion accepted a caller-selected development boundary."
  );

  const tamperedSourceReview = structuredClone(sourceEvidence.sourceReview);
  tamperedSourceReview.cases[0].outputImageSha256 = "0".repeat(64);
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      ...promotionEvidenceOptions(evidence, {
        ...sourceEvidence,
        sourceReview: tamperedSourceReview,
        sourceReviewBytes: jsonBytes(tamperedSourceReview)
      }),
      developmentManifestBytes
    }),
    /output-image hash drifted/i,
    "Promotion accepted source review evidence for different transformed bytes."
  );

  const partialAcquisition = JSON.parse(sourceEvidence.sourceAcquisitionManifestBytes.toString("utf8"));
  partialAcquisition.status = "partial";
  const partialSourceEvidence = {
    ...sourceEvidence,
    sourceAcquisitionManifestBytes: jsonBytes(partialAcquisition)
  };
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      ...promotionEvidenceOptions(evidence, partialSourceEvidence),
      developmentManifestBytes
    }),
    /acquisition must be complete/i,
    "Promotion accepted an interrupted source-acquisition receipt."
  );

  const leakedSourceIntake = JSON.parse(sourceEvidence.sourceIntakeBytes.toString("utf8"));
  leakedSourceIntake.candidates[0].license.notes = "Expected risk: high_risk.";
  const leakedSourceIntakeBytes = jsonBytes(leakedSourceIntake);
  const leakedAcquisition = JSON.parse(sourceEvidence.sourceAcquisitionManifestBytes.toString("utf8"));
  leakedAcquisition.intakeSha256 = sha256Bytes(leakedSourceIntakeBytes);
  const leakedSourceEvidence = {
    ...sourceEvidence,
    sourceIntakeBytes: leakedSourceIntakeBytes,
    sourceAcquisitionManifestBytes: jsonBytes(leakedAcquisition)
  };
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      ...promotionEvidenceOptions(evidence, leakedSourceEvidence),
      developmentManifestBytes
    }),
    /label|risk|blind|benchmark/i,
    "Promotion accepted label-bearing notes after source hashes were rebound."
  );

  const incompleteAudit = structuredClone(nearDuplicateAudit);
  incompleteAudit.scope.candidateCaseIds.pop();
  await assertAuditMutationFails(candidate, approvals, incompleteAudit, nearDuplicateReportBytes, evidence.perceptualEvidence, developmentManifestBytes, sourceEvidence, /every candidate case/i);

  const duplicateAudit = structuredClone(nearDuplicateAudit);
  duplicateAudit.perceptualAudit.nearDuplicatePairs.push({ leftCaseId: "I-101", rightCaseId: "I-001" });
  await assertAuditMutationFails(candidate, approvals, duplicateAudit, nearDuplicateReportBytes, evidence.perceptualEvidence, developmentManifestBytes, sourceEvidence, /actual audit report/i);

  const arbitraryDigestAudit = structuredClone(nearDuplicateAudit);
  arbitraryDigestAudit.perceptualAudit.reportSha256 = "0".repeat(64);
  await assertAuditMutationFails(candidate, approvals, arbitraryDigestAudit, nearDuplicateReportBytes, evidence.perceptualEvidence, developmentManifestBytes, sourceEvidence, /actual report bytes/i);

  const incompleteReport = structuredClone(nearDuplicateReport);
  incompleteReport.inventory.comparisons.pop();
  const incompleteReportBytes = jsonBytes(incompleteReport);
  await assertReportMutationFails(candidate, approvals, nearDuplicateAudit, incompleteReportBytes, evidence.perceptualEvidence, developmentManifestBytes, sourceEvidence, /complete comparison inventory/i);

  const unrelatedReportBytes = syntheticEvidence.nearDuplicateReportBytes;
  await assertReportMutationFails(candidate, approvals, nearDuplicateAudit, unrelatedReportBytes, evidence.perceptualEvidence, developmentManifestBytes, sourceEvidence, /exact candidate bytes/i);

  const forgedDistanceReport = structuredClone(nearDuplicateReport);
  forgedDistanceReport.inventory.comparisons[0].perceptualDistance += 1;
  await assertReportMutationFails(
    candidate,
    approvals,
    nearDuplicateAudit,
    jsonBytes(forgedDistanceReport),
    evidence.perceptualEvidence,
    developmentManifestBytes,
    sourceEvidence,
    /forged perceptualDistance/i
  );

  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes,
      nearDuplicateAudit,
      nearDuplicateAuditBytes,
      nearDuplicateReportPath: "self-test-near-duplicate-report.json",
      perceptualEvidence: evidence.perceptualEvidence,
      developmentManifestBytes,
      ...sourceEvidence
    }),
    /report bytes are required/i,
    "Promotion accepted missing perceptual-audit report bytes."
  );

  const nonexistentAudit = structuredClone(nearDuplicateAudit);
  nonexistentAudit.perceptualAudit.reportPath = "does-not-exist/perceptual-report.json";
  await assertAsyncPromotionFails(
    () => readDeclaredAuditReport(path.join(REPO_ROOT, "self-test-audit.json"), nonexistentAudit),
    /could not be read/i,
    "Promotion accepted a nonexistent perceptual-audit report path."
  );

  const rejected = structuredClone(approvals);
  const criticalId = candidate.cases.find((testCase) => testCase.critical).id;
  rejected.cases.find((review) => review.id === criticalId).secondaryReview = null;
  await assertPromotionFails(
    () => promoteCandidate(candidate, rejected, candidateBytes, {
      approvalsBytes: jsonBytes(rejected),
      ...promotionEvidenceOptions(evidence, sourceEvidence),
      developmentManifestBytes
    }),
    /secondary review/i,
    "A critical case without independent secondary review was promotable."
  );

  await validateFrozenHoldoutArtifacts({
    frozen: promoted.frozen,
    frozenBytes: promoted.frozenBytes,
    lineage: promoted.lineage,
    candidate,
    candidateBytes,
    approvals,
    approvalsBytes,
    nearDuplicateAudit,
    sourceReview: sourceEvidence.sourceReview,
    nearDuplicateAuditBytes,
    nearDuplicateReportBytes,
    developmentManifestBytes,
    sourceIntakeBytes: sourceEvidence.sourceIntakeBytes,
    sourceAcquisitionManifestBytes: sourceEvidence.sourceAcquisitionManifestBytes,
    sourceReviewBytes: sourceEvidence.sourceReviewBytes,
    fileEvidence: sourceEvidence.fileEvidence,
    perceptualEvidence: evidence.perceptualEvidence
  });
  const tamperedFrozen = Buffer.from(promoted.frozenBytes);
  tamperedFrozen[tamperedFrozen.length - 2] = tamperedFrozen[tamperedFrozen.length - 2] === 0x7d ? 0x20 : 0x7d;
  await assertPromotionFails(
    () => validateFrozenHoldoutArtifacts({
      frozen: promoted.frozen,
      frozenBytes: tamperedFrozen,
      lineage: promoted.lineage,
      candidate,
      candidateBytes,
      approvals,
      approvalsBytes,
      nearDuplicateAudit,
      sourceReview: sourceEvidence.sourceReview,
      nearDuplicateAuditBytes,
      nearDuplicateReportBytes,
      developmentManifestBytes,
      sourceIntakeBytes: sourceEvidence.sourceIntakeBytes,
      sourceAcquisitionManifestBytes: sourceEvidence.sourceAcquisitionManifestBytes,
      sourceReviewBytes: sourceEvidence.sourceReviewBytes,
      fileEvidence: sourceEvidence.fileEvidence,
      perceptualEvidence: evidence.perceptualEvidence
    }),
    /Frozen manifest hash|exact bytes/i,
    "Tampered frozen bytes did not fail closed."
  );

  console.log(
    `Holdout promotion self-test passed: ${HOLDOUT_PROMOTION_POLICY_VERSION} locks the canonical development boundary, six predeclared source groups, source/acquisition/review lineage, 48 cases, 24 groups, and perceptual-audit contract evidence; ${HOLDOUT_REVIEW_POLICY_VERSION} enforces label approvals.`
  );
}

function createPromotableSelfTestCandidate(sourceCandidate) {
  const candidate = structuredClone(sourceCandidate);
  const intake = JSON.parse(fs.readFileSync(path.resolve(REPO_ROOT, DEFAULT_SOURCE_INTAKE), "utf8"));
  const sourceByGroupId = new Map(
    intake.candidates.map((source) => [source.proposedReplacement.groupId, source])
  );
  const licensedGroupIds = new Set(sourceByGroupId.keys());
  for (const group of candidate.grouping.groups) {
    if (licensedGroupIds.has(group.id)) group.kind = "licensed_menu";
  }
  for (const testCase of candidate.cases) {
    if (!licensedGroupIds.has(testCase.groupId)) continue;
    const source = sourceByGroupId.get(testCase.groupId);
    testCase.sourceType = "licensed";
    testCase.provenance = {
      ...testCase.provenance,
      origin: "licensed_external",
      generatorPath: null,
      sourceTitle: source.provenance.sourceTitle,
      sourceCreator: source.provenance.sourceCreator,
      sourcePageUrl: source.provenance.sourcePageUrl
    };
    testCase.license = {
      status: "declared",
      identifier: source.license.identifier,
      creator: source.provenance.sourceCreator,
      attributionRequired: source.license.attributionRequired,
      licenseUrl: source.license.licenseUrl,
      sourcePageUrl: source.provenance.sourcePageUrl,
      notes: "Source metadata is used only to exercise the promotion contract; no review is implied."
    };
  }
  return candidate;
}

function completeApprovals(template) {
  return {
    ...structuredClone(template),
    cases: template.cases.map((review) => ({
      ...review,
      status: "approved",
      primaryReview: completedReview("reviewer-primary", "Primary label review complete."),
      secondaryReview: review.secondaryReview === null
        ? null
        : completedReview("reviewer-secondary", "Independent critical label review complete.")
    }))
  };
}

function placeholderSourceEvidence() {
  const bytes = jsonBytes({});
  return {
    sourceIntakeBytes: bytes,
    sourceAcquisitionManifestBytes: bytes,
    sourceReview: {},
    sourceReviewBytes: bytes,
    fileEvidence: {
      sourceImageSha256BySourceId: new Map(),
      candidateImageSha256ByCaseId: new Map(),
      developmentImageSha256ByCaseId: new Map(),
      reviewEvidenceSha256ByPath: new Map()
    },
    rightsEvidenceByCaseId: new Map()
  };
}

function completeSourceReviewBundle(candidate, candidateBytes) {
  const sourceIntakeBytes = fs.readFileSync(path.resolve(REPO_ROOT, DEFAULT_SOURCE_INTAKE));
  const sourceIntake = JSON.parse(sourceIntakeBytes.toString("utf8"));
  const candidates = sourceIntake.candidates;
  const sources = candidates.map((source) => ({
    candidateSourceId: source.candidateSourceId,
    language: source.language,
    sourcePageUrl: source.provenance.sourcePageUrl,
    downloadUrl: source.provenance.downloadUrl,
    resolvedUrl: `${source.provenance.sourcePageUrl}/resolved`,
    sourceFileTitle: source.provenance.sourceTitle,
    localPath: `output/ai-evals/real-world-source-intake/downloads/${source.candidateSourceId}.jpg`,
    byteLength: Buffer.byteLength(`self-test-source:${source.candidateSourceId}`, "utf8"),
    sha256: sha256Bytes(Buffer.from(`self-test-source:${source.candidateSourceId}`, "utf8")),
    width: 100,
    height: 100,
    mimeType: "image/jpeg",
    licenseIdentifier: source.license.identifier,
    rightsReviewStatus: "pending",
    suitabilityReviewStatus: "pending_visual_and_label_review"
  }));
  const sourceAcquisitionManifest = {
    artifactType: "sift-real-world-source-acquisition",
    schemaVersion: "2.0.0",
    intakeId: sourceIntake.intakeId,
    intakeSha256: sha256Bytes(sourceIntakeBytes),
    generatedAt: "2026-07-14T00:00:00.000Z",
    mode: "download",
    status: "complete",
    sourceCount: sources.length,
    containsBenchmarkLabels: false,
    approvalStatus: "not_approved",
    sources
  };
  const sourceAcquisitionManifestBytes = jsonBytes(sourceAcquisitionManifest);
  const fileEvidence = {
    sourceImageSha256BySourceId: new Map(sources.map((source) => [source.candidateSourceId, source.sha256])),
    candidateImageSha256ByCaseId: new Map(candidate.cases.map((item) => [item.id, item.image.sha256])),
    developmentImageSha256ByCaseId: new Map(),
    reviewEvidenceSha256ByPath: new Map()
  };
  const template = createRealWorldSourceReviewTemplate(
    candidate,
    candidateBytes,
    sourceIntakeBytes,
    sourceAcquisitionManifestBytes,
    fileEvidence
  );
  const sourceReview = {
    ...template,
    status: "approved",
    cases: template.cases.map((item) => ({
      ...item,
      rightsReview: completedEvidenceReview("rights-reviewer", `evidence/rights-${item.id}.txt`, `self-test-rights:${item.id}`),
      suitabilityReview: completedEvidenceReview(
        "suitability-reviewer",
        `evidence/suitability-${item.id}.txt`,
        `self-test-suitability:${item.id}`
      ),
      transformationReview: completedEvidenceReview(
        "transform-reviewer",
        `evidence/transformation-${item.id}.txt`,
        `self-test-transform:${item.id}`
      )
    }))
  };
  for (const reviewCase of sourceReview.cases) {
    for (const key of ["rightsReview", "suitabilityReview", "transformationReview"]) {
      const review = reviewCase[key];
      fileEvidence.reviewEvidenceSha256ByPath.set(review.evidencePath, review.evidenceSha256);
    }
  }
  return {
    sourceIntakeBytes,
    sourceAcquisitionManifestBytes,
    sourceReview,
    sourceReviewBytes: jsonBytes(sourceReview),
    fileEvidence,
    rightsEvidenceByCaseId: new Map(
      sourceReview.cases.map((item) => [item.id, item.rightsReview.evidenceSha256])
    )
  };
}

function completeAudit(template, reportBytes, sourceEvidence, reportPath = "self-test-near-duplicate-report.json") {
  const audit = structuredClone(template);
  audit.status = "approved";
  audit.realWorldSubset.status = "approved";
  audit.realWorldSubset.cases = audit.realWorldSubset.cases.map((item) => ({
    id: item.id,
    acquisitionType: "licensed_external",
    rightsEvidenceSha256: sourceEvidence.rightsEvidenceByCaseId.get(item.id),
    notes: "Rights evidence checked for the promotion self-test."
  }));
  audit.realWorldSubset.reviewerId = "rights-reviewer";
  audit.realWorldSubset.reviewedAt = "2026-07-14T00:00:00.000Z";
  audit.realWorldSubset.notes = "All twelve self-test source records were reviewed.";
  audit.perceptualAudit = {
    status: "approved",
    method: PERCEPTUAL_AUDIT_METHOD,
    toolName: PERCEPTUAL_AUDIT_TOOL_NAME,
    toolVersion: PERCEPTUAL_AUDIT_TOOL_VERSION,
    distanceMetric: PERCEPTUAL_DISTANCE_METRIC,
    hashBits: PERCEPTUAL_HASH_BITS,
    maximumNearDuplicateDistance: MAXIMUM_NEAR_DUPLICATE_DISTANCE,
    exactDuplicatePairs: [],
    nearDuplicatePairs: [],
    reportPath,
    reportSha256: sha256Bytes(reportBytes),
    reviewerId: "duplicate-audit-reviewer",
    reviewedAt: "2026-07-14T00:00:00.000Z",
    notes: "All candidate/development and within-candidate comparisons were reviewed."
  };
  return audit;
}

function completeReport(template, perceptualEvidence) {
  const report = applyPerceptualEvidenceToReport(template, perceptualEvidence);
  report.inventory.comparisons = report.inventory.comparisons.map((comparison, index) => ({
    ...comparison,
    visualVerdict: "distinct",
    notes: comparison.perceptualDistance <= MAXIMUM_NEAR_DUPLICATE_DISTANCE
      ? "Near-threshold comparison reviewed as visually distinct for the promotion self-test."
      : "Comparison reviewed for the holdout-promotion self-test."
  }));
  return report;
}

async function completeAuditBundle(candidate, candidateBytes, developmentManifestBytes, sourceEvidence) {
  const developmentManifest = JSON.parse(developmentManifestBytes.toString("utf8"));
  sourceEvidence.fileEvidence.developmentImageSha256ByCaseId = new Map(
    developmentManifest.cases.map((item) => [item.id, item.image.sha256])
  );
  const perceptualEvidence = await computePerceptualAuditEvidence({
    candidate,
    developmentManifest,
    repoRoot: REPO_ROOT
  });
  const nearDuplicateReport = completeReport(
    reportTemplate(candidate, candidateBytes, developmentManifestBytes),
    perceptualEvidence
  );
  const nearDuplicateReportBytes = jsonBytes(nearDuplicateReport);
  const nearDuplicateAudit = completeAudit(
    auditTemplate(candidate, candidateBytes, developmentManifestBytes),
    nearDuplicateReportBytes,
    sourceEvidence
  );
  return {
    nearDuplicateAudit,
    nearDuplicateAuditBytes: jsonBytes(nearDuplicateAudit),
    nearDuplicateReport,
    nearDuplicateReportBytes,
    perceptualEvidence
  };
}

function promotionEvidenceOptions(evidence, sourceEvidence) {
  return {
    nearDuplicateAudit: evidence.nearDuplicateAudit,
    nearDuplicateAuditBytes: evidence.nearDuplicateAuditBytes,
    nearDuplicateReportBytes: evidence.nearDuplicateReportBytes,
    nearDuplicateReportPath: "self-test-near-duplicate-report.json",
    sourceReview: sourceEvidence.sourceReview,
    sourceReviewBytes: sourceEvidence.sourceReviewBytes,
    sourceIntakeBytes: sourceEvidence.sourceIntakeBytes,
    sourceAcquisitionManifestBytes: sourceEvidence.sourceAcquisitionManifestBytes,
    fileEvidence: sourceEvidence.fileEvidence,
    perceptualEvidence: evidence.perceptualEvidence
  };
}

async function assertCandidateMutationFails(candidate, approvals, developmentManifestBytes, sourceEvidence, expectedPattern) {
  const candidateBytes = jsonBytes(candidate);
  const reboundApprovals = {
    ...structuredClone(approvals),
    candidateManifestSha256: sha256Bytes(candidateBytes)
  };
  const evidence = await completeAuditBundle(candidate, candidateBytes, developmentManifestBytes, sourceEvidence);
  await assertPromotionFails(
    () => promoteCandidate(candidate, reboundApprovals, candidateBytes, {
      approvalsBytes: jsonBytes(reboundApprovals),
      ...promotionEvidenceOptions(evidence, sourceEvidence),
      developmentManifestBytes
    }),
    expectedPattern,
    "A malformed candidate bypassed the authoritative release distribution."
  );
}

async function assertAuditMutationFails(
  candidate,
  approvals,
  nearDuplicateAudit,
  nearDuplicateReportBytes,
  perceptualEvidence,
  developmentManifestBytes,
  sourceEvidence,
  expectedPattern
) {
  const candidateBytes = jsonBytes(candidate);
  await assertPromotionFails(
    () => promoteCandidate(candidate, approvals, candidateBytes, {
      approvalsBytes: jsonBytes(approvals),
      nearDuplicateAudit,
      nearDuplicateAuditBytes: jsonBytes(nearDuplicateAudit),
      nearDuplicateReportBytes,
      nearDuplicateReportPath: "self-test-near-duplicate-report.json",
      perceptualEvidence,
      developmentManifestBytes,
      ...sourceEvidence
    }),
    expectedPattern,
    "Incomplete near-duplicate evidence bypassed promotion."
  );
}

async function assertReportMutationFails(
  candidate,
  approvals,
  nearDuplicateAudit,
  nearDuplicateReportBytes,
  perceptualEvidence,
  developmentManifestBytes,
  sourceEvidence,
  expectedPattern
) {
  const reboundAudit = structuredClone(nearDuplicateAudit);
  reboundAudit.perceptualAudit.reportSha256 = sha256Bytes(nearDuplicateReportBytes);
  await assertAuditMutationFails(
    candidate,
    approvals,
    reboundAudit,
    nearDuplicateReportBytes,
    perceptualEvidence,
    developmentManifestBytes,
    sourceEvidence,
    expectedPattern
  );
}

async function assertPromotionFails(action, expectedPattern, message) {
  let error = null;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }
  invariant(error, message);
  invariant(expectedPattern.test(String(error.message)), `${message} Unexpected error: ${error.message}`);
}

async function assertAsyncPromotionFails(action, expectedPattern, message) {
  let error = null;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }
  invariant(error, message);
  invariant(expectedPattern.test(String(error.message)), `${message} Unexpected error: ${error.message}`);
}

function completedReview(reviewerId, notes) {
  return {
    status: "approved",
    reviewerId,
    reviewedAt: "2026-07-14T00:00:00.000Z",
    notes
  };
}

function cloneFileEvidence(fileEvidence) {
  return {
    sourceImageSha256BySourceId: new Map(fileEvidence.sourceImageSha256BySourceId),
    candidateImageSha256ByCaseId: new Map(fileEvidence.candidateImageSha256ByCaseId),
    developmentImageSha256ByCaseId: new Map(fileEvidence.developmentImageSha256ByCaseId),
    reviewEvidenceSha256ByPath: new Map(fileEvidence.reviewEvidenceSha256ByPath)
  };
}

function completedEvidenceReview(reviewerId, evidencePath, evidenceSeed) {
  return {
    ...completedReview(reviewerId, "Evidence reviewed for the promotion contract self-test."),
    evidencePath,
    evidenceSha256: sha256Bytes(Buffer.from(evidenceSeed, "utf8"))
  };
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function portableRelative(fromDirectory, targetPath) {
  const relative = path.relative(fromDirectory, targetPath).replaceAll("\\", "/");
  return relative || path.basename(targetPath);
}

async function readDeclaredAuditReport(auditPath, audit) {
  const declaredPath = normalizeDeclaredReportPath(audit?.perceptualAudit?.reportPath);
  const reportPath = path.resolve(path.dirname(auditPath), ...declaredPath.split("/"));
  try {
    return { reportPath, reportBytes: await readFile(reportPath) };
  } catch (error) {
    throw new Error(`Declared near-duplicate audit report could not be read at ${reportPath}.`, { cause: error });
  }
}

function normalizeDeclaredReportPath(value) {
  invariant(nonEmptyString(value), "Near-duplicate audit requires perceptualAudit.reportPath.");
  const normalized = value.trim().replaceAll("\\", "/");
  invariant(!path.posix.isAbsolute(normalized) && !/^[A-Za-z]:\//u.test(normalized), "Near-duplicate audit reportPath must be relative.");
  invariant(
    normalized.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
    "Near-duplicate audit reportPath is invalid."
  );
  return normalized;
}

async function writeCompatibleBytes(filePath, bytes) {
  try {
    const existing = await readFile(filePath);
    invariant(existing.equals(bytes), `Refusing to replace different holdout evidence at ${filePath}.`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await writeFile(filePath, bytes, { flag: "wx" });
  }
}

await main();
