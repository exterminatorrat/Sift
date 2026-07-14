import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  FINGERPRINT_KEYS,
  fingerprintJson,
  loadPreparedRun,
  readJsonFile
} from "./manual-workbench/workbench.mjs";
import {
  scoreBenchmark,
  summarizeStability
} from "./lib/index.mjs";
import { loadClientScanResultValidator } from "./lib/client-validator.mjs";
import {
  normalizeModelScanResult,
  sanitizeScanResult
} from "../../supabase/functions/_shared/ai/normalization.mjs";
import { validateModelScanResult } from "../../supabase/functions/_shared/ai/provider-validation.mjs";
import { applyRiskPolicy } from "../../supabase/functions/_shared/ai/risk-policy.mjs";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(MODULE_DIRECTORY, "../..");
const DEFAULT_PREPARED_ROOT = path.join(REPOSITORY_ROOT, "output", "ai-evals", "manual-prepared");
const DEFAULT_RESPONSES_ROOT = path.join(REPOSITORY_ROOT, "output", "ai-evals", "manual");
const DEFAULT_REPORTS_ROOT = path.join(REPOSITORY_ROOT, "output", "ai-evals", "manual-reports");
const FORMAT_VERSION = 1;
const PASS_DIRECTORY_PATTERN = /^pass-(\d{3})$/;
const FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/;
const EXECUTION_METRIC_KEYS = ["latencyMs", "inputTokens", "outputTokens", "thinkingTokens"];
const BANNED_SAFETY_PATTERNS = [
  /\bsafe to eat\b/i,
  /\bsafe for you\b/i,
  /\byou can eat (?:this|it)\b/i,
  /\bprobably fine\b/i,
  /\bguaranteed\b/i,
  /\bcompletely safe\b/i,
  /\ballergen[- ]free\b/i,
  /\bsafe (?:option|choice|meal|dish)\b/i,
  /\bok(?:ay)? to eat\b/i,
  /\b(?:no|zero) risk\b/i,
  /\briskless\b/i,
  /\bnothing to worry about\b/i,
  /\bdefinitely safe\b/i,
  /\brisk[- ]free\b/i
];

export class ManualScoringError extends Error {
  constructor(message, code = "manual_scoring_failed") {
    super(message);
    this.name = "ManualScoringError";
    this.code = code;
  }
}

export function parseArguments(args) {
  const options = {
    runId: null,
    preparedDirectory: null,
    responsesDirectory: null,
    reportDirectory: null,
    allowIncomplete: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--allow-incomplete") {
      options.allowIncomplete = true;
      continue;
    }
    if (argument === "--run-id") {
      options.runId = requireArgumentValue(args, ++index, argument);
      continue;
    }
    if (argument === "--prepared") {
      options.preparedDirectory = requireArgumentValue(args, ++index, argument);
      continue;
    }
    if (argument === "--responses") {
      options.responsesDirectory = requireArgumentValue(args, ++index, argument);
      continue;
    }
    if (argument === "--report-dir") {
      options.reportDirectory = requireArgumentValue(args, ++index, argument);
      continue;
    }
    if (!argument.startsWith("-") && options.runId === null) {
      options.runId = argument;
      continue;
    }
    throw new ManualScoringError(`Unknown argument ${argument}.`, "unknown_argument");
  }

  if (options.runId !== null && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options.runId)) {
    throw new ManualScoringError(
      "Run ID must be 1-128 characters using letters, numbers, dots, underscores, or hyphens.",
      "invalid_run_id"
    );
  }
  return options;
}

