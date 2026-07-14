import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  computeConfigFingerprints,
  fingerprintJson,
  loadPreparedRun,
  OutputStore,
  readJsonFile,
  writeJsonAtomic
} from "./manual-workbench/workbench.mjs";
import { buildMenuPageLabel } from "../../supabase/functions/_shared/ai/prompts.mjs";
import {
  createReviewBundle,
  normalizeAttemptArtifact
} from "./human-review/index.mjs";
import {
  createManualScoringManifest,
  fingerprintEvidenceBytes
} from "./lib/manual-evidence.mjs";
import {
  ManualScoringError,
  scoreManualRun
} from "./score-manual-run.mjs";

const HIDDEN_LABEL = "HIDDEN_EXPECTATION_MUST_NOT_APPEAR_IN_REPORT";
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const TINY_PNG_SHA256 = crypto.createHash("sha256").update(TINY_PNG).digest("hex");

export function runSelfTest() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sift-manual-score-"));
  try {
    testCompleteDeterministicReport(path.join(temporaryRoot, "complete"));
    testIncompleteRunGate(path.join(temporaryRoot, "incomplete"));
    testMissingExpectedPassGate(path.join(temporaryRoot, "missing-pass"));
    testUnexpectedPassGate(path.join(temporaryRoot, "unexpected-pass"));
    testMixedFingerprintGate(path.join(temporaryRoot, "mixed-fingerprint"));
    testDuplicateAttemptGate(path.join(temporaryRoot, "duplicate-attempt"));
    testMalformedResponseGate(path.join(temporaryRoot, "malformed-response"));
    testInvalidSchemaReviewArtifact(path.join(temporaryRoot, "invalid-schema-review"));
    testScoringManifestTamperGate(path.join(temporaryRoot, "scoring-manifest-tamper"));
    testHumanReviewArtifactImmutability(path.join(temporaryRoot, "human-review-immutability"));
    console.log(
      "Manual scoring self-test passed: deterministic scoring, sealed label integrity, review-artifact compatibility and immutability, pass counts, session evidence, execution metrics, fingerprint locks, incomplete-run gating, duplicate rejection, malformed-JSON rejection, slices, and stability."
    );
  } finally {
    removeTemporaryRoot(temporaryRoot);
  }
}

function testCompleteDeterministicReport(root) {
  const fixture = createFixture(root, { passes: 2 });
  const first = scoreFixture(fixture);
  const firstPayload = fs.readFileSync(first.outputPath, "utf8");

  assert.equal(first.report.complete, true);
  assert.equal(first.report.coverage.expectedAttempts, 4);
  assert.equal(first.report.coverage.completedAttempts, 4);
  assert.equal(first.report.coverage.expectedPasses, 2);
  assert.deepEqual(first.report.coverage.observedPassDirectories, [1, 2]);
  assert.equal(first.report.summary.results, 4);
  assert.equal(first.report.summary.failedResults, 0);
  assert.equal(first.report.slices.language.English.results, 4);
  assert.equal(first.report.slices.sourceType.controlled.results, 4);
  assert.equal(first.report.stability.caseCount, 2);
  assert.equal(first.report.stability.pairCount, 2);
  assert.equal(first.report.stability.riskLabelFlips, 0);
  assert.equal(first.report.stability.criticalRiskDowngradeComparisons, 1);
  assert.equal(first.report.stability.criticalRiskDowngrades, 0);
  assert.equal(first.report.executionMetrics.attemptsWithAnyMetric, 4);
  assert.equal(first.report.executionMetrics.fields.inputTokens.total, 4000);
  assert.equal(first.report.executionMetrics.fields.latencyMs.count, 4);
  assert.equal(first.report.executionMetrics.fields.latencyMs.p95, 102);
  assert.equal(first.report.identity.scoringManifestFingerprint, fixture.scoringManifest.scoringManifestFingerprint);
  assert.ok(fs.existsSync(first.reviewArtifactPath));
  assert.equal(first.reviewArtifact.attempts.length, 4);
  assert.ok(first.reviewArtifact.attempts.every((attempt) => attempt.runFingerprint === first.reviewArtifact.runFingerprint));
  assert.ok(first.reviewArtifact.attempts.every((attempt) => attempt.configurationFingerprint === first.reviewArtifact.configurationFingerprint));
  const directReviewAttempts = first.reviewArtifact.attempts.filter((attempt) => attempt.caseId === "case-direct");
  assert.ok(directReviewAttempts.every((attempt) => attempt.imagePaths.length === 2));
  assert.ok(directReviewAttempts.every((attempt) => attempt.images.length === 2));
  assert.ok(directReviewAttempts.every((attempt) => !Object.hasOwn(attempt, "imagePath")));
  assert.deepEqual(
    directReviewAttempts[0].images.map((image) => image.label),
    [buildMenuPageLabel(0, 2), buildMenuPageLabel(1, 2)]
  );
  const legacyReviewAttempts = first.reviewArtifact.attempts.filter((attempt) => attempt.caseId === "case-poor");
  assert.ok(legacyReviewAttempts.every((attempt) => typeof attempt.imagePath === "string"));
  assert.ok(legacyReviewAttempts.every((attempt) => !Object.hasOwn(attempt, "imagePaths")));
  assert.ok(legacyReviewAttempts.every((attempt) => !Object.hasOwn(attempt, "images")));
  const normalizedReview = normalizeAttemptArtifact(first.reviewArtifact, {
    sourceDirectory: path.dirname(first.reviewArtifactPath)
  });
  assert.equal(normalizedReview.attempts.length, 4);
  const reviewBundle = createReviewBundle(first.reviewArtifact, {
    sourceDirectory: path.dirname(first.reviewArtifactPath)
  });
  assert.ok(reviewBundle.template.items.length > 0);
  assert.doesNotMatch(firstPayload, new RegExp(HIDDEN_LABEL));
  assert.doesNotMatch(firstPayload, /"rawResponse"\s*:/);
  assert.doesNotMatch(firstPayload, /"expected"\s*:/);
  assert.doesNotMatch(fs.readFileSync(first.reviewArtifactPath, "utf8"), new RegExp(HIDDEN_LABEL));

  const second = scoreFixture(fixture);
  const secondPayload = fs.readFileSync(second.outputPath, "utf8");
  assert.equal(secondPayload, firstPayload, "same evidence must produce byte-identical reports");
}

