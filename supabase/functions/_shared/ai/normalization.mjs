import { rewriteBannedSafetyLanguage } from "./safety-language.mjs";

export const normalizationVersion = "2026-07-14.6";

const providerEvidenceLimit = 8;

const riskLevels = new Set([
  "low_risk",
  "ask_staff",
  "high_risk",
  "avoid_unless_confirmed",
  "unclear"
]);
const readabilityValues = new Set(["clear", "partially_clear", "poor"]);
const evidenceConfidenceValues = new Set(["high", "medium", "low"]);
const riskBasisValues = new Set([
  "visible_text",
  "common_pattern",
  "unknown_ingredient",
  "cross_contact",
  "translation_uncertain",
  "image_uncertain"
]);

export function normalizeModelScanResult(value, profileId, options = {}) {
  const now = typeof options.now === "string" ? options.now : new Date().toISOString();
  const scanSummary = readRecord(value.scanSummary) ?? readRecord(value.scan_summary);
  const restaurantMessage = readRecord(value.restaurantMessage) ?? readRecord(value.restaurant_message);
  const imageQuality = readRecord(value.imageQuality) ?? readRecord(value.image_quality);
  const transparency = readRecord(value.transparency);
  const pageAssessments = normalizePageAssessments(value.pageAssessments, options.imageCount);

  return {
    id: readString(value.id) || options.scanId || `scan-${Date.parse(now) || Date.now()}`,
    createdAt: readString(value.createdAt ?? value.created_at) || now,
    imageUri: null,
    restaurantName: readString(value.restaurantName ?? value.restaurant_name) || null,
    profileId,
    pageAssessments,
    scanSummary: {
      overallRisk: riskLevels.has(readString(scanSummary?.overallRisk ?? scanSummary?.overall_risk))
        ? readString(scanSummary?.overallRisk ?? scanSummary?.overall_risk)
        : "unclear",
      summary: readString(scanSummary?.summary) || "We could not analyze this menu clearly.",
      limitations:
        readString(scanSummary?.limitations) ||
        "Visible menu text and common ingredient patterns only."
    },
    dishes: Array.isArray(value.dishes) && value.dishes.length > 0
      ? ensureUniqueDishIds(value.dishes.map((dish, index) => normalizeDish(dish, index)))
      : [createUnclearDish()],
    restaurantMessage: restaurantMessage
      ? {
          english: stripProfileValidationMarkers(restaurantMessage.english),
          translated: stripProfileValidationMarkers(restaurantMessage.translated) || null,
          language: readString(restaurantMessage.language) || null,
          userLanguageText:
            stripProfileValidationMarkers(
              restaurantMessage.userLanguageText ?? restaurantMessage.user_language_text
            ) ||
            stripProfileValidationMarkers(restaurantMessage.english) ||
            null,
          userLanguage:
            readString(restaurantMessage.userLanguage ?? restaurantMessage.user_language) || null
        }
      : null,
    imageQuality: {
      readability: readabilityValues.has(imageQuality?.readability)
        ? imageQuality.readability
        : "poor",
      issues: readStringArray(imageQuality?.issues, 8),
      needsRetake:
        typeof imageQuality?.needsRetake === "boolean"
          ? imageQuality.needsRetake
          : !readabilityValues.has(imageQuality?.readability) || imageQuality?.readability === "poor"
    },
    transparency: {
      checked: readStringArray(transparency?.checked, 6).length > 0
        ? readStringArray(transparency?.checked, 6)
        : ["Menu photo", "Allergy profile", "Common ingredient and preparation patterns"],
      limitations: readStringArray(transparency?.limitations, 6).length > 0
        ? readStringArray(transparency?.limitations, 6)
        : ["Sift cannot verify full ingredients, staff practices, or kitchen cross-contact."],
      sourceReferences: [],
      webSearchQueries: []
    }
  };
}

export function createFallbackScanResult(profileId, analysisModel = null, options = {}) {
  const now = typeof options.now === "string" ? options.now : new Date().toISOString();
  const imageCount = Number.isInteger(options.imageCount) && options.imageCount >= 1 && options.imageCount <= 4
    ? options.imageCount
    : 1;
  return {
    id: options.scanId || `scan-unclear-${Date.parse(now) || Date.now()}`,
    createdAt: now,
    imageUri: null,
    restaurantName: null,
    profileId,
    pageAssessments: Array.from({ length: imageCount }, (_, index) => ({
      pageNumber: index + 1,
      readability: "poor",
      issues: ["analysis_failed"]
    })),
    analysisSource: "fallback",
    analysisModel,
    scanSummary: {
      overallRisk: "unclear",
      summary: "We could not analyze this menu clearly. Please retake the photo or ask staff directly.",
      limitations: "Visible menu text and common ingredient patterns only."
    },
    dishes: [createUnclearDish()],
    restaurantMessage: null,
    imageQuality: {
      readability: "poor",
      issues: ["analysis_failed"],
      needsRetake: true
    },
    transparency: {
      checked: ["Menu photo", "Allergy profile"],
      limitations: ["Sift could not extract enough reliable menu detail from this scan."],
      sourceReferences: [],
      webSearchQueries: []
    }
  };
}

