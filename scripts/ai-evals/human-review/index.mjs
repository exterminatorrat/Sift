import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildQuestionIntentTargets, normalizeDishName } from "../lib/scoring.mjs";

export const HUMAN_REVIEW_FORMAT_VERSION = 3;
export const VISIBLE_TEXT_JUDGMENTS = Object.freeze([
  "supported",
  "unsupported",
  "unreadable"
]);
export const TRANSLATION_JUDGMENTS = Object.freeze([
  "faithful",
  "material_error",
  "unreviewable"
]);
export const QUESTION_INTENT_JUDGMENTS = Object.freeze([
  "meets_intent",
  "misses_intent",
  "unreviewable"
]);

const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/;
const REVIEWER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._@-]{0,127}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const LANGUAGE_ALIASES = new Map([
  ["english", "en"],
  ["spanish", "es"],
  ["french", "fr"],
  ["german", "de"],
  ["italian", "it"],
  ["portuguese", "pt"],
  ["japanese", "ja"],
  ["korean", "ko"],
  ["chinese", "zh"],
  ["simplified chinese", "zh"],
  ["traditional chinese", "zh"],
  ["thai", "th"]
]);
const TEMPLATE_KEYS = new Set([
  "formatVersion",
  "artifactType",
  "reviewSetId",
  "reviewSetFingerprint",
  "keyFingerprint",
  "instructions",
  "reviewer",
  "items"
]);
const ITEM_KEYS = new Set([
  "itemId",
  "type",
  "attemptRef",
  "dishRef",
  "imageRef",
  "claim",
  "translationKind",
  "sourceLanguage",
  "targetLanguage",
  "sourceText",
  "targetText",
  "requirementId",
  "intent",
  "allergens",
  "requiredLanguage",
  "requiredLanguageCode",
  "questionChannel",
  "questionField",
  "actualLanguage",
  "questions",
  "judgment",
  "notes"
]);

export class HumanReviewError extends Error {
  constructor(message, code = "human_review_failed") {
    super(message);
    this.name = "HumanReviewError";
    this.code = code;
  }
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new HumanReviewError("Cannot fingerprint a non-finite number.", "invalid_fingerprint_source");
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object": {
      const entries = Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
      return `{${entries.join(",")}}`;
    }
    default:
      throw new HumanReviewError(
        `Cannot fingerprint JSON value of type ${typeof value}.`,
        "invalid_fingerprint_source"
      );
  }
}

export function fingerprintJson(value) {
  const digest = crypto.createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
  return `sha256:${digest}`;
}

export function fingerprintBytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function readJsonFile(filePath, label = filePath) {
  let source;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new HumanReviewError(`Could not read ${label}: ${errorMessage(error)}`, "file_read_failed");
  }

  try {
    return JSON.parse(stripBom(source));
  } catch (error) {
    throw new HumanReviewError(`${label} is not valid JSON: ${errorMessage(error)}`, "invalid_json");
  }
}

export function normalizeAttemptArtifact(artifact, { sourceDirectory = process.cwd() } = {}) {
  assertRecord(artifact, "Input artifact");
  const sourceArtifactFingerprint = fingerprintJson(artifact);

  if (Array.isArray(artifact.results)) {
    return normalizeLiveArtifact(artifact, sourceArtifactFingerprint, sourceDirectory);
  }
  if (Array.isArray(artifact.attempts)) {
    return normalizeScoredArtifact(artifact, sourceArtifactFingerprint, sourceDirectory);
  }

  throw new HumanReviewError(
    "Input must be a live artifact with results[] or a normalized/scored artifact with attempts[]. Aggregate reports without attempt outputs cannot be reviewed.",
    "unsupported_artifact"
  );
}

export function loadBenchmarkManifestBinding(manifestPath) {
  const resolvedManifestPath = path.resolve(manifestPath);
  let manifestBytes;
  try {
    manifestBytes = fs.readFileSync(resolvedManifestPath);
  } catch (error) {
    throw new HumanReviewError(
      `Could not read benchmark manifest: ${errorMessage(error)}`,
      "file_read_failed"
    );
  }
  let document;
  try {
    document = JSON.parse(stripBom(manifestBytes.toString("utf8")));
  } catch (error) {
    throw new HumanReviewError(
      `Benchmark manifest is not valid JSON: ${errorMessage(error)}`,
      "invalid_json"
    );
  }

  const manifestFingerprint = fingerprintBytes(manifestBytes);
  let holdoutIdentity = null;
  let lineageFingerprint = null;
  if (document?.status === "frozen") {
    const lineagePath = resolvedManifestPath.replace(/\.json$/u, ".lineage.json");
    if (lineagePath === resolvedManifestPath || !fs.existsSync(lineagePath)) {
      throw new HumanReviewError(
        "Frozen benchmark manifest is missing its lineage sidecar.",
        "missing_frozen_lineage"
      );
    }
    const lineageBytes = fs.readFileSync(lineagePath);
    let lineage;
    try {
      lineage = JSON.parse(stripBom(lineageBytes.toString("utf8")));
    } catch (error) {
      throw new HumanReviewError(
        `Frozen benchmark lineage is not valid JSON: ${errorMessage(error)}`,
        "invalid_frozen_lineage"
      );
    }
    const lineageDirectory = path.dirname(lineagePath);
    const declaredFrozenPath = resolveLineageFile(
      lineageDirectory,
      lineage.frozenManifestPath,
      "frozenManifestPath"
    );
    if (declaredFrozenPath !== resolvedManifestPath) {
      throw new HumanReviewError(
        "Frozen benchmark lineage does not identify the supplied manifest.",
        "frozen_lineage_mismatch"
      );
    }
    const candidatePath = resolveLineageFile(
      lineageDirectory,
      lineage.candidateManifestPath,
      "candidateManifestPath"
    );
    const approvalsPath = resolveLineageFile(
      lineageDirectory,
      lineage.approvalsPath,
      "approvalsPath"
    );
    const nearDuplicateAuditPath = resolveLineageFile(
      lineageDirectory,
      lineage.nearDuplicateAuditPath,
      "nearDuplicateAuditPath"
    );
    const developmentManifestPath = resolveLineageFile(
      lineageDirectory,
      lineage.developmentManifestPath,
      "developmentManifestPath"
    );
    const candidateBytes = readLineageFile(candidatePath, "frozen benchmark candidate");
    const approvalsBytes = readLineageFile(approvalsPath, "frozen benchmark approvals");
    const nearDuplicateAuditBytes = readLineageFile(
      nearDuplicateAuditPath,
      "frozen benchmark near-duplicate audit"
    );
    const developmentManifestBytes = readLineageFile(
      developmentManifestPath,
      "frozen benchmark development manifest"
    );
    if (
      fingerprintBytes(candidateBytes) !== normalizeFingerprint(
        lineage.candidateManifestSha256,
        "lineage candidate manifest fingerprint"
      ) ||
      fingerprintBytes(approvalsBytes) !== normalizeFingerprint(
        lineage.approvalsSha256,
        "lineage approvals fingerprint"
      ) ||
      fingerprintBytes(nearDuplicateAuditBytes) !== normalizeFingerprint(
        lineage.nearDuplicateAuditSha256,
        "lineage near-duplicate audit fingerprint"
      ) ||
      fingerprintBytes(developmentManifestBytes) !== normalizeFingerprint(
        lineage.developmentManifestSha256,
        "lineage development manifest fingerprint"
      )
    ) {
      throw new HumanReviewError(
        "Frozen benchmark candidate or approval bytes do not match the lineage.",
        "frozen_lineage_mismatch"
      );
    }
    holdoutIdentity = validateFrozenLineage(document, manifestFingerprint, lineage);
    lineageFingerprint = fingerprintBytes(lineageBytes);
  }

  return {
    document,
    binding: {
      manifestFingerprint,
      holdoutIdentity,
      lineageFingerprint,
      frozen: document?.status === "frozen"
    }
  };
}