function testScoringManifestTamperGate(root) {
  const fixture = createFixture(root);
  const casePath = path.join(fixture.preparedDirectory, "cases", "case-direct.json");
  const preparedCase = readJsonFile(casePath);
  preparedCase.expected.minimumRisks[0].minimumRisk = "low_risk";
  writeJsonAtomic(casePath, preparedCase);
  assert.throws(
    () => scoreFixture(fixture),
    /do not match the sealed scoring manifest/i
  );
}

function testHumanReviewArtifactImmutability(root) {
  const fixture = createFixture(root);
  const first = scoreFixture(fixture);
  const artifact = readJsonFile(first.reviewArtifactPath);
  artifact.attempts[0].output.dishes = [];
  writeJsonAtomic(first.reviewArtifactPath, artifact);
  assertManualError(() => scoreFixture(fixture), "human_review_artifact_mismatch");
}

function testMissingExpectedPassGate(root) {
  const fixture = createFixture(root, { passes: 1, expectedPasses: 2 });
  assertManualError(() => scoreFixture(fixture), "missing_expected_passes");

  const provisional = scoreFixture(fixture, { allowIncomplete: true });
  assert.equal(provisional.report.complete, false);
  assert.equal(provisional.report.coverage.expectedAttempts, 4);
  assert.equal(provisional.report.coverage.completedAttempts, 2);
  assert.deepEqual(provisional.report.coverage.observedPassDirectories, [1]);
  assert.deepEqual(provisional.report.coverage.missingAttempts, [
    { pass: 2, caseId: "case-direct" },
    { pass: 2, caseId: "case-poor" }
  ]);
}

function testUnexpectedPassGate(root) {
  const fixture = createFixture(root);
  fs.cpSync(
    path.join(fixture.responsesDirectory, "pass-001"),
    path.join(fixture.responsesDirectory, "pass-002"),
    { recursive: true }
  );
  assertManualError(() => scoreFixture(fixture), "unexpected_passes");
}

function testIncompleteRunGate(root) {
  const fixture = createFixture(root, { completeCases: ["case-direct"] });
  assertManualError(() => scoreFixture(fixture), "incomplete_run");

  const provisional = scoreFixture(fixture, { allowIncomplete: true });
  assert.equal(provisional.report.complete, false);
  assert.equal(provisional.report.coverage.completedAttempts, 1);
  assert.deepEqual(provisional.report.coverage.missingAttempts, [
    { pass: 1, caseId: "case-poor" }
  ]);
}

