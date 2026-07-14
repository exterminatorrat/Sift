const riskLevels = new Set([
  "low_risk",
  "ask_staff",
  "high_risk",
  "avoid_unless_confirmed",
  "unclear"
]);

export const providerValidationVersion = "2026-07-14.8";
const readabilityValues = new Set(["clear", "partially_clear", "poor"]);
const pageContentTypeValues = new Set(["dish_listing", "supporting_information", "unusable_or_unknown"]);
const evidenceConfidenceValues = new Set(["high", "medium", "low"]);
const riskBasisValues = new Set([
  "visible_text",
  "common_pattern",
  "unknown_ingredient",
  "cross_contact",
  "translation_uncertain",
  "image_uncertain"
]);
const languageAliases = new Map([
  ["en", "en"], ["english", "en"],
  ["es", "es"], ["spanish", "es"], ["español", "es"],
  ["fr", "fr"], ["french", "fr"], ["français", "fr"],
  ["de", "de"], ["german", "de"], ["deutsch", "de"],
  ["it", "it"], ["italian", "it"], ["italiano", "it"],
  ["pt", "pt"], ["portuguese", "pt"], ["português", "pt"],
  ["ja", "ja"], ["japanese", "ja"], ["日本語", "ja"],
  ["ko", "ko"], ["korean", "ko"], ["한국어", "ko"],
  ["zh", "zh"], ["chinese", "zh"], ["中文", "zh"],
  ["zh-hans", "zh-hans"], ["simplified chinese", "zh-hans"], ["chinese simplified", "zh-hans"], ["简体中文", "zh-hans"],
  ["zh-hant", "zh-hant"], ["traditional chinese", "zh-hant"], ["chinese traditional", "zh-hant"], ["繁體中文", "zh-hant"],
  ["th", "th"], ["thai", "th"], ["ไทย", "th"],
  ["vi", "vi"], ["vietnamese", "vi"], ["tiếng việt", "vi"],
  ["tr", "tr"], ["turkish", "tr"], ["türkçe", "tr"],
  ["pl", "pl"], ["polish", "pl"], ["polski", "pl"],
  ["id", "id"], ["indonesian", "id"], ["bahasa indonesia", "id"],
  ["nl", "nl"], ["dutch", "nl"], ["nederlands", "nl"],
  ["ar", "ar"], ["arabic", "ar"], ["العربية", "ar"],
  ["he", "he"], ["hebrew", "he"], ["עברית", "he"],
  ["hi", "hi"], ["hindi", "hi"], ["हिन्दी", "hi"],
  ["ru", "ru"], ["russian", "ru"], ["русский", "ru"],
  ["uk", "uk"], ["ukrainian", "uk"], ["українська", "uk"],
  ["el", "el"], ["greek", "el"], ["ελληνικά", "el"]
]);
const undeterminedLanguages = new Set(["", "auto", "automatic", "infer", "not sure", "unknown"]);
const languageScriptPatterns = new Map([
  ["ja", /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u],
  ["ko", /\p{Script=Hangul}/u],
  ["zh", /\p{Script=Han}/u],
  ["zh-hans", /\p{Script=Han}/u],
  ["zh-hant", /\p{Script=Han}/u],
  ["th", /\p{Script=Thai}/u],
  ["ar", /\p{Script=Arabic}/u],
  ["he", /\p{Script=Hebrew}/u],
  ["hi", /\p{Script=Devanagari}/u],
  ["ru", /\p{Script=Cyrillic}/u],
  ["uk", /\p{Script=Cyrillic}/u],
  ["el", /\p{Script=Greek}/u]
]);