export function withAnalysisMetadata(scanResult, requestId) {
  return {
    ...scanResult,
    analysisRequestId: requestId
  };
}

export function mergeAnalysisSources(scanResult, analysis) {
  const transparency = scanResult.transparency ?? {
    checked: ["Menu photo", "Allergy profile", "Common ingredient and preparation patterns"],
    limitations: ["Sift cannot verify full ingredients, staff practices, or kitchen cross-contact."],
    sourceReferences: [],
    webSearchQueries: []
  };

  return {
    ...scanResult,
    transparency: {
      ...transparency,
      sourceReferences:
        analysis.provider === "gemini" && analysis.sourceReferences
          ? analysis.sourceReferences.slice(0, 12)
          : transparency.sourceReferences,
      webSearchQueries:
        analysis.provider === "gemini" && analysis.webSearchQueries
          ? analysis.webSearchQueries.slice(0, 12)
          : transparency.webSearchQueries
    }
  };
}

export function sanitizeScanResult(scanResult) {
  return rewriteBannedSafetyLanguage(scanResult);
}

export function getNormalizationFingerprintSource() {
  return [
    normalizationVersion,
    normalizeModelScanResult,
    normalizePageAssessments,
    normalizeDish,
    normalizeDishTransparency,
    ensureUniqueDishIds,
    createUnclearDish,
    createFallbackScanResult,
    withAnalysisMetadata,
    mergeAnalysisSources,
    sanitizeScanResult,
    stripProfileValidationMarkers,
    readEvidenceConfidence,
    readRiskBasisArray,
    readIntegerArray,
    readStringArray,
    readString,
    readRecord,
    isRecord
  ].map(String).join("\n---\n");
}

function normalizeDish(value, index) {
  const dish = isRecord(value) ? value : {};
  const evidence = readRecord(dish.evidence);
  const directAllergenTerms = readStringArray(
    evidence?.directAllergenTerms,
    providerEvidenceLimit
  );
  const allergenDerivatives = readStringArray(evidence?.allergenDerivatives, providerEvidenceLimit);
  const unknownPreparationComponents = readStringArray(
    evidence?.unknownPreparationComponents,
    providerEvidenceLimit
  );
  const questionsToAsk =
    readStringArray(dish.questionsToAsk ?? dish.questions_to_ask, 6).length > 0
      ? readStringArray(dish.questionsToAsk ?? dish.questions_to_ask, 6)
      : ["Can you confirm whether this dish contains any of my listed allergens?"];
  const questionsToAskUserLanguage =
    readStringArray(dish.questionsToAskUserLanguage ?? dish.questions_to_ask_user_language, 6).length > 0
      ? readStringArray(dish.questionsToAskUserLanguage ?? dish.questions_to_ask_user_language, 6)
      : questionsToAsk;

  return {
    id: readString(dish.id) || `dish-${index + 1}`,
    dishName: readString(dish.dishName) || readString(dish.dish_name) || `Dish ${index + 1}`,
    menuDescription:
      typeof dish.menuDescription === "string"
        ? dish.menuDescription
        : typeof dish.menu_description === "string"
          ? dish.menu_description
          : null,
    sourcePageNumbers: readIntegerArray(dish.sourcePageNumbers ?? dish.source_page_numbers, 4),
    riskLevel: riskLevels.has(dish.riskLevel)
      ? dish.riskLevel
      : riskLevels.has(dish.risk_level)
        ? dish.risk_level
        : "unclear",
    possibleAllergens: readStringArray(dish.possibleAllergens ?? dish.possible_allergens, 12),
    hiddenRiskIngredients: evidence
      ? mergeStringArrays(allergenDerivatives, unknownPreparationComponents).slice(0, 12)
      : readStringArray(dish.hiddenRiskIngredients ?? dish.hidden_risk_ingredients, 12),
    crossContactConcerns: evidence
      ? readStringArray(evidence.crossContactSignals, providerEvidenceLimit)
      : readStringArray(dish.crossContactConcerns ?? dish.cross_contact_concerns, 8),
    evidenceConfidence: readEvidenceConfidence(dish.evidenceConfidence ?? dish.evidence_confidence),
    riskBasis: readRiskBasisArray(dish.riskBasis ?? dish.risk_basis),
    reason: readString(dish.reason) || "The model did not provide enough reliable detail.",
    questionsToAsk,
    questionsToAskUserLanguage,
    conservativeLanguage:
      readString(dish.conservativeLanguage ?? dish.safe_language) ||
      "Not enough information. Ask staff before ordering.",
    transparency: normalizeDishTransparency(dish),
    // Internal handoff only. applyRiskPolicy consumes and removes this field
    // before the public ScanResult is returned.
    __policyEvidence: {
      directAllergenTerms,
      allergenDerivatives,
      uncertainties: readStringArray(evidence?.uncertainties, providerEvidenceLimit)
    }
  };
}