function testMixedFingerprintGate(root) {
  const fixture = createFixture(root);
  const responsePath = firstResponsePath(fixture);
  const response = readJsonFile(responsePath);
  response.fingerprints.model = `sha256:${"0".repeat(64)}`;
  writeJsonAtomic(responsePath, response);
  assertManualError(() => scoreFixture(fixture), "fingerprint_mismatch");
}

function testDuplicateAttemptGate(root) {
  const fixture = createFixture(root);
  const responsePath = firstResponsePath(fixture);
  fs.copyFileSync(responsePath, path.join(path.dirname(responsePath), "duplicate-attempt.json"));
  assertManualError(() => scoreFixture(fixture), "duplicate_response_attempt");
}

function testMalformedResponseGate(root) {
  const fixture = createFixture(root);
  const responsePath = firstResponsePath(fixture);
  const response = readJsonFile(responsePath);
  response.rawResponse = "{";
  writeJsonAtomic(responsePath, response);
  assertManualError(() => scoreFixture(fixture), "malformed_response_json");
}

function testInvalidSchemaReviewArtifact(root) {
  const fixture = createFixture(root);
  const responsePath = firstResponsePath(fixture);
  const response = readJsonFile(responsePath);
  response.rawResponse = "{}";
  response.response = {};
  response.responseFingerprint = fingerprintJson({});
  response.submissionFingerprint = fingerprintJson({
    response: {},
    executionMetrics: response.executionMetrics
  });
  writeJsonAtomic(responsePath, response);
  const result = scoreFixture(fixture);
  const invalidAttempt = result.reviewArtifact.attempts.find((attempt) => attempt.caseId === response.caseId);
  assert.equal(invalidAttempt.reviewable, false);
  assert.deepEqual(invalidAttempt.output.dishes, []);
  const normalized = normalizeAttemptArtifact(result.reviewArtifact, {
    sourceDirectory: path.dirname(result.reviewArtifactPath)
  });
  assert.equal(normalized.attempts.length, 2);
}

function createFixture(
  root,
  {
    passes = 1,
    expectedPasses = passes,
    completeCases = ["case-direct", "case-poor"]
  } = {}
) {
  const preparedDirectory = path.join(root, "prepared", "manual-score-test");
  const outputRoot = path.join(root, "responses");
  const responsesDirectory = path.join(outputRoot, "manual-score-test");
  const reportDirectory = path.join(root, "reports", "manual-score-test");
  fs.mkdirSync(path.join(preparedDirectory, "cases"), { recursive: true });
  fs.mkdirSync(path.join(preparedDirectory, "images"), { recursive: true });
  fs.mkdirSync(path.join(preparedDirectory, "evidence"), { recursive: true });
  fs.writeFileSync(path.join(preparedDirectory, "images", "menu.png"), TINY_PNG);
  fs.writeFileSync(path.join(preparedDirectory, "images", "menu-2.png"), TINY_PNG);

  const preparedCases = [directPreparedCase(), poorPreparedCase()];
  const sourceManifestBytes = Buffer.from(`${JSON.stringify({ cases: preparedCases }, null, 2)}\n`, "utf8");
  const sourceManifestPath = "evidence/source-manifest.json";
  const scoringManifestPath = "evidence/scoring-manifest.json";
  const scoringManifest = createManualScoringManifest({
    runId: "manual-score-test",
    sourceManifestBytes,
    sourceManifestPath,
    cases: preparedCases
  });
  fs.writeFileSync(path.join(preparedDirectory, sourceManifestPath), sourceManifestBytes);
  writeJsonAtomic(path.join(preparedDirectory, scoringManifestPath), scoringManifest);

  const config = {
    formatVersion: 1,
    runId: "manual-score-test",
    model: { provider: "google-ai-studio", name: "test-model" },
    prompt: { version: "test-prompt-v1", system: "Return JSON only." },
    schema: { version: "test-schema-v1", type: "object" },
    generationConfig: {
      thinkingLevel: "low",
      maxOutputTokens: 6000,
      responseMimeType: "application/json"
    },
    executionPlan: { expectedPasses },
    evidence: {
      manualScoring: {
        sourceManifestPath,
        sourceManifestSha256: fingerprintEvidenceBytes(sourceManifestBytes),
        scoringManifestPath,
        scoringManifestFingerprint: scoringManifest.scoringManifestFingerprint,
        holdoutIdentity: null
      }
    },
    imageBaseDirectory: "."
  };
  config.fingerprints = computeConfigFingerprints(config);
  writeJsonAtomic(path.join(preparedDirectory, "config.json"), config);
  writeJsonAtomic(path.join(preparedDirectory, "cases", "case-direct.json"), preparedCases[0]);
  writeJsonAtomic(path.join(preparedDirectory, "cases", "case-poor.json"), preparedCases[1]);

  const preparedRun = loadPreparedRun(preparedDirectory);
  for (let pass = 1; pass <= passes; pass += 1) {
    const store = new OutputStore({ preparedRun, pass, outputRoot });
    for (const caseId of completeCases) {
      store.submit({
        caseId,
        pass,
        fingerprints: preparedRun.fingerprints,
        freshSessionAcknowledged: true,
        executionMetrics: {
          latencyMs: 100 + pass,
          inputTokens: 1000,
          outputTokens: 200,
          thinkingTokens: 50
        },
        rawJson: JSON.stringify(caseId === "case-direct" ? directOutput(pass) : poorOutput(pass))
      });
    }
  }

  return {
    runId: config.runId,
    preparedDirectory,
    responsesDirectory,
    reportDirectory,
    scoringManifest
  };
}