export function validateModelScanResult(value, context = {}) {
  if (!isRecord(value)) return "provider_result_not_object";
  const allergies = context?.profile?.allergies ?? context?.allergies;
  const imageCount = context?.imageCount;
  if (!Array.isArray(allergies) || allergies.length === 0) {
    return "provider_missing_profile_context";
  }
  if (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 4) {
    return "provider_missing_image_context";
  }

  const imageQuality = value.imageQuality;
  if (
    !isRecord(imageQuality) ||
    !readabilityValues.has(imageQuality.readability) ||
    !isStringArray(imageQuality.issues, 0, 8) ||
    typeof imageQuality.needsRetake !== "boolean"
  ) {
    return "provider_invalid_image_quality";
  }
  if (imageQuality.readability === "poor" && imageQuality.needsRetake !== true) {
    return "provider_poor_image_missing_retake";
  }

  if (!isNonEmptyString(value.restaurantName)) return "provider_invalid_scan_title";
  if (
    !isRecord(value.scanSummary) ||
    !riskLevels.has(value.scanSummary.overallRisk) ||
    !isNonEmptyString(value.scanSummary.summary) ||
    !isNonEmptyString(value.scanSummary.limitations)
  ) {
    return "provider_invalid_summary";
  }
  if (imageQuality.readability === "poor" && value.scanSummary.overallRisk !== "unclear") {
    return "provider_poor_image_not_unclear";
  }

  const pageAssessmentError = validatePageAssessments(value.pageAssessments, imageCount, imageQuality);
  if (pageAssessmentError) return pageAssessmentError;

  if (
    !Array.isArray(value.dishes) ||
    value.dishes.length > 30 ||
    (imageQuality.readability !== "poor" && value.dishes.length < 1)
  ) {
    return "provider_invalid_dishes";
  }
  for (const dish of value.dishes) {
    const dishError = validateModelDish(dish, imageQuality.readability, allergies, imageCount);
    if (dishError) return dishError;
  }
  const coveredPages = new Set(value.dishes.flatMap((dish) => dish.sourcePageNumbers));
  if (value.pageAssessments.some((page) =>
    page.contentType === "dish_listing" &&
    page.readability !== "poor" &&
    !coveredPages.has(page.pageNumber)
  )) {
    return "provider_dish_listing_page_missing_coverage";
  }

  const restaurantMessage = value.restaurantMessage;
  if (
    !isRecord(restaurantMessage) ||
    !isNonEmptyString(restaurantMessage.english) ||
    !isString(restaurantMessage.translated) ||
    !isString(restaurantMessage.language) ||
    !isNonEmptyString(restaurantMessage.userLanguageText) ||
    !isString(restaurantMessage.userLanguage)
  ) {
    return "provider_invalid_restaurant_message";
  }
  const communicationError = validateProfileCommunication(value, allergies);
  if (communicationError) return communicationError;
  const languageError = validateCommunicationLanguages(value, context);
  if (languageError) return languageError;

  return null;
}

export function getProviderValidationFingerprintSource() {
  return [
    providerValidationVersion,
    JSON.stringify([...pageContentTypeValues]),
    validateModelScanResult,
    validatePageAssessments,
    validateModelDish,
    validateProfileCommunication,
    validateCommunicationLanguages,
    normalizeLanguageIdentifier,
    textMatchesLanguageScript,
    observedEvidenceMatchesProfile,
    communicationNamesProfile,
    communicationHasProfileMarkers,
    communicationMentionsUnrelatedAllergen,
    canonicalProfileAllergens,
    termMatches,
    isEnumArray,
    isStringArray,
    isNonEmptyString,
    isString,
    isObservedEvidenceTerm,
    normalizeForEvidenceMatch,
    isRecord,
    JSON.stringify([...languageAliases.entries()]),
    JSON.stringify([...undeterminedLanguages]),
    JSON.stringify([...languageScriptPatterns.entries()].map(([language, pattern]) => [language, pattern.source]))
  ].map(String).join("\n---\n");
}