export function scoreManualRun({
  runId,
  preparedDirectory,
  responsesDirectory,
  reportDirectory,
  allowIncomplete = false
}) {
  if (typeof runId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runId)) {
    throw new ManualScoringError("A valid run ID is required.", "invalid_run_id");
  }

  const preparedPath = path.resolve(preparedDirectory ?? path.join(DEFAULT_PREPARED_ROOT, runId));
  const responsesPath = path.resolve(responsesDirectory ?? path.join(DEFAULT_RESPONSES_ROOT, runId));
  const reportPath = path.resolve(reportDirectory ?? path.join(DEFAULT_REPORTS_ROOT, runId));
  const preparedRun = loadPreparedRun(preparedPath);
  if (preparedRun.runId !== runId) {
    throw identityError("prepared run ID", runId, preparedRun.runId);
  }

  const scoringCases = loadScoringCases(preparedRun);
  const responseEvidence = loadResponseEvidence(responsesPath, preparedRun, { allowIncomplete });
  const casesById = new Map(scoringCases.map((item) => [item.id, item]));
  const clientValidator = loadClientScanResultValidator();
  const resultEnvelopes = responseEvidence.records.map(({ pass, caseId, response, executionMetrics }) => {
    const caseEnvelope = casesById.get(caseId);
    const providerSchemaError = validateModelScanResult(response, {
      profile: caseEnvelope?.profile,
      imageCount: caseEnvelope?.images?.length ?? 1
    });
    let output = response;
    let clientSchemaError = null;

    if (providerSchemaError === null && caseEnvelope) {
      const normalized = normalizeModelScanResult(
        response,
        caseEnvelope.profile?.id ?? `manual-profile-${caseId}`,
        {
          now: "2026-07-13T00:00:00.000Z",
          scanId: `manual-${caseId}-pass-${String(pass).padStart(3, "0")}`
        }
      );
      const policyResult = applyRiskPolicy(
        sanitizeScanResult(normalized),
        caseEnvelope.profile
      );
      const clientValidation = clientValidator.validateScanResult(policyResult);
      clientSchemaError = clientValidation.ok ? null : clientValidation.error;
      output = clientValidation.ok ? clientValidation.value : policyResult;
    }

    const schemaError = providerSchemaError ?? clientSchemaError;
    return {
      caseId,
      runId: `${runId}/pass-${String(pass).padStart(3, "0")}`,
      pass,
      output,
      availabilityStatus: "available",
      schemaStatus: schemaError === null ? "valid" : "invalid",
      schemaError,
      providerSchemaError,
      clientSchemaError,
      executionMetrics,
      forbiddenSafetyClaims: detectForbiddenSafetyClaims(response)
    };
  });
  const scored = scoreBenchmark(
    { cases: scoringCases, results: resultEnvelopes },
    {
      slices: {
        groupId: "groupId",
        sourceType: "sourceType",
        language: "language",
        cuisine: "cuisine",
        qualityVariant: "qualityVariant",
        critical: "critical",
        allergen: (score) => score.case?.profile?.allergies?.map((allergy) => allergy.name) ?? ["unknown"],
        severity: (score) => score.case?.profile?.allergies?.map((allergy) => allergy.severity) ?? ["unknown"],
        crossContactSensitivity: (score) => (
          score.case?.profile?.allergies?.some((allergy) => allergy.avoidCrossContact === true)
            ? "sensitive"
            : "not_sensitive"
        )
      }
    }
  );
  const stability = summarizeStability(resultEnvelopes, { cases: scoringCases });
  const executionMetrics = summarizeExecutionMetrics(responseEvidence.records);
  const runFingerprint = fingerprintJson({
    runId,
    caseSetFingerprint: preparedRun.caseSetFingerprint,
    scoringManifestFingerprint: preparedRun.scoringManifestFingerprint,
    expectedPasses: preparedRun.expectedPasses
  });
  const configurationFingerprint = preparedRun.fingerprints.config;
  const attempts = scored.scores.map((score) => ({
    pass: score.result.pass,
    caseId: score.caseId,
    passed: score.passed,
    failures: score.failures,
    schemaStatus: score.schemaStatus,
    schemaError: score.result.schemaError,
    providerSchemaError: score.result.providerSchemaError,
    clientSchemaError: score.result.clientSchemaError,
    availabilityStatus: score.availabilityStatus,
    executionMetrics: score.result.executionMetrics
  }));
  const report = {
    formatVersion: FORMAT_VERSION,
    reportType: "sift-manual-ai-eval",
    runId,
    complete: responseEvidence.complete,
    allowIncomplete,
    identity: {
      fingerprints: preparedRun.fingerprints,
      caseSetFingerprint: preparedRun.caseSetFingerprint,
      scoringManifestFingerprint: preparedRun.scoringManifestFingerprint,
      sourceManifestSha256: preparedRun.scoringEvidence.sourceSha256,
      runFingerprint,
      model: preparedRun.config.model,
      promptVersion: preparedRun.config.prompt?.version ?? null,
      schemaVersion: preparedRun.config.schema?.version ?? null,
      generationConfig: preparedRun.config.generationConfig ?? null
    },
    coverage: {
      expectedCasesPerPass: preparedRun.cases.length,
      expectedPasses: preparedRun.expectedPasses,
      observedPassDirectories: responseEvidence.observedPasses,
      passCount: responseEvidence.passes.length,
      expectedAttempts: preparedRun.cases.length * preparedRun.expectedPasses,
      completedAttempts: responseEvidence.records.length,
      missingAttempts: responseEvidence.missingAttempts,
      passes: responseEvidence.passes
    },
    summary: scored.summary,
    slices: scored.slices,
    stability,
    executionMetrics,
    humanReviewArtifact: {
      filename: "human-review-input.json",
      runFingerprint,
      configurationFingerprint
    },
    attempts
  };

  fs.mkdirSync(reportPath, { recursive: true });
  const outputPath = path.join(reportPath, "report.json");
  writeJsonAtomic(outputPath, report);
  const reviewArtifact = buildHumanReviewArtifact({
    runId,
    runFingerprint,
    configurationFingerprint,
    preparedRun,
    resultEnvelopes
  });
  const reviewArtifactPath = path.join(reportPath, "human-review-input.json");
  writeImmutableJson(reviewArtifactPath, reviewArtifact);
  return { report, outputPath, reviewArtifact, reviewArtifactPath };
}