function normalizeQuestionBenchmark(document, binding = null) {
  if (document === undefined || document === null) return null;
  const cases = Array.isArray(document) ? document : document.cases;
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new HumanReviewError("Benchmark manifest must contain a non-empty cases array.", "invalid_benchmark_manifest");
  }
  const casesById = new Map();
  for (const [index, benchmarkCase] of cases.entries()) {
    assertRecord(benchmarkCase, `Benchmark case ${index + 1}`);
    const caseId = firstString(benchmarkCase.id, benchmarkCase.caseId);
    if (!caseId || casesById.has(caseId)) {
      throw new HumanReviewError("Benchmark manifest case IDs must be unique and non-empty.", "invalid_benchmark_manifest");
    }
    casesById.set(caseId, benchmarkCase);
  }
  const manifestFingerprint = normalizeOptionalFingerprint(
    binding?.manifestFingerprint ?? fingerprintJson(document),
    "benchmark manifest fingerprint"
  );
  const holdoutIdentity = normalizeHoldoutIdentity(binding?.holdoutIdentity, {
    required: binding?.frozen === true
  });
  const lineageFingerprint = normalizeOptionalFingerprint(
    binding?.lineageFingerprint,
    "benchmark lineage fingerprint"
  );
  if (binding?.frozen === true && (!holdoutIdentity || !lineageFingerprint)) {
    throw new HumanReviewError(
      "Frozen benchmark binding must include verified holdout identity and lineage bytes.",
      "invalid_frozen_lineage"
    );
  }
  const requirementProjection = [...casesById.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
    .map(([caseId, benchmarkCase]) => {
      const expected = isRecord(benchmarkCase.expected)
        ? benchmarkCase.expected
        : isRecord(benchmarkCase.expectations)
          ? benchmarkCase.expectations
          : {};
      return {
        caseId,
        requiredQuestions: structuredClone(expected.requiredQuestions ?? [])
      };
    });
  const questionRequirementsFingerprint = fingerprintJson({
    manifestFingerprint,
    holdoutIdentity,
    requirementProjection
  });
  return {
    manifestFingerprint,
    holdoutIdentity,
    lineageFingerprint,
    frozen: binding?.frozen === true,
    questionRequirementsFingerprint,
    casesById
  };
}