function validatePageAssessments(value, imageCount, imageQuality) {
  if (!Array.isArray(value) || value.length !== imageCount) {
    return "provider_invalid_page_assessments";
  }
  for (let index = 0; index < value.length; index += 1) {
    const page = value[index];
    if (
      !isRecord(page) ||
      page.pageNumber !== index + 1 ||
      !pageContentTypeValues.has(page.contentType) ||
      !readabilityValues.has(page.readability) ||
      !isStringArray(page.issues, 0, 6)
    ) {
      return "provider_invalid_page_assessments";
    }
    if (page.contentType === "unusable_or_unknown" && page.readability !== "poor") {
      return "provider_unusable_page_not_poor";
    }
  }
  if (
    value.some((page) => page.readability === "poor") &&
    (imageQuality.readability !== "poor" || imageQuality.needsRetake !== true)
  ) {
    return "provider_page_quality_not_reflected";
  }
  return null;
}

function validateModelDish(dish, readability, allergies, imageCount) {
  if (!isRecord(dish)) return "provider_dish_not_object";
  if (
    !isNonEmptyString(dish.dishName) ||
    !isString(dish.menuDescription) ||
    !isIntegerArray(dish.sourcePageNumbers, 1, imageCount, 1, imageCount) ||
    !riskLevels.has(dish.riskLevel) ||
    !isStringArray(dish.possibleAllergens, 0, 12) ||
    !evidenceConfidenceValues.has(dish.evidenceConfidence) ||
    !isEnumArray(dish.riskBasis, riskBasisValues, 1, 6) ||
    !isNonEmptyString(dish.reason) ||
    !isStringArray(dish.questionsToAsk, 1, 6) ||
    !isStringArray(dish.questionsToAskUserLanguage, 1, 6) ||
    !isNonEmptyString(dish.conservativeLanguage)
  ) {
    return "provider_invalid_dish_contract";
  }

  const evidence = dish.evidence;
  if (
    !isRecord(evidence) ||
    !isStringArray(evidence.visibleMenuText, readability === "poor" ? 0 : 1, 8) ||
    !isStringArray(evidence.directAllergenTerms, 0, 8) ||
    !isStringArray(evidence.allergenDerivatives, 0, 8) ||
    !isStringArray(evidence.commonRecipePatterns, 0, 8) ||
    !isStringArray(evidence.unknownPreparationComponents, 0, 8) ||
    !isStringArray(evidence.crossContactSignals, 0, 8) ||
    !isStringArray(evidence.uncertainties, 0, 8)
  ) {
    return readability === "poor"
      ? "provider_invalid_dish_evidence"
      : "provider_readable_dish_missing_visible_evidence";
  }

  const observedText = [dish.dishName, dish.menuDescription, ...evidence.visibleMenuText].join(" ");
  if (
    [...evidence.directAllergenTerms, ...evidence.allergenDerivatives]
      .some((term) => !isObservedEvidenceTerm(term, observedText))
  ) {
    return "provider_observed_allergen_not_supported";
  }
  if (
    evidence.directAllergenTerms.some((term) =>
      !observedEvidenceMatchesProfile(term, allergies, new Set(["direct_name"]))
    ) ||
    evidence.allergenDerivatives.some((term) =>
      !observedEvidenceMatchesProfile(term, allergies, new Set(["direct_name", "contains_allergen"]))
    )
  ) {
    return "provider_observed_allergen_not_profile_supported";
  }
  if (dish.possibleAllergens.some((claim) =>
    !allergies.some((allergy) => observedEvidenceMatchesProfile(claim, [allergy], null))
  )) {
    return "provider_allergen_outside_profile";
  }

  const hasObservedAllergenEvidence =
    evidence.directAllergenTerms.length > 0 || evidence.allergenDerivatives.length > 0;
  if (
    hasObservedAllergenEvidence &&
    (
      dish.possibleAllergens.length === 0 ||
      !dish.riskBasis.includes("visible_text") ||
      dish.riskLevel === "low_risk"
    )
  ) {
    return "provider_inconsistent_direct_evidence";
  }
  const materialUncertaintyBasis = dish.riskBasis.some((basis) =>
    basis === "common_pattern" ||
    basis === "unknown_ingredient" ||
    basis === "cross_contact" ||
    basis === "translation_uncertain" ||
    basis === "image_uncertain"
  );
  if (
    evidence.uncertainties.length > 0 &&
    (dish.riskLevel === "low_risk" || !materialUncertaintyBasis)
  ) {
    return "provider_uncertainty_inconsistent_with_risk";
  }

  return null;
}