function directPreparedCase() {
  return {
    schemaVersion: "2",
    id: "case-direct",
    name: "Direct allergen",
    images: [{
      path: "images/menu.png",
      sha256: TINY_PNG_SHA256,
      label: buildMenuPageLabel(0, 2)
    }, {
      path: "images/menu-2.png",
      sha256: TINY_PNG_SHA256,
      label: buildMenuPageLabel(1, 2)
    }],
    profile: {
      preferredLanguage: "English",
      restaurantLanguage: "English",
      allergies: [{ name: "Sesame", severity: "severe", avoidCrossContact: true }]
    },
    promptContentOrder: "instruction_first",
    userPrompt: "Analyze the menu for severe sesame allergy. Return JSON only.",
    expected: {
      hiddenReviewerNote: HIDDEN_LABEL,
      readability: "clear",
      minimumRisks: [
        { dishName: "Tahini Plate", minimumRisk: "avoid_unless_confirmed", directListed: true }
      ],
      benignDishes: ["Plain Rice"]
    },
    labels: {
      sourceType: "controlled",
      language: "English",
      qualityVariant: "clear",
      critical: true
    }
  };
}

function poorPreparedCase() {
  return {
    id: "case-poor",
    name: "Unreadable menu",
    imagePath: "images/menu.png",
    profile: {
      preferredLanguage: "English",
      restaurantLanguage: "English",
      allergies: [{ name: "Peanut", severity: "mild", avoidCrossContact: false }]
    },
    menuPageLabel: buildMenuPageLabel(0, 1),
    promptContentOrder: "instruction_first",
    userPrompt: "Analyze this blurred menu. Return JSON only.",
    expected: {
      hiddenReviewerNote: HIDDEN_LABEL,
      readability: "poor",
      needsRetake: true,
      overallRisk: "unclear"
    },
    labels: {
      sourceType: "controlled",
      language: "English",
      qualityVariant: "blurred",
      critical: true
    }
  };
}

function scoreFixture(fixture, overrides = {}) {
  return scoreManualRun({
    runId: fixture.runId,
    preparedDirectory: fixture.preparedDirectory,
    responsesDirectory: fixture.responsesDirectory,
    reportDirectory: fixture.reportDirectory,
    ...overrides
  });
}

function directOutput(pass) {
  return baseOutput({
    allergyName: "Sesame",
    allergySeverity: "severe",
    restaurantName: "Test Menu",
    overallRisk: "low_risk",
    readability: "clear",
    needsRetake: false,
    pageCount: 2,
    dishes: [
      dish({
        dishName: "Tahini Plate",
        visibleMenuText: ["Tahini Plate - sesame paste"],
        // The raw model label is intentionally too low. The shared Sift policy
        // must raise visible tahini for a severe sesame profile before scoring.
        riskLevel: "low_risk",
        possibleAllergens: ["Sesame"],
        riskBasis: ["visible_text"],
        reason: "Tahini is visibly listed and is a sesame derivative."
      }),
      dish({
        dishName: "Plain Rice",
        visibleMenuText: ["Plain Rice"],
        riskLevel: "low_risk",
        possibleAllergens: [],
        riskBasis: ["visible_text"],
        reason: `No obvious sesame appears in the visible text; confirm preparation with staff (pass ${pass}).`
      })
    ]
  });
}