export function createReviewBundle(artifact, options = {}) {
  const normalized = normalizeAttemptArtifact(artifact, options);
  const benchmark = normalizeQuestionBenchmark(options.benchmarkManifest, options.benchmarkBinding);
  normalized.sourceIdentity = bindSourceToBenchmark(normalized.sourceIdentity, benchmark);
  const itemDrafts = [];
  const attemptsForKey = [];
  let dishCount = 0;
  let dishesWithVisibleClaims = 0;
  let visibleClaimCount = 0;
  let restaurantTranslationCount = 0;
  let questionTranslationCount = 0;
  let questionIntentCount = 0;

  normalized.attempts.forEach((attempt, attemptIndex) => {
    const benchmarkCase = benchmark?.casesById.get(attempt.caseId) ?? null;
    if (benchmark && benchmarkCase === null) {
      throw new HumanReviewError(
        `Benchmark manifest has no case matching attempt ${attempt.caseId}.`,
        "missing_benchmark_case"
      );
    }
    const attemptRef = `A${String(attemptIndex + 1).padStart(3, "0")}`;
    const imageExtension = safeImageExtension(attempt.imagePath);
    const imageRef = attempt.imagePath ? `images/${attemptRef}${imageExtension}` : null;
    attemptsForKey.push({
      attemptRef,
      caseId: attempt.caseId,
      pass: attempt.pass,
      runFingerprint: normalized.sourceIdentity.runFingerprint,
      configurationFingerprint: normalized.sourceIdentity.configurationFingerprint,
      attemptFingerprint: fingerprintJson(attempt.output),
      sourceImagePath: attempt.imagePath,
      imageRef
    });
    const dishRefs = new Map();

    attempt.output.dishes.forEach((dish, dishIndex) => {
      dishCount += 1;
      const dishRef = `D${String(dishIndex + 1).padStart(2, "0")}`;
      dishRefs.set(normalizeDishName(dish.dishName), dishRef);
      const claims = dish.transparency.visibleMenuText;
      if (claims.length > 0) dishesWithVisibleClaims += 1;

      claims.forEach((claim, claimIndex) => {
        visibleClaimCount += 1;
        itemDrafts.push({
          prefix: "V",
          publicItem: {
            type: "visible_text_claim",
            attemptRef,
            dishRef,
            imageRef,
            claim,
            judgment: "",
            notes: ""
          },
          source: { attemptRef, caseId: attempt.caseId, pass: attempt.pass, dishIndex, claimIndex }
        });
      });

      const restaurantLanguage = translationLanguage(
        attempt.output.restaurantMessage?.language,
        attempt.restaurantLanguage
      );
      const userLanguage = translationLanguage(
        attempt.output.restaurantMessage?.userLanguage,
        attempt.userLanguage,
        attempt.output.analysisLanguage
      );
      const restaurantQuestions = dish.questionsToAsk;
      const userQuestions = dish.questionsToAskUserLanguage;
      if (translationIsIntended(userLanguage, restaurantLanguage, userQuestions, restaurantQuestions)) {
        const pairCount = Math.max(userQuestions.length, restaurantQuestions.length);
        for (let questionIndex = 0; questionIndex < pairCount; questionIndex += 1) {
          questionTranslationCount += 1;
          itemDrafts.push({
            prefix: "T",
            publicItem: {
              type: "translation_fidelity",
              translationKind: "staff_question",
              attemptRef,
              dishRef,
              sourceLanguage: userLanguage,
              targetLanguage: restaurantLanguage,
              sourceText: userQuestions[questionIndex] ?? "",
              targetText: restaurantQuestions[questionIndex] ?? "",
              judgment: "",
              notes: ""
            },
            source: { attemptRef, caseId: attempt.caseId, pass: attempt.pass, dishIndex, questionIndex }
          });
        }
      }
    });

    if (benchmarkCase) {
      const expected = isRecord(benchmarkCase.expected)
        ? benchmarkCase.expected
        : isRecord(benchmarkCase.expectations)
          ? benchmarkCase.expectations
          : {};
      const targets = buildQuestionIntentTargets(
        expected.requiredQuestions,
        attempt.output.dishes,
        benchmarkCase,
        {
          userLanguage: attempt.userLanguage,
          restaurantLanguage: attempt.restaurantLanguage
        },
        attempt.output
      );
      for (const target of targets) {
        questionIntentCount += 1;
        itemDrafts.push({
          prefix: "Q",
          publicItem: {
            type: "question_intent",
            attemptRef,
            dishRef: target.dishName === null
              ? null
              : dishRefs.get(normalizeDishName(target.dishName)) ?? null,
            requirementId: target.requirementId,
            intent: target.intent,
            allergens: target.allergens,
            requiredLanguage: target.requiredLanguage,
            requiredLanguageCode: target.requiredLanguageCode,
            questionChannel: target.questionChannel,
            questionField: target.questionField,
            actualLanguage: target.actualLanguage,
            questions: target.questions.map((question) => question.text),
            judgment: "",
            notes: ""
          },
          source: {
            attemptRef,
            caseId: attempt.caseId,
            pass: attempt.pass,
            requirementIndex: target.requirementIndex,
            channelIndex: target.channelIndex,
            targetIndex: target.targetIndex
          }
        });
      }
    }

    const message = attempt.output.restaurantMessage;
    if (message) {
      const englishText = cleanString(message.english);
      const userLanguage = translationLanguage(message.userLanguage, attempt.userLanguage, attempt.output.analysisLanguage);
      const userText = firstString(message.userLanguageText, message.english);
      const restaurantLanguage = translationLanguage(message.language, attempt.restaurantLanguage);
      const restaurantText = cleanString(message.translated);
      if (translationIsIntended("English", userLanguage, [englishText], [userText])) {
        restaurantTranslationCount += 1;
        itemDrafts.push({
          prefix: "T",
          publicItem: {
            type: "translation_fidelity",
            translationKind: "restaurant_message_user_language",
            attemptRef,
            dishRef: null,
            sourceLanguage: "English",
            targetLanguage: userLanguage,
            sourceText: englishText,
            targetText: userText,
            judgment: "",
            notes: ""
          },
          source: { attemptRef, caseId: attempt.caseId, pass: attempt.pass, messageIndex: 0, channel: "user" }
        });
      }
      if (translationIsIntended(userLanguage, restaurantLanguage, [userText], [restaurantText])) {
        restaurantTranslationCount += 1;
        itemDrafts.push({
          prefix: "T",
          publicItem: {
            type: "translation_fidelity",
            translationKind: "restaurant_message_staff_language",
            attemptRef,
            dishRef: null,
            sourceLanguage: userLanguage,
            targetLanguage: restaurantLanguage,
            sourceText: userText,
            targetText: restaurantText,
            judgment: "",
            notes: ""
          },
          source: { attemptRef, caseId: attempt.caseId, pass: attempt.pass, messageIndex: 0, channel: "staff" }
        });
      }
    }
  });

  if (itemDrafts.length === 0) {
    throw new HumanReviewError(
      "The artifact contains no visible-text claims, translation pairs, or question-intent targets to review.",
      "empty_review_set"
    );
  }

  const sourceSeed = {
    sourceArtifactFingerprint: normalized.sourceIdentity.sourceArtifactFingerprint,
    runFingerprint: normalized.sourceIdentity.runFingerprint,
    configurationFingerprint: normalized.sourceIdentity.configurationFingerprint,
    questionRequirementsFingerprint: normalized.sourceIdentity.questionRequirementsFingerprint,
    reviewLineageFingerprint: normalized.sourceIdentity.reviewLineageFingerprint,
    itemDrafts: itemDrafts.map(({ prefix, publicItem }) => ({ prefix, item: immutableItem(publicItem) }))
  };
  const reviewSetId = `review-${fingerprintJson(sourceSeed).slice(7, 19)}`;
  const publicItems = itemDrafts.map((draft, index) => {
    const ordinal = String(index + 1).padStart(4, "0");
    const itemHash = fingerprintJson({ reviewSetId, index, item: immutableItem(draft.publicItem) }).slice(7, 15);
    return { itemId: `${draft.prefix}-${ordinal}-${itemHash}`, ...draft.publicItem };
  });

  const instructions = {
    blinding: "Do not use benchmark labels, risk scores, model identity, or configuration details while adjudicating.",
    visibleTextClaim: {
      supported: "The claim is readable in the supplied menu image and preserves its meaning.",
      unsupported: "The claim is not present in the readable image or materially adds text that is not visible.",
      unreadable: "The relevant image region cannot be adjudicated because it is unreadable or unavailable."
    },
    translationFidelity: {
      faithful: "The target preserves the source allergy, dish, preparation, severity, and uncertainty meaning.",
      material_error: "The target omits, adds, or changes meaning in a way that could affect restaurant communication.",
      unreviewable: "The reviewer cannot responsibly judge this language pair or the source/target is unavailable."
    },
    questionIntent: {
      meets_intent: "The questions in this one language channel collectively satisfy the stated intent and mention every required allergen.",
      misses_intent: "The questions are absent, irrelevant, use the wrong language channel, or omit part of the stated intent or required allergens.",
      unreviewable: "The reviewer cannot responsibly judge the question language or meaning."
    }
  };
  const templateCore = {
    formatVersion: HUMAN_REVIEW_FORMAT_VERSION,
    artifactType: "sift-human-adjudication-template",
    reviewSetId,
    instructions,
    items: publicItems.map(immutableItem)
  };
  const reviewSetFingerprint = fingerprintJson(templateCore);
  const keyBase = {
    formatVersion: HUMAN_REVIEW_FORMAT_VERSION,
    artifactType: "sift-human-adjudication-key",
    reviewSetId,
    reviewSetFingerprint,
    sourceIdentity: normalized.sourceIdentity,
    coverage: {
      attempts: normalized.attempts.length,
      dishes: dishCount,
      dishesWithVisibleClaims,
      visibleTextClaims: visibleClaimCount,
      restaurantMessageTranslations: restaurantTranslationCount,
      staffQuestionTranslations: questionTranslationCount,
      questionIntentItems: questionIntentCount,
      questionRequirementsBound: benchmark !== null,
      benchmarkManifestBound: normalized.sourceIdentity.benchmarkManifestBound,
      frozenHoldoutLineageBound: normalized.sourceIdentity.frozenHoldoutLineageBound,
      reviewLineageBound: normalized.sourceIdentity.reviewLineageBound === true,
      totalReviewItems: publicItems.length
    },
    attempts: attemptsForKey,
    items: publicItems.map((item, index) => ({
      itemId: item.itemId,
      type: item.type,
      contentFingerprint: fingerprintJson(immutableItem(item)),
      source: itemDrafts[index].source
    }))
  };
  const keyFingerprint = fingerprintJson(keyBase);
  const key = { ...keyBase, keyFingerprint };
  const template = {
    ...templateCore,
    reviewSetFingerprint,
    keyFingerprint,
    reviewer: { id: "", startedAt: "", completedAt: "" },
    items: publicItems
  };

  return { template, key };
}

export function writeReviewBundle(bundle, outputDirectory) {
  assertRecord(bundle, "Review bundle");
  assertRecord(bundle.template, "Review template");
  assertRecord(bundle.key, "Review key");
  const directory = path.resolve(outputDirectory);
  if (fs.existsSync(directory) && fs.readdirSync(directory).length > 0) {
    throw new HumanReviewError(`Refusing to replace non-empty review directory ${directory}.`, "output_exists");
  }
  fs.mkdirSync(path.join(directory, "images"), { recursive: true });

  for (const attempt of bundle.key.attempts) {
    if (!attempt.imageRef || !attempt.sourceImagePath) continue;
    if (!fs.existsSync(attempt.sourceImagePath) || !fs.statSync(attempt.sourceImagePath).isFile()) continue;
    fs.copyFileSync(attempt.sourceImagePath, path.join(directory, attempt.imageRef));
  }

  const templatePath = path.join(directory, "review-template.json");
  const keyPath = path.join(directory, "review-key.json");
  writeJsonAtomic(templatePath, bundle.template);
  writeJsonAtomic(keyPath, bundle.key);
  return { outputDirectory: directory, templatePath, keyPath };
}