function loadScoringCases(preparedRun) {
  const sealedCases = preparedRun.scoringEvidence?.manifest?.cases;
  if (!Array.isArray(sealedCases)) {
    throw new ManualScoringError("Prepared run is missing sealed scoring cases.", "missing_scoring_manifest");
  }
  const sealedById = new Map(sealedCases.map((item) => [item.id, item]));
  assertExactCaseSet(preparedRun.cases.map((item) => item.id), [...sealedById.keys()], "sealed scoring manifest");
  return preparedRun.cases.map((preparedCase) => {
    const sealed = sealedById.get(preparedCase.id);
    const images = preparedCase.images.map((image) => ({
      path: image.path,
      sha256: image.sha256,
      label: image.label
    }));
    return {
      id: preparedCase.id,
      profile: preparedCase.profile,
      images,
      imagePaths: images.map((image) => image.path),
      ...(images.length === 1 ? { imagePath: images[0].path } : {}),
      expected: sealed.expectations,
      review: sealed.review,
      groupId: sealed.grouping.groupId,
      sourceType: sealed.slices.sourceType,
      language: sealed.slices.language,
      cuisine: sealed.slices.cuisine,
      qualityVariant: sealed.slices.qualityVariant,
      critical: sealed.slices.critical
    };
  });
}