function normalizeDishTransparency(dish) {
  const transparency = readRecord(dish.transparency);
  const evidence = readRecord(dish.evidence);
  // Keep the complete provider evidence set until deterministic policy has run.
  // The client may display a shorter list, but policy must see every accepted item.
  const visibleMenuText = readStringArray(
    evidence?.visibleMenuText ?? dish.visibleMenuText ?? dish.visible_menu_text,
    providerEvidenceLimit
  );
  const commonRiskPatterns = readStringArray(
    evidence?.commonRecipePatterns ?? dish.commonRiskPatterns ?? dish.common_risk_patterns,
    providerEvidenceLimit
  );
  const uncertainties = mergeStringArrays(
    readStringArray(evidence?.uncertainties ?? dish.uncertainties, providerEvidenceLimit),
    readStringArray(evidence?.unknownPreparationComponents, providerEvidenceLimit)
  ).slice(0, providerEvidenceLimit);

  return {
    visibleMenuText: visibleMenuText.length > 0
      ? visibleMenuText
      : readStringArray(transparency?.visibleMenuText, providerEvidenceLimit),
    profileFactors: readStringArray(transparency?.profileFactors, 5),
    commonRiskPatterns: commonRiskPatterns.length > 0
      ? commonRiskPatterns
      : readStringArray(transparency?.commonRiskPatterns, providerEvidenceLimit),
    uncertainty: uncertainties.length > 0
      ? uncertainties
      : readStringArray(transparency?.uncertainty, providerEvidenceLimit).length > 0
        ? readStringArray(transparency?.uncertainty, providerEvidenceLimit)
        : ["Menu descriptions may omit sauces, oils, marinades, garnishes, and kitchen preparation details."]
  };
}

function ensureUniqueDishIds(dishes) {
  const seen = new Map();
  return dishes.map((dish, index) => {
    const baseId = dish.id || `dish-${index + 1}`;
    const seenCount = seen.get(baseId) ?? 0;
    seen.set(baseId, seenCount + 1);
    return {
      ...dish,
      id: seenCount === 0 ? baseId : `${baseId}-${seenCount + 1}`
    };
  });
}

function createUnclearDish() {
  return {
    id: "unclear-menu",
    dishName: "Menu image unclear",
    menuDescription: null,
    sourcePageNumbers: [],
    riskLevel: "unclear",
    possibleAllergens: [],
    hiddenRiskIngredients: [],
    crossContactConcerns: [],
    evidenceConfidence: "low",
    riskBasis: ["image_uncertain", "unknown_ingredient"],
    reason: "The image or model response did not provide enough reliable menu detail.",
    questionsToAsk: ["Can you confirm whether this dish contains any of my listed allergens?"],
    questionsToAskUserLanguage: ["Can you confirm whether this dish contains any of my listed allergens?"],
    conservativeLanguage: "Not enough information. Retake the photo or ask staff directly.",
    transparency: {
      visibleMenuText: [],
      profileFactors: [],
      commonRiskPatterns: [],
      uncertainty: ["The image or model response did not provide enough reliable menu detail."]
    }
  };
}

function readEvidenceConfidence(value) {
  return evidenceConfidenceValues.has(value) ? value : "low";
}

function readRiskBasisArray(value) {
  return readStringArray(value).filter((item) => riskBasisValues.has(item));
}

function normalizePageAssessments(value, requestedImageCount) {
  const maximum = Number.isInteger(requestedImageCount) && requestedImageCount >= 1 && requestedImageCount <= 4
    ? requestedImageCount
    : 4;
  if (!Array.isArray(value)) return [];
  return value.slice(0, maximum).map((raw, index) => {
    const item = readRecord(raw) ?? {};
    return {
      pageNumber: Number.isInteger(item.pageNumber) ? item.pageNumber : index + 1,
      readability: readabilityValues.has(item.readability) ? item.readability : "poor",
      issues: readStringArray(item.issues, 8)
    };
  });
}

function readIntegerArray(value, maximum = Number.POSITIVE_INFINITY) {
  return Array.isArray(value)
    ? [...new Set(value.filter(Number.isInteger))].slice(0, maximum)
    : [];
}

function readStringArray(value, maximum = Number.POSITIVE_INFINITY) {
  return Array.isArray(value)
    ? value.map(readString).filter(Boolean).slice(0, maximum)
    : [];
}

function mergeStringArrays(...arrays) {
  return Array.from(new Set(arrays.flat().map(readString).filter(Boolean)));
}

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripProfileValidationMarkers(value) {
  return readString(value)
    .replace(/\[\s*[^\]\r\n:]{1,80}\s*:\s*(?:mild|moderate|severe)\s*\]\s*/giu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function readRecord(value) {
  return isRecord(value) ? value : null;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