export function scoreReview(template, key) {
  validateKey(key);
  validateTemplateShape(template);
  if (template.reviewSetId !== key.reviewSetId || template.reviewSetFingerprint !== key.reviewSetFingerprint) {
    throw new HumanReviewError("Template and key identify different review sets.", "review_identity_mismatch");
  }
  if (template.keyFingerprint !== key.keyFingerprint) {
    throw new HumanReviewError("Template key fingerprint does not match the sealed key.", "key_fingerprint_mismatch");
  }

  const keyItems = new Map(key.items.map((item) => [item.itemId, item]));
  if (template.items.length !== key.items.length || new Set(template.items.map((item) => item.itemId)).size !== template.items.length) {
    throw new HumanReviewError("Review item coverage is incomplete or contains duplicate IDs.", "incomplete_review");
  }

  const recomputedCore = {
    formatVersion: template.formatVersion,
    artifactType: template.artifactType,
    reviewSetId: template.reviewSetId,
    instructions: template.instructions,
    items: template.items.map(immutableItem)
  };
  if (fingerprintJson(recomputedCore) !== key.reviewSetFingerprint) {
    throw new HumanReviewError("Reviewer-facing item content or instructions were altered.", "template_content_mismatch");
  }

  for (const item of template.items) {
    const expected = keyItems.get(item.itemId);
    if (!expected || fingerprintJson(immutableItem(item)) !== expected.contentFingerprint) {
      throw new HumanReviewError(`Review item ${item.itemId} is missing, unexpected, or altered.`, "item_coverage_mismatch");
    }
  }
  for (const itemId of keyItems.keys()) {
    if (!template.items.some((item) => item.itemId === itemId)) {
      throw new HumanReviewError(`Review item ${itemId} is missing.`, "incomplete_review");
    }
  }

  const reviewer = validateReviewer(template.reviewer);
  const visibleCounts = { supported: 0, unsupported: 0, unreadable: 0 };
  const translationItems = [];
  const questionIntentItems = [];

  for (const item of template.items) {
    validateNotes(item.notes, item.itemId);
    if (item.type === "visible_text_claim") {
      if (!VISIBLE_TEXT_JUDGMENTS.includes(item.judgment)) {
        throw new HumanReviewError(`Visible-text item ${item.itemId} is not adjudicated.`, "incomplete_review");
      }
      visibleCounts[item.judgment] += 1;
      continue;
    }
    if (item.type === "translation_fidelity") {
      if (!TRANSLATION_JUDGMENTS.includes(item.judgment)) {
        throw new HumanReviewError(`Translation item ${item.itemId} is not adjudicated.`, "incomplete_review");
      }
      translationItems.push(item);
      continue;
    }
    if (item.type === "question_intent") {
      if (!QUESTION_INTENT_JUDGMENTS.includes(item.judgment)) {
        throw new HumanReviewError(`Question-intent item ${item.itemId} is not adjudicated.`, "incomplete_review");
      }
      questionIntentItems.push(item);
      continue;
    }
    throw new HumanReviewError(`Review item ${item.itemId} has an unsupported type.`, "unsupported_review_item");
  }

  const visibleDenominator = visibleCounts.supported + visibleCounts.unsupported;
  const translationOverall = summarizeTranslations(translationItems);
  const restaurantMessages = summarizeTranslations(
    translationItems.filter((item) => item.translationKind.startsWith("restaurant_message"))
  );
  const staffQuestions = summarizeTranslations(
    translationItems.filter((item) => item.translationKind === "staff_question")
  );
  const questionIntent = summarizeQuestionIntents(questionIntentItems);
  const coverage = {
    expectedItems: key.coverage.totalReviewItems,
    reviewedItems: template.items.length,
    complete: template.items.length === key.coverage.totalReviewItems,
    visibleTextItems: key.coverage.visibleTextClaims,
    translationItems: key.coverage.restaurantMessageTranslations + key.coverage.staffQuestionTranslations,
    questionIntentItems: key.coverage.questionIntentItems,
    questionIntentAssessableItems: questionIntent.denominator,
    questionIntentCoverage: questionIntent.coverage
  };
  const visibleTextHallucination = {
    counts: visibleCounts,
    numerator: visibleCounts.unsupported,
    denominator: visibleDenominator,
    rate: ratio(visibleCounts.unsupported, visibleDenominator),
    wilson95: wilsonInterval(visibleCounts.unsupported, visibleDenominator),
    excludedUnreadable: visibleCounts.unreadable
  };
  const releaseGate = evaluateHumanReviewReleaseGate({
    visibleCounts,
    translationOverall,
    questionIntent,
    coverage,
    key
  });

  return {
    formatVersion: HUMAN_REVIEW_FORMAT_VERSION,
    reportType: "sift-human-adjudication-report",
    reviewSetId: key.reviewSetId,
    reviewSetFingerprint: key.reviewSetFingerprint,
    keyFingerprint: key.keyFingerprint,
    sourceIdentity: key.sourceIdentity,
    reviewer,
    scoredAt: reviewer.completedAt,
    coverage,
    visibleTextHallucination,
    translationFidelity: {
      overall: translationOverall,
      restaurantMessages,
      staffQuestions
    },
    questionIntent,
    releaseGate
  };
}