function loadResponseEvidence(responsesDirectory, preparedRun, { allowIncomplete }) {
  const entries = listDirectoryEntries(responsesDirectory, "manual response directory");
  const unexpected = entries.filter((entry) => (
    !(entry.isFile() && entry.name === "manifest.json") &&
    !(entry.isDirectory() && PASS_DIRECTORY_PATTERN.test(entry.name))
  ));
  if (unexpected.length > 0) {
    throw new ManualScoringError(
      `Manual response directory contains unexpected entries: ${unexpected.map((entry) => entry.name).join(", ")}.`,
      "unexpected_response_entry"
    );
  }

  const manifest = readJsonStrict(path.join(responsesDirectory, "manifest.json"), "manual-run manifest");
  validateManifest(manifest, preparedRun);
  const passEntries = entries
    .filter((entry) => entry.isDirectory() && PASS_DIRECTORY_PATTERN.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      pass: Number(PASS_DIRECTORY_PATTERN.exec(entry.name)[1])
    }))
    .sort((left, right) => left.pass - right.pass);
  const expectedPassNumbers = Array.from(
    { length: preparedRun.expectedPasses },
    (_unused, index) => index + 1
  );
  const observedPassNumbers = passEntries.map((entry) => entry.pass);
  const unexpectedPasses = observedPassNumbers.filter((pass) => !expectedPassNumbers.includes(pass));
  if (unexpectedPasses.length > 0) {
    throw new ManualScoringError(
      `Manual response directory contains unexpected pass(es): ${unexpectedPasses.join(", ")}.`,
      "unexpected_passes"
    );
  }
  const missingPasses = expectedPassNumbers.filter((pass) => !observedPassNumbers.includes(pass));
  if (missingPasses.length > 0 && !allowIncomplete) {
    throw new ManualScoringError(
      `Manual run is missing expected pass(es): ${missingPasses.join(", ")}. Re-run with --allow-incomplete only for a provisional report.`,
      "missing_expected_passes"
    );
  }

  const records = [];
  const passes = [];
  const missingAttempts = [];
  const passEntryByNumber = new Map(passEntries.map((entry) => [entry.pass, entry]));
  for (const pass of expectedPassNumbers) {
    const passEntry = passEntryByNumber.get(pass);
    if (!passEntry) {
      const missingCaseIds = preparedRun.cases.map((item) => item.id);
      passes.push({
        pass,
        complete: false,
        directoryPresent: false,
        completedCases: 0,
        missingCaseIds
      });
      for (const caseId of missingCaseIds) missingAttempts.push({ pass, caseId });
      continue;
    }
    const loaded = loadPass(path.join(responsesDirectory, passEntry.name), passEntry.pass, preparedRun);
    records.push(...loaded.records);
    passes.push({
      pass: passEntry.pass,
      complete: loaded.missingCaseIds.length === 0,
      directoryPresent: true,
      completedCases: loaded.records.length,
      missingCaseIds: loaded.missingCaseIds
    });
    for (const caseId of loaded.missingCaseIds) {
      missingAttempts.push({ pass: passEntry.pass, caseId });
    }
  }

  if (missingAttempts.length > 0 && !allowIncomplete) {
    throw new ManualScoringError(
      `Manual run is incomplete: ${missingAttempts.length} case attempt(s) are missing. Re-run with --allow-incomplete only for a provisional report.`,
      "incomplete_run"
    );
  }
  return {
    complete: missingAttempts.length === 0,
    records,
    passes,
    observedPasses: observedPassNumbers,
    missingAttempts
  };
}

function validateManifest(manifest, preparedRun) {
  assertRecord(manifest, "manual-run manifest");
  if (manifest.formatVersion !== FORMAT_VERSION) {
    throw new ManualScoringError("Manual-run manifest format version is unsupported.", "unsupported_format_version");
  }
  if (manifest.runId !== preparedRun.runId) {
    throw identityError("manifest run ID", preparedRun.runId, manifest.runId);
  }
  assertFingerprints(preparedRun.fingerprints, manifest.fingerprints, "manual-run manifest");
  if (manifest.caseSetFingerprint !== preparedRun.caseSetFingerprint) {
    throw identityError("manifest case-set fingerprint", preparedRun.caseSetFingerprint, manifest.caseSetFingerprint);
  }
  if (manifest.scoringManifestFingerprint !== preparedRun.scoringManifestFingerprint) {
    throw identityError(
      "manifest scoring-manifest fingerprint",
      preparedRun.scoringManifestFingerprint,
      manifest.scoringManifestFingerprint
    );
  }
  if (manifest.expectedPasses !== preparedRun.expectedPasses) {
    throw identityError("manifest expected pass count", preparedRun.expectedPasses, manifest.expectedPasses);
  }
  if (!Array.isArray(manifest.cases)) {
    throw new ManualScoringError("Manual-run manifest cases must be an array.", "invalid_manifest_cases");
  }
  const manifestById = uniqueCaseRecords(manifest.cases, "manual-run manifest");
  assertExactCaseSet(preparedRun.cases.map((item) => item.id), [...manifestById.keys()], "manual-run manifest");
  for (const preparedCase of preparedRun.cases) {
    const manifestCase = manifestById.get(preparedCase.id);
    if (manifestCase.inputFingerprint !== preparedCase.inputFingerprint) {
      throw identityError(
        `manifest case ${preparedCase.id} input fingerprint`,
        preparedCase.inputFingerprint,
        manifestCase.inputFingerprint
      );
    }
  }
}