function validateProfileCommunication(value, allergies) {
  for (const dish of value.dishes) {
    if (
      !communicationNamesProfile(dish.questionsToAsk.join(" "), allergies) ||
      !communicationNamesProfile(dish.questionsToAskUserLanguage.join(" "), allergies)
    ) {
      return "provider_questions_not_profile_bound";
    }
    if (
      communicationMentionsUnrelatedAllergen(dish.questionsToAsk.join(" "), allergies) ||
      communicationMentionsUnrelatedAllergen(dish.questionsToAskUserLanguage.join(" "), allergies)
    ) {
      return "provider_questions_include_unrelated_allergen";
    }
  }

  const messageChannels = [
    value.restaurantMessage.english,
    value.restaurantMessage.userLanguageText,
    ...(value.restaurantMessage.translated.trim() ? [value.restaurantMessage.translated] : [])
  ];
  if (messageChannels.some((text) => !communicationHasProfileMarkers(text, allergies))) {
    return "provider_restaurant_message_not_profile_bound";
  }
  if (messageChannels.some((text) => communicationMentionsUnrelatedAllergen(text, allergies))) {
    return "provider_restaurant_message_includes_unrelated_allergen";
  }
  return null;
}

function validateCommunicationLanguages(value, context) {
  const userLanguage = normalizeLanguageIdentifier(
    context?.userLanguage ?? context?.profile?.preferredLanguage
  );
  const requestedRestaurantLanguage = normalizeLanguageIdentifier(
    context?.restaurantLanguage ?? context?.profile?.restaurantLanguage,
    true
  );
  const message = value.restaurantMessage;
  const reportedUserLanguage = normalizeLanguageIdentifier(message.userLanguage);
  const reportedRestaurantLanguage = normalizeLanguageIdentifier(message.language, true);
  const hasTranslation = message.translated.trim().length > 0;

  if (!userLanguage || reportedUserLanguage !== userLanguage) {
    return "provider_user_language_metadata_mismatch";
  }

  let restaurantLanguage = requestedRestaurantLanguage;
  if (restaurantLanguage && restaurantLanguage === userLanguage) {
    if (hasTranslation || reportedRestaurantLanguage) {
      return "provider_redundant_restaurant_translation";
    }
  } else if (restaurantLanguage) {
    if (!hasTranslation || reportedRestaurantLanguage !== restaurantLanguage) {
      return "provider_restaurant_language_metadata_mismatch";
    }
  } else if (hasTranslation) {
    if (!reportedRestaurantLanguage) {
      return "provider_restaurant_language_metadata_mismatch";
    }
    restaurantLanguage = reportedRestaurantLanguage;
  } else {
    if (reportedRestaurantLanguage) {
      return "provider_restaurant_language_metadata_mismatch";
    }
    restaurantLanguage = userLanguage;
  }

  const userTexts = [
    message.userLanguageText,
    ...value.dishes.flatMap((dish) => dish.questionsToAskUserLanguage)
  ];
  if (userTexts.some((text) => !textMatchesLanguageScript(text, userLanguage))) {
    return "provider_user_communication_wrong_language";
  }

  const restaurantTexts = [
    ...(hasTranslation ? [message.translated] : []),
    ...value.dishes.flatMap((dish) => dish.questionsToAsk)
  ];
  if (restaurantTexts.some((text) => !textMatchesLanguageScript(text, restaurantLanguage))) {
    return "provider_restaurant_communication_wrong_language";
  }

  return null;
}

function normalizeLanguageIdentifier(value, allowUndetermined = false) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (allowUndetermined && undeterminedLanguages.has(normalized)) return "";
  if (!normalized) return "";
  if (languageAliases.has(normalized)) return languageAliases.get(normalized);
  if (/^zh-(hans|cn|sg)(?:-|$)/u.test(normalized)) return "zh-hans";
  if (/^zh-(hant|tw|hk|mo)(?:-|$)/u.test(normalized)) return "zh-hant";
  const base = normalized.match(/^([a-z]{2,3})(?:-|$)/u)?.[1] ?? "";
  return languageAliases.get(base) ?? base;
}

