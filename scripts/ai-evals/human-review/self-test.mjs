import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  HumanReviewError,
  createReviewBundle,
  fingerprintBytes,
  loadBenchmarkManifestBinding,
  scoreReview,
  wilsonInterval,
  writeReviewBundle
} from "./index.mjs";

const RUN_FINGERPRINT = `sha256:${"1".repeat(64)}`;
const CONFIGURATION_FINGERPRINT = `sha256:${"2".repeat(64)}`;
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sift-human-review-"));

try {
  const imagePath = path.join(temporaryRoot, "CASE-SECRET.jpg");
  fs.writeFileSync(imagePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  const benchmarkPackage = writeFrozenBenchmarkPackage(temporaryRoot);
  const artifact = scoredFixture(imagePath, benchmarkPackage.binding);
  const firstBundle = createReviewBundle(artifact, {
    sourceDirectory: temporaryRoot,
    benchmarkManifest: benchmarkPackage.document,
    benchmarkBinding: benchmarkPackage.binding
  });
  const secondBundle = createReviewBundle(structuredClone(artifact), {
    sourceDirectory: temporaryRoot,
    benchmarkManifest: structuredClone(benchmarkPackage.document),
    benchmarkBinding: structuredClone(benchmarkPackage.binding)
  });

  assert.deepEqual(firstBundle, secondBundle, "Review generation must be deterministic.");
  assert.equal(firstBundle.key.coverage.visibleTextClaims, 4);
  assert.equal(firstBundle.key.coverage.restaurantMessageTranslations, 2);
  assert.equal(firstBundle.key.coverage.staffQuestionTranslations, 2);
  assert.equal(firstBundle.key.coverage.questionIntentItems, 4);
  assert.equal(firstBundle.key.coverage.questionRequirementsBound, true);
  assert.equal(firstBundle.key.coverage.benchmarkManifestBound, true);
  assert.equal(firstBundle.key.coverage.frozenHoldoutLineageBound, true);
  assert.equal(firstBundle.key.coverage.reviewLineageBound, true);
  assert.match(firstBundle.key.sourceIdentity.questionRequirementsFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.match(firstBundle.key.sourceIdentity.reviewLineageFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    firstBundle.key.sourceIdentity.benchmarkManifestFingerprint,
    benchmarkPackage.binding.manifestFingerprint
  );
  assert.deepEqual(firstBundle.key.sourceIdentity.holdoutIdentity, benchmarkPackage.binding.holdoutIdentity);
  assert.equal(firstBundle.template.items.length, 12);

  const reviewerPayload = JSON.stringify(firstBundle.template);
  for (const secret of ["CASE-SECRET", "gemini", "riskLevel", CONFIGURATION_FINGERPRINT, RUN_FINGERPRINT]) {
    assert.doesNotMatch(reviewerPayload, new RegExp(escapeRegExp(secret), "i"));
  }
  assert.ok(firstBundle.template.items.every((item) => /^A\d{3}$/.test(item.attemptRef)));

  const outputDirectory = path.join(temporaryRoot, "review-output");
  const written = writeReviewBundle(firstBundle, outputDirectory);
  assert.ok(fs.existsSync(written.templatePath));
  assert.ok(fs.existsSync(written.keyPath));
  assert.ok(fs.existsSync(path.join(outputDirectory, "images", "A001.jpg")));

  const cleanReview = completedReview(firstBundle.template);
  const cleanReport = scoreReview(cleanReview, firstBundle.key);
  assert.equal(cleanReport.coverage.complete, true);
  assert.equal(cleanReport.visibleTextHallucination.numerator, 0);
  assert.equal(cleanReport.translationFidelity.overall.counts.materialError, 0);
  assert.equal(cleanReport.questionIntent.counts.missesIntent, 0);
  assert.equal(
    cleanReport.releaseGate.passed,
    true,
    `Clean release gate failures: ${cleanReport.releaseGate.failures.join(", ")}`
  );
  assert.equal(cleanReport.releaseGate.policy, "comprehensive_human_release_gate_v1");
  assert.equal(cleanReport.releaseGate.reviewLineageBound, true);
  assert.equal(cleanReport.releaseGate.runFingerprint, RUN_FINGERPRINT);
  assert.equal(cleanReport.releaseGate.configurationFingerprint, CONFIGURATION_FINGERPRINT);
  assert.equal(
    cleanReport.releaseGate.questionRequirementsFingerprint,
    firstBundle.key.sourceIdentity.questionRequirementsFingerprint
  );

  const mixedReview = completedReview(firstBundle.template);
  judgmentItem(mixedReview, "visible_text_claim", 0).judgment = "unsupported";
  judgmentItem(mixedReview, "visible_text_claim", 1).judgment = "unreadable";
  judgmentItem(mixedReview, "translation_fidelity", 0).judgment = "material_error";
  judgmentItem(mixedReview, "translation_fidelity", 1).judgment = "unreviewable";
  judgmentItem(mixedReview, "question_intent", 0).judgment = "misses_intent";
  judgmentItem(mixedReview, "question_intent", 1).judgment = "unreviewable";
  const mixedReport = scoreReview(mixedReview, firstBundle.key);
  assert.equal(mixedReport.releaseGate.passed, false);
  for (const failure of [
    "visible_text_claim_unsupported",
    "visible_text_claim_unreviewable",
    "translation_material_error",
    "translation_unreviewable",
    "question_intent_missed",
    "question_intent_unreviewable"
  ]) {
    assert.ok(mixedReport.releaseGate.failures.includes(failure), `Missing release failure ${failure}.`);
  }
  assert.equal(mixedReport.visibleTextHallucination.numerator, 1);
  assert.equal(mixedReport.visibleTextHallucination.denominator, 3);
  assert.equal(mixedReport.visibleTextHallucination.excludedUnreadable, 1);
  assert.deepEqual(mixedReport.translationFidelity.overall.counts, {
    faithful: 2,
    materialError: 1,
    unreviewable: 1
  });

  for (const [type, judgment, failure] of [
    ["visible_text_claim", "unsupported", "visible_text_claim_unsupported"],
    ["visible_text_claim", "unreadable", "visible_text_claim_unreviewable"],
    ["translation_fidelity", "material_error", "translation_material_error"],
    ["translation_fidelity", "unreviewable", "translation_unreviewable"],
    ["question_intent", "misses_intent", "question_intent_missed"],
    ["question_intent", "unreviewable", "question_intent_unreviewable"]
  ]) {
    const review = completedReview(firstBundle.template);
    judgmentItem(review, type, 0).judgment = judgment;
    const report = scoreReview(review, firstBundle.key);
    assert.equal(report.releaseGate.passed, false);
    assert.ok(report.releaseGate.failures.includes(failure));
  }

  expectError(() => {
    const incomplete = completedReview(firstBundle.template);
    incomplete.items[0].judgment = "";
    scoreReview(incomplete, firstBundle.key);
  }, "incomplete_review");

  expectError(() => {
    const incomplete = completedReview(firstBundle.template);
    incomplete.items.pop();
    scoreReview(incomplete, firstBundle.key);
  }, "incomplete_review");

  expectError(() => {
    const forged = completedReview(firstBundle.template);
    forged.releaseGate = { passed: true };
    scoreReview(forged, firstBundle.key);
  }, "unexpected_fields");

  expectError(() => {
    const altered = completedReview(firstBundle.template);
    altered.items[0].claim = "Changed after blinding";
    scoreReview(altered, firstBundle.key);
  }, "template_content_mismatch");

  expectError(() => {
    const invalidTime = completedReview(firstBundle.template);
    invalidTime.reviewer.completedAt = "tomorrow";
    scoreReview(invalidTime, firstBundle.key);
  }, "invalid_review_timestamps");

  expectError(() => {
    const mismatched = scoredFixture(imagePath, benchmarkPackage.binding);
    mismatched.sourceManifestSha256 = `sha256:${"9".repeat(64)}`;
    createReviewBundle(mismatched, {
      sourceDirectory: temporaryRoot,
      benchmarkManifest: benchmarkPackage.document,
      benchmarkBinding: benchmarkPackage.binding
    });
  }, "benchmark_source_mismatch");

  expectError(() => {
    const mismatched = scoredFixture(imagePath, benchmarkPackage.binding);
    mismatched.holdoutIdentity = {
      ...mismatched.holdoutIdentity,
      approvalsSha256: `sha256:${"8".repeat(64)}`
    };
    createReviewBundle(mismatched, {
      sourceDirectory: temporaryRoot,
      benchmarkManifest: benchmarkPackage.document,
      benchmarkBinding: benchmarkPackage.binding
    });
  }, "holdout_lineage_mismatch");

  expectError(() => {
    const mixed = scoredFixture(imagePath, benchmarkPackage.binding);
    mixed.attempts[1].configurationFingerprint = `sha256:${"7".repeat(64)}`;
    createReviewBundle(mixed, { sourceDirectory: temporaryRoot });
  }, "mixed_source_identity");

  expectError(() => {
    const mixed = scoredFixture(imagePath, benchmarkPackage.binding);
    mixed.attempts[1].runFingerprint = `sha256:${"6".repeat(64)}`;
    createReviewBundle(mixed, { sourceDirectory: temporaryRoot });
  }, "mixed_source_identity");

  const unboundBundle = createReviewBundle(artifact, { sourceDirectory: temporaryRoot });
  const unboundReport = scoreReview(completedReview(unboundBundle.template), unboundBundle.key);
  assert.equal(unboundReport.releaseGate.passed, false);
  for (const failure of [
    "question_requirements_not_fingerprint_bound",
    "benchmark_manifest_not_source_bound",
    "frozen_holdout_lineage_not_bound",
    "review_lineage_not_bound",
    "question_intent_review_missing"
  ]) {
    assert.ok(unboundReport.releaseGate.failures.includes(failure));
  }

  const liveBundle = createReviewBundle(liveFixture(imagePath, benchmarkPackage.binding), {
    sourceDirectory: temporaryRoot,
    benchmarkManifest: benchmarkPackage.document,
    benchmarkBinding: benchmarkPackage.binding
  });
  assert.equal(liveBundle.key.sourceIdentity.sourceKind, "live");
  assert.equal(liveBundle.key.coverage.visibleTextClaims, 3);
  assert.equal(liveBundle.key.coverage.reviewLineageBound, true);

  expectError(() => {
    createReviewBundle({
      reportType: "sift-manual-ai-eval",
      runId: "aggregate-only",
      identity: { caseSetFingerprint: RUN_FINGERPRINT, fingerprints: { config: CONFIGURATION_FINGERPRINT } },
      attempts: [{ caseId: "I-001", pass: 1, passed: true }]
    });
  }, "missing_attempt_output");

  const tamperedLineagePath = benchmarkPackage.manifestPath.replace(/\.json$/u, ".lineage.json");
  const originalLineage = fs.readFileSync(tamperedLineagePath, "utf8");
  const tamperedLineage = JSON.parse(originalLineage);
  tamperedLineage.caseCount += 1;
  fs.writeFileSync(tamperedLineagePath, `${JSON.stringify(tamperedLineage, null, 2)}\n`);
  expectError(() => loadBenchmarkManifestBinding(benchmarkPackage.manifestPath), "frozen_lineage_mismatch");
  fs.writeFileSync(tamperedLineagePath, originalLineage);

  const candidatePath = path.join(temporaryRoot, "holdout-v1-candidate.json");
  const originalCandidate = fs.readFileSync(candidatePath);
  fs.appendFileSync(candidatePath, "tampered");
  expectError(() => loadBenchmarkManifestBinding(benchmarkPackage.manifestPath), "frozen_lineage_mismatch");
  fs.writeFileSync(candidatePath, originalCandidate);

  assert.equal(wilsonInterval(0, 0), null);
  expectError(() => wilsonInterval(2, 1), "invalid_metric_counts");

  console.log("Human review workflow self-test passed.");
  console.log(
    "Covered deterministic blinding, frozen-lineage binding, recomputed scoring, exact coverage, hallucination, translation, and question-intent release gates."
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

function writeFrozenBenchmarkPackage(root) {
  const candidateBytes = Buffer.from(`${JSON.stringify({ status: "development", cases: ["CASE-SECRET-001", "CASE-SECRET-002"] }, null, 2)}\n`);
  const approvalsBytes = Buffer.from(`${JSON.stringify({ status: "approved", reviewers: ["reviewer-a", "reviewer-b"] }, null, 2)}\n`);
  const nearDuplicateAuditBytes = Buffer.from(`${JSON.stringify({ status: "passed", matches: [] }, null, 2)}\n`);
  const developmentManifestBytes = Buffer.from(`${JSON.stringify({ split: "development", cases: [] }, null, 2)}\n`);
  const candidateFingerprint = fingerprintBytes(candidateBytes);
  const approvalsFingerprint = fingerprintBytes(approvalsBytes);
  const nearDuplicateAuditFingerprint = fingerprintBytes(nearDuplicateAuditBytes);
  const developmentManifestFingerprint = fingerprintBytes(developmentManifestBytes);
  const document = benchmarkFixture(
    candidateFingerprint,
    approvalsFingerprint,
    nearDuplicateAuditFingerprint,
    developmentManifestFingerprint
  );
  const manifestPath = path.join(root, "holdout-v1-frozen.json");
  const manifestBytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
  const manifestFingerprint = fingerprintBytes(manifestBytes);
  const lineage = {
    schemaVersion: "2.0.0",
    promotionPolicyVersion: "holdout-promotion-v1",
    reviewPolicyVersion: "holdout-review-v1",
    pathBase: "lineage_directory",
    candidateManifestPath: "holdout-v1-candidate.json",
    candidateManifestSha256: candidateFingerprint,
    approvalsPath: "holdout-v1-review.json",
    approvalsSha256: approvalsFingerprint,
    nearDuplicateAuditPath: "holdout-v1-near-duplicate-audit.json",
    nearDuplicateAuditSha256: nearDuplicateAuditFingerprint,
    developmentManifestPath: "development-v1.json",
    developmentManifestSha256: developmentManifestFingerprint,
    frozenManifestPath: "holdout-v1-frozen.json",
    frozenManifestSha256: manifestFingerprint,
    promotedAt: "2026-07-14T07:00:00.000Z",
    caseCount: document.cases.length,
    groupCount: new Set(document.cases.map((testCase) => testCase.groupId)).size,
    retiredGroupIds: [],
    replacementHistory: []
  };
  fs.writeFileSync(path.join(root, "holdout-v1-candidate.json"), candidateBytes);
  fs.writeFileSync(path.join(root, "holdout-v1-review.json"), approvalsBytes);
  fs.writeFileSync(path.join(root, "holdout-v1-near-duplicate-audit.json"), nearDuplicateAuditBytes);
  fs.writeFileSync(path.join(root, "development-v1.json"), developmentManifestBytes);
  fs.writeFileSync(manifestPath, manifestBytes);
  fs.writeFileSync(
    manifestPath.replace(/\.json$/u, ".lineage.json"),
    `${JSON.stringify(lineage, null, 2)}\n`
  );
  const loaded = loadBenchmarkManifestBinding(manifestPath);
  return { ...loaded, manifestPath };
}

function completedReview(template) {
  const review = structuredClone(template);
  review.reviewer = {
    id: "reviewer-translation-01",
    startedAt: "2026-07-14T08:00:00.000Z",
    completedAt: "2026-07-14T08:30:00.000Z"
  };
  for (const item of review.items) {
    if (item.type === "visible_text_claim") item.judgment = "supported";
    else if (item.type === "translation_fidelity") item.judgment = "faithful";
    else if (item.type === "question_intent") item.judgment = "meets_intent";
  }
  return review;
}

function judgmentItem(review, type, index) {
  const items = review.items.filter((item) => item.type === type);
  assert.ok(items[index], `Missing ${type} item ${index}.`);
  return items[index];
}

function scoredFixture(imagePath, benchmarkBinding) {
  return {
    formatVersion: 1,
    artifactType: "sift-normalized-ai-attempts",
    runId: "candidate-v1",
    runFingerprint: RUN_FINGERPRINT,
    configurationFingerprint: CONFIGURATION_FINGERPRINT,
    sourceManifestSha256: benchmarkBinding.manifestFingerprint,
    holdoutIdentity: benchmarkBinding.holdoutIdentity,
    attempts: [
      {
        caseId: "CASE-SECRET-001",
        pass: 1,
        runFingerprint: RUN_FINGERPRINT,
        configurationFingerprint: CONFIGURATION_FINGERPRINT,
        imagePath,
        userLanguage: "French",
        restaurantLanguage: "Spanish",
        output: {
          analysisLanguage: "English",
          dishes: [
            dish(
              ["Tahini plate", "sesame paste"],
              ["Contiene sesamo la salsa?"],
              ["La sauce contient-elle du sesame?"]
            ),
            dish(
              ["Plain rice"],
              ["Se cocina el arroz con caldo?"],
              ["Le riz est-il cuit avec du bouillon?"]
            )
          ],
          restaurantMessage: {
            english: "I have a severe sesame allergy.",
            translated: "Tengo una alergia grave al sesamo.",
            language: "Spanish",
            userLanguageText: "J'ai une allergie grave au sesame.",
            userLanguage: "French"
          }
        }
      },
      {
        caseId: "CASE-SECRET-002",
        pass: 1,
        runFingerprint: RUN_FINGERPRINT,
        configurationFingerprint: CONFIGURATION_FINGERPRINT,
        imagePath,
        userLanguage: "English",
        restaurantLanguage: "en-US",
        output: {
          analysisLanguage: "English",
          dishes: [
            dish(
              ["Fruit cup"],
              ["Does this contain mango?"],
              ["Does this contain mango?"]
            )
          ],
          restaurantMessage: null
        }
      }
    ]
  };
}

function benchmarkFixture(
  candidateManifestSha256,
  approvalsSha256,
  nearDuplicateAuditSha256,
  developmentManifestSha256
) {
  return {
    formatVersion: 1,
    benchmarkId: "sift-human-review-self-test",
    split: "test",
    status: "frozen",
    promotion: {
      promotionPolicyVersion: "holdout-promotion-v1",
      reviewPolicyVersion: "holdout-review-v1",
      candidateManifestSha256,
      approvalsSha256,
      nearDuplicateAuditSha256,
      developmentManifestSha256
    },
    cases: [
      {
        id: "CASE-SECRET-001",
        groupId: "group-1",
        profile: { preferredLanguage: "French", restaurantLanguage: "Spanish" },
        expectations: {
          requiredQuestions: [
            {
              id: "tahini-ingredients",
              scope: "named_dishes",
              dishNames: ["Tahini plate"],
              intent: "confirm_ingredients",
              allergens: ["Sesame"],
              requiredLanguages: ["Spanish"]
            },
            {
              id: "rice-preparation",
              scope: "named_dishes",
              dishNames: ["Plain rice"],
              intent: "confirm_preparation",
              allergens: [],
              requiredLanguages: ["French"]
            }
          ]
        }
      },
      {
        id: "CASE-SECRET-002",
        groupId: "group-2",
        profile: { preferredLanguage: "English", restaurantLanguage: "English" },
        expectations: {
          requiredQuestions: [
            {
              id: "fruit-ingredients",
              scope: "named_dishes",
              dishNames: ["Fruit cup"],
              intent: "confirm_ingredients",
              allergens: ["Mango"],
              requiredLanguages: ["English"]
            }
          ]
        }
      }
    ]
  };
}

function liveFixture(imagePath, benchmarkBinding) {
  const output = scoredFixture(imagePath, benchmarkBinding).attempts[0].output;
  return {
    phase: "canary-human-review",
    inputIdentity: {
      sha256: RUN_FINGERPRINT,
      benchmarkManifestSha256: benchmarkBinding.manifestFingerprint,
      holdoutIdentity: benchmarkBinding.holdoutIdentity
    },
    configurationFingerprint: CONFIGURATION_FINGERPRINT,
    results: [
      {
        caseId: "CASE-SECRET-001",
        pass: 1,
        inputIdentitySha256: RUN_FINGERPRINT,
        inputImage: { outputPath: imagePath },
        configurationFingerprint: CONFIGURATION_FINGERPRINT,
        userLanguage: "French",
        restaurantLanguage: "Spanish",
        output
      }
    ]
  };
}

function dish(visibleMenuText, questionsToAsk, questionsToAskUserLanguage) {
  return {
    dishName: visibleMenuText[0],
    transparency: { visibleMenuText },
    questionsToAsk,
    questionsToAskUserLanguage
  };
}

function expectError(callback, code) {
  assert.throws(callback, (error) => error instanceof HumanReviewError && error.code === code);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