function loadPass(passDirectory, pass, preparedRun) {
  const passEntries = listDirectoryEntries(passDirectory, `pass ${pass} directory`);
  const unexpected = passEntries.filter((entry) => (
    !(entry.isFile() && entry.name === "checkpoint.json") &&
    !(entry.isDirectory() && entry.name === "responses")
  ));
  if (unexpected.length > 0) {
    throw new ManualScoringError(
      `Pass ${pass} contains unexpected entries: ${unexpected.map((entry) => entry.name).join(", ")}.`,
      "unexpected_pass_entry"
    );
  }

  const checkpoint = readJsonStrict(path.join(passDirectory, "checkpoint.json"), `pass ${pass} checkpoint`);
  const responsesPath = path.join(passDirectory, "responses");
  const responseEntries = listDirectoryEntries(responsesPath, `pass ${pass} responses directory`);
  const unexpectedResponses = responseEntries.filter((entry) => (
    !entry.isFile() || !entry.name.toLowerCase().endsWith(".json")
  ));
  if (unexpectedResponses.length > 0) {
    throw new ManualScoringError(
      `Pass ${pass} responses contain unexpected entries: ${unexpectedResponses.map((entry) => entry.name).join(", ")}.`,
      "unexpected_response_attempt"
    );
  }

  const recordsById = new Map();
  for (const entry of [...responseEntries].sort((left, right) => compareNatural(left.name, right.name))) {
    const record = readJsonStrict(path.join(responsesPath, entry.name), `pass ${pass} response ${entry.name}`);
    validateResponseRecord(record, entry.name, pass, preparedRun);
    if (recordsById.has(record.caseId)) {
      throw new ManualScoringError(
        `Pass ${pass} contains multiple response attempts for case ${record.caseId}.`,
        "duplicate_response_attempt"
      );
    }
    recordsById.set(record.caseId, record);
  }

  validateCheckpoint(checkpoint, pass, preparedRun, recordsById);
  const expectedIds = preparedRun.cases.map((item) => item.id);
  const missingCaseIds = expectedIds.filter((caseId) => !recordsById.has(caseId));
  const records = expectedIds
    .filter((caseId) => recordsById.has(caseId))
    .map((caseId) => ({
      pass,
      caseId,
      response: recordsById.get(caseId).response,
      executionMetrics: recordsById.get(caseId).executionMetrics
    }));
  return { records, missingCaseIds };
}

function validateCheckpoint(checkpoint, pass, preparedRun, recordsById) {
  assertRecord(checkpoint, `pass ${pass} checkpoint`);
  if (checkpoint.formatVersion !== FORMAT_VERSION) {
    throw new ManualScoringError(`Pass ${pass} checkpoint format version is unsupported.`, "unsupported_format_version");
  }
  if (checkpoint.runId !== preparedRun.runId || checkpoint.pass !== pass) {
    throw new ManualScoringError(`Pass ${pass} checkpoint identity does not match the prepared run.`, "checkpoint_identity_mismatch");
  }
  assertFingerprints(preparedRun.fingerprints, checkpoint.fingerprints, `pass ${pass} checkpoint`);
  if (checkpoint.caseSetFingerprint !== preparedRun.caseSetFingerprint) {
    throw identityError(
      `pass ${pass} checkpoint case-set fingerprint`,
      preparedRun.caseSetFingerprint,
      checkpoint.caseSetFingerprint
    );
  }
  if (checkpoint.scoringManifestFingerprint !== preparedRun.scoringManifestFingerprint) {
    throw identityError(
      `pass ${pass} checkpoint scoring-manifest fingerprint`,
      preparedRun.scoringManifestFingerprint,
      checkpoint.scoringManifestFingerprint
    );
  }

  const expectedIds = preparedRun.cases.map((item) => item.id);
  const completedIds = expectedIds.filter((caseId) => recordsById.has(caseId));
  const missingIds = expectedIds.filter((caseId) => !recordsById.has(caseId));
  if (!Array.isArray(checkpoint.completedCaseIds) || hasDuplicates(checkpoint.completedCaseIds)) {
    throw new ManualScoringError(`Pass ${pass} checkpoint completedCaseIds is invalid.`, "invalid_checkpoint");
  }
  if (!sameStringArray(checkpoint.completedCaseIds, completedIds)) {
    throw new ManualScoringError(`Pass ${pass} checkpoint does not match saved responses.`, "checkpoint_response_mismatch");
  }
  if (
    checkpoint.totalCases !== expectedIds.length ||
    checkpoint.completedCases !== completedIds.length ||
    checkpoint.remainingCases !== missingIds.length ||
    checkpoint.nextCaseId !== (missingIds[0] ?? null)
  ) {
    throw new ManualScoringError(`Pass ${pass} checkpoint counts do not match saved responses.`, "checkpoint_response_mismatch");
  }
}