export function wilsonInterval(successes, total, z = 1.959963984540054) {
  if (!Number.isInteger(successes) || !Number.isInteger(total) || successes < 0 || total < 0 || successes > total) {
    throw new HumanReviewError("Wilson interval inputs must be integer counts with 0 <= successes <= total.", "invalid_metric_counts");
  }
  if (total === 0) return null;
  const proportion = successes / total;
  const zSquared = z * z;
  const denominator = 1 + zSquared / total;
  const center = (proportion + zSquared / (2 * total)) / denominator;
  const margin = (z / denominator) * Math.sqrt((proportion * (1 - proportion) / total) + (zSquared / (4 * total * total)));
  return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

export function writeJsonAtomic(filePath, value) {
  const target = path.resolve(filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(target)) {
    const current = fs.readFileSync(target, "utf8");
    if (current === payload) return target;
    throw new HumanReviewError(`Refusing to replace existing file ${target}.`, "output_exists");
  }
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, payload, { encoding: "utf8", flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
  return target;
}

function normalizeLiveArtifact(artifact, sourceArtifactFingerprint, sourceDirectory) {
  const runId = cleanString(artifact.phase);
  const runFingerprint = normalizeFingerprint(artifact.inputIdentity?.sha256, "live input identity");
  const rootConfiguration = extractRootLiveConfiguration(artifact);
  const configurationFingerprint = normalizeFingerprint(rootConfiguration, "live configuration");
  const benchmarkManifestFingerprint = normalizeOptionalFingerprint(
    artifact.inputIdentity?.benchmarkManifestSha256,
    "live benchmark manifest fingerprint"
  );
  const holdoutIdentity = normalizeHoldoutIdentity(artifact.inputIdentity?.holdoutIdentity);
  const attempts = artifact.results.map((result, index) => {
    assertRecord(result, `Live result ${index + 1}`);
    const resultRunFingerprint = normalizeFingerprint(result.inputIdentitySha256, `live result ${index + 1} input identity`);
    const resultConfiguration = extractResultLiveConfiguration(result);
    const resultConfigurationFingerprint = normalizeFingerprint(resultConfiguration, `live result ${index + 1} configuration`);
    if (resultRunFingerprint !== runFingerprint || resultConfigurationFingerprint !== configurationFingerprint) {
      throw new HumanReviewError("Live artifact mixes run or configuration fingerprints.", "mixed_source_identity");
    }
    return normalizeAttempt(result, index, sourceDirectory, { runFingerprint, configurationFingerprint });
  });
  return finalizeNormalizedArtifact({
    sourceKind: "live",
    runId,
    runFingerprint,
    configurationFingerprint,
    benchmarkManifestFingerprint,
    holdoutIdentity,
    sourceArtifactFingerprint,
    attempts
  });
}

function normalizeScoredArtifact(artifact, sourceArtifactFingerprint, sourceDirectory) {
  const runId = firstString(artifact.runId, artifact.phase);
  const runFingerprint = normalizeFingerprint(
    firstString(artifact.runFingerprint, artifact.inputIdentity?.sha256, artifact.identity?.caseSetFingerprint),
    "scored run fingerprint"
  );
  const configurationFingerprint = normalizeFingerprint(
    firstString(
      artifact.configurationFingerprint,
      artifact.identity?.fingerprints?.config,
      artifact.configurationProvenance?.fields?.configuration?.value
    ),
    "scored configuration fingerprint"
  );
  const benchmarkManifestFingerprint = normalizeOptionalFingerprint(
    firstString(
      artifact.sourceManifestSha256,
      artifact.identity?.sourceManifestSha256,
      artifact.inputIdentity?.benchmarkManifestSha256
    ),
    "scored benchmark manifest fingerprint"
  );
  const holdoutIdentity = normalizeHoldoutIdentity(
    artifact.holdoutIdentity ?? artifact.identity?.holdoutIdentity ?? artifact.inputIdentity?.holdoutIdentity
  );
  const attempts = artifact.attempts.map((attempt, index) => {
    assertRecord(attempt, `Scored attempt ${index + 1}`);
    if (!isRecord(attempt.output)) {
      throw new HumanReviewError(
        `Scored attempt ${index + 1} has no normalized output. Aggregate manual reports are not sufficient; export reviewable attempt outputs.`,
        "missing_attempt_output"
      );
    }
    if (!attempt.runFingerprint || !attempt.configurationFingerprint) {
      throw new HumanReviewError(
        `Scored attempt ${index + 1} must declare runFingerprint and configurationFingerprint.`,
        "missing_source_identity"
      );
    }
    if (normalizeFingerprint(attempt.runFingerprint, "attempt run fingerprint") !== runFingerprint) {
      throw new HumanReviewError("Scored artifact mixes run fingerprints.", "mixed_source_identity");
    }
    if (normalizeFingerprint(attempt.configurationFingerprint, "attempt configuration fingerprint") !== configurationFingerprint) {
      throw new HumanReviewError("Scored artifact mixes configuration fingerprints.", "mixed_source_identity");
    }
    return normalizeAttempt(attempt, index, sourceDirectory, { runFingerprint, configurationFingerprint });
  });
  return finalizeNormalizedArtifact({
    sourceKind: "scored",
    runId,
    runFingerprint,
    configurationFingerprint,
    benchmarkManifestFingerprint,
    holdoutIdentity,
    sourceArtifactFingerprint,
    attempts
  });
}

function finalizeNormalizedArtifact({
  sourceKind,
  runId,
  runFingerprint,
  configurationFingerprint,
  benchmarkManifestFingerprint,
  holdoutIdentity,
  sourceArtifactFingerprint,
  attempts
}) {
  if (!runId) throw new HumanReviewError("Input artifact is missing a run ID or phase.", "missing_run_id");
  if (attempts.length === 0) throw new HumanReviewError("Input artifact contains no attempts.", "empty_attempts");
  const seen = new Set();
  for (const attempt of attempts) {
    const key = `${attempt.caseId}\u0000${attempt.pass}`;
    if (seen.has(key)) throw new HumanReviewError(`Duplicate attempt ${attempt.caseId} pass ${attempt.pass}.`, "duplicate_attempt");
    seen.add(key);
  }
  attempts.sort((left, right) => left.caseId.localeCompare(right.caseId, "en", { numeric: true }) || left.pass - right.pass);
  return {
    sourceIdentity: {
      sourceKind,
      runId,
      runFingerprint,
      configurationFingerprint,
      benchmarkManifestFingerprint,
      holdoutIdentity,
      sourceArtifactFingerprint
    },
    attempts
  };
}

function normalizeAttempt(attempt, index, sourceDirectory, identities) {
  const output = attempt.output;
  assertRecord(output, `Attempt ${index + 1} output`);
  if (!Array.isArray(output.dishes)) {
    throw new HumanReviewError(`Attempt ${index + 1} output is missing dishes[].`, "invalid_normalized_output");
  }
  const dishes = output.dishes.map((dish, dishIndex) => normalizeDish(dish, index, dishIndex));
  const caseId = cleanString(attempt.caseId);
  const pass = Number(attempt.pass ?? 1);
  if (!caseId || !Number.isInteger(pass) || pass < 1) {
    throw new HumanReviewError(`Attempt ${index + 1} has an invalid case ID or pass.`, "invalid_attempt_identity");
  }
  const rawImagePath = firstString(attempt.inputImage?.outputPath, attempt.imagePath);
  const imagePath = resolveLocalPath(rawImagePath, sourceDirectory);
  return {
    caseId,
    pass,
    runFingerprint: identities.runFingerprint,
    configurationFingerprint: identities.configurationFingerprint,
    imagePath,
    userLanguage: cleanString(attempt.userLanguage),
    restaurantLanguage: cleanString(attempt.restaurantLanguage),
    output: {
      analysisLanguage: cleanString(output.analysisLanguage),
      dishes,
      restaurantMessage: normalizeRestaurantMessage(output.restaurantMessage)
    }
  };
}

function normalizeDish(dish, attemptIndex, dishIndex) {
  assertRecord(dish, `Attempt ${attemptIndex + 1} dish ${dishIndex + 1}`);
  if (!isRecord(dish.transparency) || !Array.isArray(dish.transparency.visibleMenuText)) {
    throw new HumanReviewError(
      `Attempt ${attemptIndex + 1} dish ${dishIndex + 1} is not a normalized dish with transparency.visibleMenuText[].`,
      "invalid_normalized_output"
    );
  }
  return {
    dishName: firstString(dish.dishName, dish.name, `Dish ${dishIndex + 1}`),
    transparency: {
      visibleMenuText: normalizeStringArray(dish.transparency.visibleMenuText, "visibleMenuText")
    },
    questionsToAsk: normalizeStringArray(dish.questionsToAsk ?? [], "questionsToAsk", { allowEmpty: true }),
    questionsToAskUserLanguage: normalizeStringArray(
      dish.questionsToAskUserLanguage ?? [],
      "questionsToAskUserLanguage",
      { allowEmpty: true }
    )
  };
}

function normalizeRestaurantMessage(message) {
  if (message === undefined || message === null) return null;
  assertRecord(message, "restaurantMessage");
  return {
    english: cleanString(message.english),
    translated: cleanString(message.translated),
    language: cleanString(message.language),
    userLanguageText: cleanString(message.userLanguageText),
    userLanguage: cleanString(message.userLanguage)
  };
}

function extractRootLiveConfiguration(artifact) {
  const direct = artifact.configurationFingerprint;
  const fields = artifact.configurationProvenance?.fields;
  if (direct) return direct;
  if (fields?.configuration?.value) return fields.configuration.value;
  const observed = artifact.configurationProvenance?.observed;
  const configuration = Array.isArray(observed) ? observed.find((item) => item?.field === "configuration") : null;
  if (configuration?.value) return configuration.value;
  const first = artifact.results?.[0];
  return extractResultLiveConfiguration(first);
}

function extractResultLiveConfiguration(result) {
  return firstString(
    result?.configurationFingerprint,
    result?.configurationProvenance?.fields?.configuration?.value,
    result?.output?.analysisConfigurationHash
  );
}

function validateFrozenLineage(document, manifestFingerprint, lineage) {
  assertRecord(document, "Frozen benchmark manifest");
  assertRecord(lineage, "Frozen benchmark lineage");
  if (!cleanString(lineage.schemaVersion) || lineage.pathBase !== "lineage_directory") {
    throw new HumanReviewError(
      "Frozen benchmark lineage schema metadata is invalid.",
      "invalid_frozen_lineage"
    );
  }
  if (document.status !== "frozen" || document.split !== "test") {
    throw new HumanReviewError(
      "Release human review requires a frozen test-split benchmark manifest.",
      "invalid_frozen_lineage"
    );
  }
  const frozenManifestSha256 = normalizeFingerprint(
    lineage.frozenManifestSha256,
    "lineage frozen manifest fingerprint"
  );
  const candidateManifestSha256 = normalizeFingerprint(
    lineage.candidateManifestSha256,
    "lineage candidate manifest fingerprint"
  );
  const approvalsSha256 = normalizeFingerprint(
    lineage.approvalsSha256,
    "lineage approvals fingerprint"
  );
  const nearDuplicateAuditSha256 = normalizeFingerprint(
    lineage.nearDuplicateAuditSha256,
    "lineage near-duplicate audit fingerprint"
  );
  const developmentManifestSha256 = normalizeFingerprint(
    lineage.developmentManifestSha256,
    "lineage development manifest fingerprint"
  );
  if (frozenManifestSha256 !== manifestFingerprint) {
    throw new HumanReviewError(
      "Frozen benchmark bytes do not match the lineage fingerprint.",
      "frozen_lineage_mismatch"
    );
  }
  if (
    normalizeFingerprint(document.promotion?.candidateManifestSha256, "promotion candidate manifest fingerprint") !== candidateManifestSha256 ||
    normalizeFingerprint(document.promotion?.approvalsSha256, "promotion approvals fingerprint") !== approvalsSha256 ||
    normalizeFingerprint(
      document.promotion?.nearDuplicateAuditSha256,
      "promotion near-duplicate audit fingerprint"
    ) !== nearDuplicateAuditSha256 ||
    normalizeFingerprint(
      document.promotion?.developmentManifestSha256,
      "promotion development manifest fingerprint"
    ) !== developmentManifestSha256
  ) {
    throw new HumanReviewError(
      "Frozen benchmark promotion metadata does not match its lineage.",
      "frozen_lineage_mismatch"
    );
  }
  const cases = Array.isArray(document.cases) ? document.cases : [];
  const groupCount = new Set(cases.map((testCase) => cleanString(testCase?.groupId))).size;
  if (
    !Number.isInteger(lineage.caseCount) ||
    !Number.isInteger(lineage.groupCount) ||
    lineage.caseCount !== cases.length ||
    lineage.groupCount !== groupCount
  ) {
    throw new HumanReviewError(
      "Frozen benchmark case or group counts do not match its lineage.",
      "frozen_lineage_mismatch"
    );
  }
  const promotionPolicyVersion = cleanString(lineage.promotionPolicyVersion);
  const reviewPolicyVersion = cleanString(lineage.reviewPolicyVersion);
  if (
    !promotionPolicyVersion ||
    !reviewPolicyVersion ||
    cleanString(document.promotion?.promotionPolicyVersion) !== promotionPolicyVersion ||
    cleanString(document.promotion?.reviewPolicyVersion) !== reviewPolicyVersion
  ) {
    throw new HumanReviewError("Frozen benchmark promotion policy metadata is invalid.", "invalid_frozen_lineage");
  }
  return {
    promotionPolicyVersion,
    reviewPolicyVersion,
    candidateManifestSha256,
    approvalsSha256,
    nearDuplicateAuditSha256,
    developmentManifestSha256,
    frozenManifestSha256
  };
}

function bindSourceToBenchmark(sourceIdentity, benchmark) {
  const base = structuredClone(sourceIdentity);
  if (!benchmark) {
    return {
      ...base,
      benchmarkLineageFingerprint: null,
      questionRequirementsFingerprint: null,
      benchmarkManifestBound: false,
      frozenHoldoutLineageBound: false,
      reviewLineageBound: false,
      reviewLineageFingerprint: null
    };
  }

  const sourceManifestFingerprint = base.benchmarkManifestFingerprint;
  if (sourceManifestFingerprint && sourceManifestFingerprint !== benchmark.manifestFingerprint) {
    throw new HumanReviewError(
      "Attempt artifact and benchmark manifest fingerprints do not match.",
      "benchmark_source_mismatch"
    );
  }
  const benchmarkManifestBound = sourceManifestFingerprint === benchmark.manifestFingerprint;
  if (base.holdoutIdentity && benchmark.holdoutIdentity) {
    if (canonicalJson(base.holdoutIdentity) !== canonicalJson(benchmark.holdoutIdentity)) {
      throw new HumanReviewError(
        "Attempt artifact and frozen holdout lineage identities do not match.",
        "holdout_lineage_mismatch"
      );
    }
  }
  const frozenHoldoutLineageBound = benchmark.frozen === true
    && base.holdoutIdentity !== null
    && benchmark.holdoutIdentity !== null
    && canonicalJson(base.holdoutIdentity) === canonicalJson(benchmark.holdoutIdentity)
    && isFingerprint(benchmark.lineageFingerprint);
  const reviewLineageBound = benchmarkManifestBound && frozenHoldoutLineageBound;
  const reviewLineageFingerprint = fingerprintJson({
    sourceArtifactFingerprint: base.sourceArtifactFingerprint,
    runFingerprint: base.runFingerprint,
    configurationFingerprint: base.configurationFingerprint,
    benchmarkManifestFingerprint: benchmark.manifestFingerprint,
    benchmarkLineageFingerprint: benchmark.lineageFingerprint,
    holdoutIdentity: benchmark.holdoutIdentity,
    questionRequirementsFingerprint: benchmark.questionRequirementsFingerprint
  });
  return {
    ...base,
    benchmarkManifestFingerprint: benchmark.manifestFingerprint,
    benchmarkLineageFingerprint: benchmark.lineageFingerprint,
    holdoutIdentity: benchmark.holdoutIdentity,
    questionRequirementsFingerprint: benchmark.questionRequirementsFingerprint,
    benchmarkManifestBound,
    frozenHoldoutLineageBound,
    reviewLineageBound,
    reviewLineageFingerprint
  };
}

function normalizeHoldoutIdentity(value, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new HumanReviewError("Frozen holdout identity is required.", "missing_frozen_lineage");
    }
    return null;
  }
  assertRecord(value, "Holdout identity");
  const promotionPolicyVersion = cleanString(value.promotionPolicyVersion);
  const reviewPolicyVersion = cleanString(value.reviewPolicyVersion);
  if (!promotionPolicyVersion || !reviewPolicyVersion) {
    throw new HumanReviewError(
      "Holdout identity promotionPolicyVersion and reviewPolicyVersion are required.",
      "invalid_frozen_lineage"
    );
  }
  return {
    promotionPolicyVersion,
    reviewPolicyVersion,
    candidateManifestSha256: normalizeFingerprint(
      value.candidateManifestSha256,
      "holdout candidate manifest fingerprint"
    ),
    approvalsSha256: normalizeFingerprint(value.approvalsSha256, "holdout approvals fingerprint"),
    nearDuplicateAuditSha256: normalizeFingerprint(
      value.nearDuplicateAuditSha256,
      "holdout near-duplicate audit fingerprint"
    ),
    developmentManifestSha256: normalizeFingerprint(
      value.developmentManifestSha256,
      "holdout development manifest fingerprint"
    ),
    frozenManifestSha256: normalizeFingerprint(
      value.frozenManifestSha256,
      "holdout frozen manifest fingerprint"
    )
  };
}