function textMatchesLanguageScript(text, language) {
  const pattern = languageScriptPatterns.get(language);
  if (!pattern) return true;
  return pattern.test(String(text));
}

function observedEvidenceMatchesProfile(term, allergies, allowedRelationships) {
  const normalizedTerm = normalizeOntologyTerm(term);
  if (!normalizedTerm) return false;
  return allergies.some((allergy) => {
    const normalizedName = normalizeOntologyTerm(allergy?.name ?? "");
    if (normalizedName && termMatches(normalizedTerm, normalizedName)) return true;
    return ontologyEntriesForAllergy(allergy).some((entry) =>
      (allowedRelationships === null || allowedRelationships.has(entry.relationship)) &&
      termMatches(normalizedTerm, entry.normalizedTerm)
    );
  });
}

function communicationNamesProfile(text, allergies) {
  const normalizedText = normalizeOntologyTerm(text);
  return allergies.every((allergy) => {
    const normalizedName = normalizeOntologyTerm(allergy?.name ?? "");
    return normalizedName && termMatches(normalizedText, normalizedName);
  });
}

function communicationHasProfileMarkers(text, allergies) {
  const normalizedText = normalizeOntologyTerm(text);
  return allergies.every((allergy) => {
    const name = normalizeOntologyTerm(allergy?.name ?? "");
    const severity = normalizeOntologyTerm(allergy?.severity ?? "");
    return name && severity && (
      normalizedText.includes(`${name} ${severity}`) ||
      normalizedText.includes(`${severity} ${name}`)
    );
  });
}

function communicationMentionsUnrelatedAllergen(text, allergies) {
  const normalizedText = normalizeOntologyTerm(text);
  if (!normalizedText) return false;
  const allowed = canonicalProfileAllergens(allergies);
  return allergenRelationships.some((entry) =>
    (entry.relationship === "direct_name" || entry.relationship === "contains_allergen") &&
    !allowed.has(entry.canonicalAllergen) &&
    termMatches(normalizedText, entry.normalizedTerm)
  );
}

function canonicalProfileAllergens(allergies) {
  return new Set(allergies.flatMap((allergy) =>
    ontologyEntriesForAllergy(allergy).map((entry) => entry.canonicalAllergen).filter(Boolean)
  ));
}

function termMatches(normalizedText, normalizedTerm) {
  if (!normalizedText || !normalizedTerm) return false;
  if (/[^a-z0-9 ]/u.test(normalizedTerm)) return normalizedText.includes(normalizedTerm);
  return ` ${normalizedText} `.includes(` ${normalizedTerm} `);
}

function isEnumArray(value, allowed, minimum, maximum) {
  return Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every((item) => allowed.has(item));
}

function isStringArray(value, minimum, maximum) {
  return Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every(isNonEmptyString);
}

function isIntegerArray(value, minimumItems, maximumItems, minimumValue, maximumValue) {
  return Array.isArray(value) &&
    value.length >= minimumItems &&
    value.length <= maximumItems &&
    new Set(value).size === value.length &&
    value.every((item) => Number.isInteger(item) && item >= minimumValue && item <= maximumValue);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isString(value) {
  return typeof value === "string";
}

function isObservedEvidenceTerm(term, observedText) {
  const normalizedTerm = normalizeForEvidenceMatch(term);
  const normalizedText = normalizeForEvidenceMatch(observedText);
  if (!normalizedTerm || !normalizedText) return false;
  return ` ${normalizedText} `.includes(` ${normalizedTerm} `);
}

function normalizeForEvidenceMatch(value) {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
import {
  allergenRelationships,
  normalizeOntologyTerm,
  ontologyEntriesForAllergy
} from "./ontology.mjs";