function validateResponseRecord(record, filename, pass, preparedRun) {
  assertRecord(record, `saved response ${filename}`);
  if (record.formatVersion !== FORMAT_VERSION || record.runId !== preparedRun.runId || record.pass !== pass) {
    throw new ManualScoringError(`Saved response ${filename} has mixed run or pass identity.`, "response_identity_mismatch");
  }
  if (typeof record.caseId !== "string" || !preparedRun.caseById.has(record.caseId)) {
    throw new ManualScoringError(`Saved response ${filename} references an unknown case.`, "unknown_response_case");
  }
  assertFingerprints(preparedRun.fingerprints, record.fingerprints, `saved response ${filename}`);
  const preparedCase = preparedRun.caseById.get(record.caseId);
  if (record.caseInputFingerprint !== preparedCase.inputFingerprint) {
    throw identityError(
      `saved response ${record.caseId} input fingerprint`,
      preparedCase.inputFingerprint,
      record.caseInputFingerprint
    );
  }
  if (record.scoringManifestFingerprint !== preparedRun.scoringManifestFingerprint) {
    throw identityError(
      `saved response ${record.caseId} scoring-manifest fingerprint`,
      preparedRun.scoringManifestFingerprint,
      record.scoringManifestFingerprint
    );
  }
  if (typeof record.rawResponse !== "string") {
    throw new ManualScoringError(`Saved response ${filename} is missing rawResponse.`, "malformed_response_json");
  }
  if (record.freshSessionAcknowledged !== true || !isFiniteTimestamp(record.freshSessionAcknowledgedAt)) {
    throw new ManualScoringError(
      `Saved response ${filename} is missing its per-case fresh-session acknowledgement.`,
      "missing_fresh_session_acknowledgement"
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(stripBom(record.rawResponse).trim());
  } catch {
    throw new ManualScoringError(`Saved response ${filename} contains malformed raw JSON.`, "malformed_response_json");
  }
  const responseFingerprint = fingerprintJson(parsed);
  const executionMetrics = normalizeExecutionMetrics(record.executionMetrics, filename);
  if (
    record.responseFingerprint !== responseFingerprint ||
    fingerprintJson(record.response) !== responseFingerprint
  ) {
    throw identityError(
      `saved response ${record.caseId} content fingerprint`,
      responseFingerprint,
      record.responseFingerprint
    );
  }
  const submissionFingerprint = fingerprintJson({ response: parsed, executionMetrics });
  if (record.submissionFingerprint !== submissionFingerprint) {
    throw identityError(
      `saved response ${record.caseId} submission fingerprint`,
      submissionFingerprint,
      record.submissionFingerprint
    );
  }
}

function detectForbiddenSafetyClaims(value) {
  const matches = [];
  visitStrings(value, (text, jsonPath) => {
    for (const pattern of BANNED_SAFETY_PATTERNS) {
      const match = pattern.exec(text);
      if (match) matches.push(`${jsonPath}:${match[0].toLowerCase()}`);
    }
  });
  return { count: matches.length, matches };
}

function buildHumanReviewArtifact({
  runId,
  runFingerprint,
  configurationFingerprint,
  preparedRun,
  resultEnvelopes
}) {
  const artifact = {
    formatVersion: FORMAT_VERSION,
    artifactType: "sift-manual-human-review-input",
    runId,
    runFingerprint,
    configurationFingerprint,
    scoringManifestFingerprint: preparedRun.scoringManifestFingerprint,
    sourceManifestSha256: preparedRun.scoringEvidence.sourceSha256,
    attempts: resultEnvelopes.map((result) => {
      const preparedCase = preparedRun.caseById.get(result.caseId);
      const normalizedOutput = normalizeHumanReviewOutput(result.output);
      const images = preparedCase.images.map((image) => ({
        path: image.path,
        sha256: image.sha256,
        label: image.label
      }));
      const imageEvidence = buildHumanReviewImageEvidence(preparedCase, images);
      return {
        caseId: result.caseId,
        pass: result.pass,
        runFingerprint,
        configurationFingerprint,
        ...imageEvidence,
        userLanguage: cleanLanguage(preparedCase.profile?.preferredLanguage),
        restaurantLanguage: cleanLanguage(preparedCase.profile?.restaurantLanguage),
        schemaStatus: result.schemaStatus,
        reviewable: normalizedOutput.reviewable,
        output: normalizedOutput.output
      };
    })
  };
  return JSON.parse(JSON.stringify(artifact));
}

function buildHumanReviewImageEvidence(preparedCase, images) {
  if (preparedCase.imageSchemaVersion === 1) {
    return { imagePath: images[0].path };
  }
  return {
    imagePaths: images.map((image) => image.path),
    images,
    ...(images.length === 1 ? { imagePath: images[0].path } : {})
  };
}

function normalizeHumanReviewOutput(output) {
  if (
    isRecord(output) &&
    Array.isArray(output.dishes) &&
    output.dishes.every((dish) => isRecord(dish?.transparency) && Array.isArray(dish.transparency.visibleMenuText))
  ) {
    return { reviewable: true, output };
  }
  return {
    reviewable: false,
    output: {
      analysisLanguage: "",
      dishes: [],
      restaurantMessage: null
    }
  };
}

function cleanLanguage(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "unknown";
}

function normalizeExecutionMetrics(value, filename) {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new ManualScoringError(
      `Saved response ${filename} executionMetrics must be an object when present.`,
      "invalid_execution_metrics"
    );
  }
  const unexpectedKeys = Object.keys(value).filter((key) => !EXECUTION_METRIC_KEYS.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new ManualScoringError(
      `Saved response ${filename} has unsupported execution metrics: ${unexpectedKeys.join(", ")}.`,
      "invalid_execution_metrics"
    );
  }
  const normalized = {};
  for (const key of EXECUTION_METRIC_KEYS) {
    if (value[key] === undefined || value[key] === null) continue;
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) {
      throw new ManualScoringError(
        `Saved response ${filename} executionMetrics.${key} must be a non-negative safe integer.`,
        "invalid_execution_metrics"
      );
    }
    normalized[key] = value[key];
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function summarizeExecutionMetrics(records) {
  const fields = {};
  for (const key of EXECUTION_METRIC_KEYS) {
    const values = records
      .map((record) => record.executionMetrics?.[key])
      .filter((value) => Number.isSafeInteger(value))
      .sort((left, right) => left - right);
    fields[key] = summarizeMetricValues(values, records.length);
  }
  return {
    attempts: records.length,
    attemptsWithAnyMetric: records.filter((record) => record.executionMetrics != null).length,
    fields
  };
}

function summarizeMetricValues(values, attempts) {
  if (values.length === 0) {
    return {
      count: 0,
      coverage: 0,
      total: null,
      min: null,
      max: null,
      mean: null,
      p50: null,
      p95: null,
      p99: null
    };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    coverage: attempts === 0 ? 0 : values.length / attempts,
    total,
    min: values[0],
    max: values.at(-1),
    mean: total / values.length,
    p50: nearestRank(values, 0.5),
    p95: nearestRank(values, 0.95),
    p99: nearestRank(values, 0.99)
  };
}

function nearestRank(sortedValues, percentile) {
  return sortedValues[Math.max(0, Math.ceil(percentile * sortedValues.length) - 1)];
}

function isFiniteTimestamp(value) {
  return typeof value === "string" && value.length > 0 && Number.isFinite(new Date(value).getTime());
}

function visitStrings(value, callback, jsonPath = "$") {
  if (typeof value === "string") {
    callback(value, jsonPath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitStrings(item, callback, `${jsonPath}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const key of Object.keys(value).sort()) {
      visitStrings(value[key], callback, `${jsonPath}.${key}`);
    }
  }
}

function uniqueCaseRecords(records, label) {
  const byId = new Map();
  for (const record of records) {
    if (!isRecord(record) || typeof record.caseId !== "string" || record.caseId === "") {
      throw new ManualScoringError(`${label} contains an invalid case record.`, "invalid_manifest_cases");
    }
    if (byId.has(record.caseId)) {
      throw new ManualScoringError(`${label} contains duplicate case ${record.caseId}.`, "duplicate_manifest_case");
    }
    byId.set(record.caseId, record);
  }
  return byId;
}

function assertExactCaseSet(expected, actual, label) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((caseId) => !actualSet.has(caseId));
  const unexpected = actual.filter((caseId) => !expectedSet.has(caseId));
  if (missing.length > 0 || unexpected.length > 0 || expected.length !== actual.length) {
    throw new ManualScoringError(
      `${label} case set mismatch (missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}).`,
      "case_set_mismatch"
    );
  }
}

function assertFingerprints(expected, received, label) {
  const mismatches = [];
  if (!isRecord(received)) {
    mismatches.push(...FINGERPRINT_KEYS);
  } else {
    for (const key of FINGERPRINT_KEYS) {
      if (
        typeof received[key] !== "string" ||
        !FINGERPRINT_PATTERN.test(received[key]) ||
        received[key] !== expected[key]
      ) {
        mismatches.push(key);
      }
    }
  }
  if (mismatches.length > 0) {
    throw new ManualScoringError(
      `${label} fingerprint mismatch: ${mismatches.join(", ")}.`,
      "fingerprint_mismatch"
    );
  }
}

function readJsonStrict(filePath, label) {
  try {
    return readJsonFile(filePath, label);
  } catch (error) {
    throw new ManualScoringError(
      `${label} could not be read as JSON: ${error instanceof Error ? error.message : String(error)}`,
      "malformed_json"
    );
  }
}

function listDirectoryEntries(directory, label) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    throw new ManualScoringError(
      `${label} could not be read at ${directory}: ${error instanceof Error ? error.message : String(error)}`,
      "missing_directory"
    );
  }
}

function writeJsonAtomic(filePath, value) {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, payload, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
}

function writeImmutableJson(filePath, value) {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(filePath)) {
    if (fs.readFileSync(filePath, "utf8") !== payload) {
      throw new ManualScoringError(
        `Refusing to replace different human-review evidence at ${filePath}.`,
        "human_review_artifact_mismatch"
      );
    }
    return;
  }
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, payload, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasDuplicates(values) {
  return new Set(values).size !== values.length;
}

function assertRecord(value, label) {
  if (!isRecord(value)) {
    throw new ManualScoringError(`${label} must be a JSON object.`, "invalid_object");
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

function compareNatural(left, right) {
  return left.localeCompare(right, "en", { numeric: true });
}

function identityError(label, expected, actual) {
  return new ManualScoringError(
    `${label} mismatch. Expected ${expected}; found ${actual ?? "missing"}.`,
    "identity_mismatch"
  );
}

function requireArgumentValue(args, index, option) {
  const value = args[index];
  if (value === undefined || value.startsWith("--")) {
    throw new ManualScoringError(`${option} requires a value.`, "missing_argument_value");
  }
  return value;
}

function printUsage() {
  console.log(`Usage:
  node scripts/ai-evals/score-manual-run.mjs <run-id> [--allow-incomplete]

Defaults:
  prepared: output/ai-evals/manual-prepared/<run-id>
  responses: output/ai-evals/manual/<run-id>
  report: output/ai-evals/manual-reports/<run-id>/report.json

Test/advanced path overrides:
  --prepared <directory> --responses <directory> --report-dir <directory>`);
}

export function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (options.help) {
    printUsage();
    return null;
  }
  if (!options.runId) {
    throw new ManualScoringError("Provide a run ID.", "missing_run_id");
  }
  const result = scoreManualRun(options);
  console.log(`Scored manual AI run ${options.runId}.`);
  console.log(`Status: ${result.report.complete ? "complete" : "provisional/incomplete"}`);
  console.log(`Attempts: ${result.report.coverage.completedAttempts}/${result.report.coverage.expectedAttempts}`);
  console.log(`Report: ${result.outputPath}`);
  return result;
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Manual AI scoring failed: ${message}`);
    process.exitCode = 1;
  }
}