function validateKey(key) {
  assertRecord(key, "Review key");
  if (key.formatVersion !== HUMAN_REVIEW_FORMAT_VERSION || key.artifactType !== "sift-human-adjudication-key") {
    throw new HumanReviewError("Unsupported review key format.", "unsupported_key_format");
  }
  const suppliedFingerprint = key.keyFingerprint;
  const keyBase = { ...key };
  delete keyBase.keyFingerprint;
  if (!isFingerprint(suppliedFingerprint) || fingerprintJson(keyBase) !== suppliedFingerprint) {
    throw new HumanReviewError("Review key fingerprint is invalid.", "invalid_key_fingerprint");
  }
  assertRecord(key.sourceIdentity, "Review key source identity");
  const runFingerprint = normalizeFingerprint(key.sourceIdentity.runFingerprint, "key run fingerprint");
  const configurationFingerprint = normalizeFingerprint(
    key.sourceIdentity.configurationFingerprint,
    "key configuration fingerprint"
  );
  const sourceArtifactFingerprint = normalizeFingerprint(
    key.sourceIdentity.sourceArtifactFingerprint,
    "key source artifact fingerprint"
  );
  if (!Array.isArray(key.attempts) || !Array.isArray(key.items) || !isRecord(key.coverage)) {
    throw new HumanReviewError("Review key is incomplete.", "invalid_key");
  }
  for (const attempt of key.attempts) {
    if (
      normalizeFingerprint(attempt.runFingerprint, "key attempt run fingerprint") !== runFingerprint ||
      normalizeFingerprint(attempt.configurationFingerprint, "key attempt configuration fingerprint") !== configurationFingerprint
    ) {
      throw new HumanReviewError("Review key mixes run or configuration fingerprints.", "mixed_source_identity");
    }
  }
  if (key.coverage.totalReviewItems !== key.items.length) {
    throw new HumanReviewError("Review key item coverage is inconsistent.", "invalid_key_coverage");
  }
  if (!Number.isInteger(key.coverage.questionIntentItems) || key.coverage.questionIntentItems < 0) {
    throw new HumanReviewError("Review key question-intent coverage is invalid.", "invalid_key_coverage");
  }
  if (key.coverage.questionRequirementsBound === true) {
    if (!isFingerprint(key.sourceIdentity.questionRequirementsFingerprint)) {
      throw new HumanReviewError(
        "Question requirements fingerprint is invalid.",
        "invalid_question_requirements_fingerprint"
      );
    }
  } else if (key.coverage.questionIntentItems > 0) {
    throw new HumanReviewError(
      "Question-intent items are not bound to benchmark requirements.",
      "unbound_question_requirements"
    );
  }
  if (key.coverage.reviewLineageBound === true) {
    if (
      key.coverage.benchmarkManifestBound !== true ||
      key.coverage.frozenHoldoutLineageBound !== true ||
      key.coverage.questionRequirementsBound !== true
    ) {
      throw new HumanReviewError(
        "Review lineage cannot be bound without benchmark, frozen holdout, and question-requirement bindings.",
        "invalid_review_lineage"
      );
    }
  }
  const benchmarkManifestFingerprint = normalizeOptionalFingerprint(
    key.sourceIdentity.benchmarkManifestFingerprint,
    "key benchmark manifest fingerprint"
  );
  const benchmarkLineageFingerprint = normalizeOptionalFingerprint(
    key.sourceIdentity.benchmarkLineageFingerprint,
    "key benchmark lineage fingerprint"
  );
  const holdoutIdentity = normalizeHoldoutIdentity(key.sourceIdentity.holdoutIdentity);
  const questionRequirementsFingerprint = normalizeOptionalFingerprint(
    key.sourceIdentity.questionRequirementsFingerprint,
    "key question requirements fingerprint"
  );
  const expectedReviewLineageFingerprint = fingerprintJson({
    sourceArtifactFingerprint,
    runFingerprint,
    configurationFingerprint,
    benchmarkManifestFingerprint,
    benchmarkLineageFingerprint,
    holdoutIdentity,
    questionRequirementsFingerprint
  });
  if (
    key.coverage.questionRequirementsBound === true &&
    key.sourceIdentity.reviewLineageFingerprint !== expectedReviewLineageFingerprint
  ) {
    throw new HumanReviewError(
      "Review lineage fingerprint does not match the sealed source, run, configuration, benchmark, and question requirements.",
      "invalid_review_lineage"
    );
  }
  const ids = key.items.map((item) => item?.itemId);
  if (ids.some((id) => !cleanString(id)) || new Set(ids).size !== ids.length) {
    throw new HumanReviewError("Review key contains missing or duplicate item IDs.", "invalid_key_coverage");
  }
}