function poorOutput(pass) {
  return baseOutput({
    allergyName: "Peanut",
    allergySeverity: "mild",
    restaurantName: "Menu scan",
    overallRisk: "unclear",
    readability: "poor",
    needsRetake: true,
    dishes: [
      dish({
        dishName: "Unreadable section",
        visibleMenuText: [],
        riskLevel: "unclear",
        possibleAllergens: [],
        riskBasis: ["image_uncertain"],
        reason: `The menu image is too blurred to assess reliably (pass ${pass}).`
      })
    ]
  });
}

function baseOutput({
  allergyName,
  allergySeverity,
  restaurantName,
  overallRisk,
  readability,
  needsRetake,
  pageCount = 1,
  dishes
}) {
  const profileMarker = `[${allergyName}: ${allergySeverity}]`;
  return {
    restaurantName,
    scanSummary: {
      overallRisk,
      summary: readability === "poor" ? "The menu could not be read clearly." : "Allergen risks were identified.",
      limitations: "Visible menu text cannot verify ingredients, kitchen preparation, or cross-contact."
    },
    pageAssessments: Array.from({ length: pageCount }, (_unused, index) => (
      {
        pageNumber: index + 1,
        contentType: readability === "poor" ? "unusable_or_unknown" : "dish_listing",
        readability,
        issues: readability === "poor" ? ["Blurred text"] : []
      }
    )),
    dishes: dishes.map((item) => ({
      ...item,
      sourcePageNumbers: Array.from({ length: pageCount }, (_unused, index) => index + 1),
      questionsToAsk: [
        `Can you confirm whether this contains ${allergyName} or has ${allergyName} cross-contact?`
      ],
      questionsToAskUserLanguage: [
        `Can you confirm whether this contains ${allergyName} or has ${allergyName} cross-contact?`
      ]
    })),
    restaurantMessage: {
      english: `${profileMarker} I have a ${allergyName} allergy. Please confirm ingredients and cross-contact.`,
      translated: "",
      language: "",
      userLanguageText: `${profileMarker} I have a ${allergyName} allergy. Please confirm ingredients and cross-contact.`,
      userLanguage: "English"
    },
    imageQuality: {
      readability,
      issues: readability === "poor" ? ["Blurred text"] : [],
      needsRetake
    }
  };
}

function dish({ dishName, visibleMenuText, riskLevel, possibleAllergens, riskBasis, reason }) {
  return {
    dishName,
    menuDescription: visibleMenuText.join(" "),
    evidence: {
      visibleMenuText,
      directAllergenTerms: [],
      allergenDerivatives: [],
      commonRecipePatterns: [],
      unknownPreparationComponents: [],
      crossContactSignals: ["Shared preparation cannot be verified."],
      uncertainties: []
    },
    riskLevel,
    possibleAllergens,
    evidenceConfidence: visibleMenuText.length > 0 ? "high" : "low",
    riskBasis,
    reason,
    questionsToAsk: ["Can you confirm the ingredients and shared preparation?"],
    questionsToAskUserLanguage: ["Can you confirm the ingredients and shared preparation?"],
    conservativeLanguage: "Ask staff before ordering."
  };
}

function firstResponsePath(fixture) {
  const responses = path.join(fixture.responsesDirectory, "pass-001", "responses");
  const filename = fs.readdirSync(responses).find((name) => name.endsWith(".json"));
  assert.ok(filename);
  return path.join(responses, filename);
}

function assertManualError(operation, code) {
  assert.throws(operation, (error) => (
    error instanceof ManualScoringError && error.code === code
  ));
}

function removeTemporaryRoot(temporaryRoot) {
  const resolvedRoot = path.resolve(temporaryRoot);
  const resolvedTemp = path.resolve(os.tmpdir());
  if (!resolvedRoot.startsWith(`${resolvedTemp}${path.sep}`) || !path.basename(resolvedRoot).startsWith("sift-manual-score-")) {
    throw new Error(`Refusing to remove unexpected self-test directory ${resolvedRoot}.`);
  }
  fs.rmSync(resolvedRoot, { recursive: true, force: true });
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  try {
    runSelfTest();
  } catch (error) {
    console.error("Manual scoring self-test failed:", error);
    process.exitCode = 1;
  }
}