function validateTemplateShape(template) {
  assertRecord(template, "Review template");
  assertExactKeys(template, TEMPLATE_KEYS, "review template");
  if (
    template.formatVersion !== HUMAN_REVIEW_FORMAT_VERSION ||
    template.artifactType !== "sift-human-adjudication-template" ||
    !Array.isArray(template.items)
  ) {
    throw new HumanReviewError("Unsupported review template format.", "unsupported_template_format");
  }
  template.items.forEach((item, index) => {
    assertRecord(item, `Review item ${index + 1}`);
    assertExactKeys(item, ITEM_KEYS, `review item ${item.itemId ?? index + 1}`, { allowMissing: true });
  });
}

function validateReviewer(reviewer) {
  assertRecord(reviewer, "Reviewer metadata");
  const id = cleanString(reviewer.id);
  const startedAt = cleanString(reviewer.startedAt);
  const completedAt = cleanString(reviewer.completedAt);
  if (!REVIEWER_ID_PATTERN.test(id)) {
    throw new HumanReviewError("Reviewer ID is required and may use letters, numbers, dots, underscores, @, or hyphens.", "invalid_reviewer_id");
  }
  if (!validIsoTimestamp(startedAt) || !validIsoTimestamp(completedAt)) {
    throw new HumanReviewError("Reviewer startedAt and completedAt must be valid ISO-8601 timestamps.", "invalid_review_timestamps");
  }
  if (Date.parse(completedAt) < Date.parse(startedAt)) {
    throw new HumanReviewError("Reviewer completedAt must not precede startedAt.", "invalid_review_timestamps");
  }
  return { id, startedAt, completedAt };
}

function summarizeTranslations(items) {
  const counts = { faithful: 0, materialError: 0, unreviewable: 0 };
  for (const item of items) {
    if (item.judgment === "faithful") counts.faithful += 1;
    else if (item.judgment === "material_error") counts.materialError += 1;
    else if (item.judgment === "unreviewable") counts.unreviewable += 1;
  }
  const denominator = counts.faithful + counts.materialError;
  return {
    counts,
    denominator,
    fidelityRate: ratio(counts.faithful, denominator),
    materialErrorRate: ratio(counts.materialError, denominator),
    fidelityWilson95: wilsonInterval(counts.faithful, denominator),
    materialErrorWilson95: wilsonInterval(counts.materialError, denominator),
    excludedUnreviewable: counts.unreviewable
  };
}

function summarizeQuestionIntents(items) {
  const counts = { meetsIntent: 0, missesIntent: 0, unreviewable: 0 };
  let emptyQuestionItems = 0;
  for (const item of items) {
    if (item.judgment === "meets_intent") counts.meetsIntent += 1;
    else if (item.judgment === "misses_intent") counts.missesIntent += 1;
    else if (item.judgment === "unreviewable") counts.unreviewable += 1;
    if (!Array.isArray(item.questions) || item.questions.length === 0) emptyQuestionItems += 1;
  }
  const denominator = counts.meetsIntent + counts.missesIntent;
  return {
    counts,
    total: items.length,
    denominator,
    coverage: ratio(denominator, items.length),
    passRate: ratio(counts.meetsIntent, denominator),
    missRate: ratio(counts.missesIntent, denominator),
    passRateWilson95: wilsonInterval(counts.meetsIntent, denominator),
    missRateWilson95: wilsonInterval(counts.missesIntent, denominator),
    excludedUnreviewable: counts.unreviewable,
    emptyQuestionItems
  };
}

function evaluateHumanReviewReleaseGate({ visibleCounts, translationOverall, questionIntent, coverage, key }) {
  const failures = [];
  const requirementsFingerprint = key.sourceIdentity.questionRequirementsFingerprint;
  const requirementsBound = key.coverage.questionRequirementsBound === true
    && isFingerprint(requirementsFingerprint);
  const benchmarkManifestBound = key.coverage.benchmarkManifestBound === true;
  const frozenHoldoutLineageBound = key.coverage.frozenHoldoutLineageBound === true;
  const reviewLineageBound = key.coverage.reviewLineageBound === true
    && isFingerprint(key.sourceIdentity.reviewLineageFingerprint);

  if (!coverage.complete || coverage.reviewedItems !== coverage.expectedItems) {
    failures.push("review_coverage_incomplete");
  }
  if (visibleCounts.supported + visibleCounts.unsupported + visibleCounts.unreadable !== coverage.visibleTextItems) {
    failures.push("visible_text_review_coverage_mismatch");
  }
  if (translationOverall.counts.faithful + translationOverall.counts.materialError + translationOverall.counts.unreviewable !== coverage.translationItems) {
    failures.push("translation_review_coverage_mismatch");
  }
  if (visibleCounts.unsupported > 0) failures.push("visible_text_claim_unsupported");
  if (visibleCounts.unreadable > 0) failures.push("visible_text_claim_unreviewable");
  if (translationOverall.counts.materialError > 0) failures.push("translation_material_error");
  if (translationOverall.counts.unreviewable > 0) failures.push("translation_unreviewable");
  if (!requirementsBound) failures.push("question_requirements_not_fingerprint_bound");
  if (!benchmarkManifestBound) failures.push("benchmark_manifest_not_source_bound");
  if (!frozenHoldoutLineageBound) failures.push("frozen_holdout_lineage_not_bound");
  if (!reviewLineageBound) failures.push("review_lineage_not_bound");
  if (key.coverage.questionIntentItems === 0) failures.push("question_intent_review_missing");
  if (questionIntent.counts.missesIntent > 0) failures.push("question_intent_missed");
  if (questionIntent.counts.unreviewable > 0) failures.push("question_intent_unreviewable");
  if (questionIntent.emptyQuestionItems > 0) failures.push("question_text_missing");
  if (questionIntent.total !== key.coverage.questionIntentItems) failures.push("question_intent_coverage_mismatch");

  return {
    policy: "comprehensive_human_release_gate_v1",
    required: true,
    passed: failures.length === 0,
    requirementsBound,
    benchmarkManifestBound,
    frozenHoldoutLineageBound,
    reviewLineageBound,
    runFingerprint: key.sourceIdentity.runFingerprint,
    configurationFingerprint: key.sourceIdentity.configurationFingerprint,
    sourceArtifactFingerprint: key.sourceIdentity.sourceArtifactFingerprint,
    benchmarkManifestFingerprint: key.sourceIdentity.benchmarkManifestFingerprint ?? null,
    benchmarkLineageFingerprint: key.sourceIdentity.benchmarkLineageFingerprint ?? null,
    holdoutIdentity: key.sourceIdentity.holdoutIdentity ?? null,
    questionRequirementsFingerprint: requirementsFingerprint ?? null,
    reviewLineageFingerprint: key.sourceIdentity.reviewLineageFingerprint ?? null,
    expectedItems: coverage.expectedItems,
    reviewedItems: coverage.reviewedItems,
    failures
  };
}

function immutableItem(item) {
  const immutable = {};
  for (const key of [...ITEM_KEYS].sort()) {
    if (key === "judgment" || key === "notes") continue;
    if (Object.hasOwn(item, key)) immutable[key] = item[key];
  }
  return immutable;
}

function translationIsIntended(sourceLanguage, targetLanguage, sourceValues, targetValues) {
  const source = sourceValues.map(cleanString);
  const target = targetValues.map(cleanString);
  const textDiffers = source.length !== target.length || source.some((value, index) => value !== (target[index] ?? ""));
  const languageDiffers = sourceLanguage && targetLanguage && sourceLanguage !== "unknown" && targetLanguage !== "unknown"
    ? normalizeLanguage(sourceLanguage) !== normalizeLanguage(targetLanguage)
    : false;
  return languageDiffers || textDiffers;
}

function normalizeStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) throw new HumanReviewError(`${label} must be an array.`, "invalid_normalized_output");
  const result = value.map((item) => cleanString(item));
  if (result.some((item) => !item)) {
    throw new HumanReviewError(`${label} must contain only non-empty strings.`, "invalid_normalized_output");
  }
  if (!allowEmpty && result.length === 0) return [];
  return result;
}

function normalizeFingerprint(value, label) {
  const text = cleanString(value).toLowerCase();
  if (!text) throw new HumanReviewError(`${label} is required.`, "missing_source_identity");
  if (SHA256_PATTERN.test(text)) return text.startsWith("sha256:") ? text : `sha256:${text}`;
  return fingerprintJson(text);
}

function normalizeOptionalFingerprint(value, label) {
  return cleanString(value) ? normalizeFingerprint(value, label) : null;
}

function isFingerprint(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function resolveLocalPath(value, sourceDirectory) {
  const text = cleanString(value);
  if (!text || /^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return null;
  const resolved = path.resolve(sourceDirectory, text);
  return fs.existsSync(resolved) && fs.statSync(resolved).isFile() ? resolved : null;
}

function resolveLineageFile(lineageDirectory, value, label) {
  const relativePath = cleanString(value).replace(/\\/g, "/");
  if (
    !relativePath ||
    path.posix.isAbsolute(relativePath) ||
    /^[A-Za-z]:\//u.test(relativePath) ||
    relativePath.split("/").some((part) => part === "" || part === ".")
  ) {
    throw new HumanReviewError(`Frozen benchmark ${label} must be a safe relative path.`, "invalid_frozen_lineage");
  }
  return path.resolve(lineageDirectory, ...relativePath.split("/"));
}

function readLineageFile(filePath, label) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error("path is not a file");
    return fs.readFileSync(filePath);
  } catch (error) {
    throw new HumanReviewError(`${label} is missing: ${errorMessage(error)}`, "missing_frozen_lineage");
  }
}

function safeImageExtension(imagePath) {
  const extension = imagePath ? path.extname(imagePath).toLowerCase() : "";
  return [".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"].includes(extension) ? extension : ".jpg";
}

function translationLanguage(...values) {
  return firstString(...values) || "unknown";
}

function normalizeLanguage(value) {
  const normalized = cleanString(value).toLowerCase().replace(/_/g, "-");
  const alias = LANGUAGE_ALIASES.get(normalized);
  if (alias) return alias;
  const base = normalized.split("-")[0];
  return /^[a-z]{2,3}$/.test(base) ? base : normalized;
}

function validIsoTimestamp(value) {
  return ISO_TIMESTAMP_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

function validateNotes(value, itemId) {
  if (typeof value !== "string" || value.length > 2000) {
    throw new HumanReviewError(`Notes for ${itemId} must be a string of at most 2000 characters.`, "invalid_notes");
  }
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function firstString(...values) {
  for (const value of values) {
    const text = cleanString(value);
    if (text) return text;
  }
  return "";
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertRecord(value, label) {
  if (!isRecord(value)) throw new HumanReviewError(`${label} must be a JSON object.`, "invalid_object");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, allowed, label, { allowMissing = false } = {}) {
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  if (extras.length > 0) {
    throw new HumanReviewError(`${label} contains unsupported fields: ${extras.join(", ")}.`, "unexpected_fields");
  }
  if (!allowMissing) {
    const missing = [...allowed].filter((key) => !Object.hasOwn(value, key));
    if (missing.length > 0) throw new HumanReviewError(`${label} is missing fields: ${missing.join(", ")}.`, "missing_fields");
  }
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
