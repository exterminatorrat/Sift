import { EvidenceConfidence, RiskBasis, ScanResult } from "../types/scan";
import { RiskLevel } from "../types/risk";

const riskLevels = new Set<RiskLevel>([
  "low_risk",
  "ask_staff",
  "high_risk",
  "avoid_unless_confirmed",
  "unclear"
]);

const readabilityValues = new Set(["clear", "partially_clear", "poor"]);
const evidenceConfidenceValues = new Set<EvidenceConfidence>(["high", "medium", "low"]);
const riskBasisValues = new Set<RiskBasis>([
  "visible_text",
  "common_pattern",
  "unknown_ingredient",
  "cross_contact",
  "translation_uncertain",
  "image_uncertain"
]);

const bannedSafetyLanguage = [
  /safe to eat/i,
  /safe option/i,
  /safe choice/i,
  /safe meal/i,
  /safe dish/i,
  /safe for (you|the user|this allergy)/i,
  /you can eat/i,
  /ok to eat/i,
  /probably fine/i,
  /\bguarantee(?:d|s|ing)?\b/i,
  /completely safe/i,
  /definitely safe/i,
  /no risk/i,
  /zero risk/i,
  /riskless/i,
  /nothing to worry about/i,
  /risk[- ]free/i,
  /allergen[- ]free/i
];

export type ScanResultValidation =
  | { ok: true; value: ScanResult }
  | { ok: false; error: string };

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateScanResult(value: unknown): ScanResultValidation {
  if (!isRecord(value)) {
    return invalid("Response was not an object.");
  }

  if (containsBannedSafetyLanguage(value)) {
    return invalid("Response used disallowed safety language.");
  }

  const id = readString(value.id);
  const createdAt = normalizeCreatedAt(value.createdAt);
  const profileId = readString(value.profileId);

  if (!id || !createdAt || !profileId) {
    return invalid("Response is missing id, createdAt, or profileId.");
  }

  const scanSummary = validateScanSummary(value.scanSummary);
  if (!scanSummary.ok) {
    return scanSummary;
  }

  if (!Array.isArray(value.dishes) || value.dishes.length === 0) {
    return invalid("Response must include at least one dish.");
  }

  const dishes = [];
  const seenDishIds = new Map<string, number>();
  for (const dish of value.dishes) {
    const validatedDish = validateDish(dish);
    if (!validatedDish.ok) {
      return validatedDish;
    }

    const seenCount = seenDishIds.get(validatedDish.value.id) ?? 0;
    seenDishIds.set(validatedDish.value.id, seenCount + 1);
    dishes.push({
      ...validatedDish.value,
      id: seenCount === 0 ? validatedDish.value.id : `${validatedDish.value.id}-${seenCount + 1}`
    });
  }

  const imageQuality = validateImageQuality(value.imageQuality);
  if (!imageQuality.ok) {
    return imageQuality;
  }

  const restaurantMessage = validateRestaurantMessage(value.restaurantMessage);
  if (!restaurantMessage.ok) {
    return restaurantMessage;
  }

  const transparency = validateScanTransparency(value.transparency);
  if (!transparency) {
    return invalid("Response must include scan transparency.");
  }

  const analysisSource = readOptionalString(value.analysisSource);
  const normalizedSource =
    analysisSource === "mock" || analysisSource === "ai" || analysisSource === "fallback"
      ? analysisSource
      : undefined;

  return {
    ok: true,
    value: {
      id,
      createdAt,
      imageUri: readOptionalString(value.imageUri),
      restaurantName: readOptionalString(value.restaurantName),
      profileId,
      analysisLanguage: readOptionalString(value.analysisLanguage),
      analysisSource: normalizedSource,
      analysisModel: readOptionalString(value.analysisModel),
      analysisRequestId: readOptionalString(value.analysisRequestId),
      scanSummary: scanSummary.value,
      dishes,
      restaurantMessage: restaurantMessage.value,
      imageQuality: imageQuality.value,
      transparency
    }
  };
}

export function containsBannedSafetyLanguage(value: unknown): boolean {
  if (typeof value === "string") {
    return bannedSafetyLanguage.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some(containsBannedSafetyLanguage);
  }

  if (isRecord(value)) {
    return Object.entries(value).some(([key, item]) => key !== "uri" && containsBannedSafetyLanguage(item));
  }

  return false;
}

function validateScanSummary(value: unknown): Validation<ScanResult["scanSummary"]> {
  if (!isRecord(value)) {
    return invalid("scanSummary was missing.");
  }

  const overallRisk = readRiskLevel(value.overallRisk);
  const summary = readString(value.summary);
  const limitations = readString(value.limitations);

  if (!overallRisk || !summary || !limitations) {
    return invalid("scanSummary is incomplete.");
  }

  if (!hasConservativeUncertaintyText(limitations)) {
    return invalid("scanSummary limitations must describe uncertainty.");
  }

  return {
    ok: true,
    value: { overallRisk, summary, limitations }
  };
}

function validateDish(value: unknown): Validation<ScanResult["dishes"][number]> {
  if (!isRecord(value)) {
    return invalid("Dish entry was not an object.");
  }

  const id = readString(value.id);
  const dishName = readString(value.dishName);
  const riskLevel = readRiskLevel(value.riskLevel);
  const reason = readString(value.reason);
  const conservativeLanguage = readString(value.conservativeLanguage);
  const possibleAllergens = readStringArray(value.possibleAllergens);
  const hiddenRiskIngredients = readStringArray(value.hiddenRiskIngredients);
  const crossContactConcerns = readStringArray(value.crossContactConcerns);
  const evidenceConfidence = readEvidenceConfidence(value.evidenceConfidence);
  const riskBasis = readRiskBasisArray(value.riskBasis);
  const questionsToAsk = readStringArray(value.questionsToAsk);
  const questionsToAskUserLanguage = readStringArray(value.questionsToAskUserLanguage);

  if (!id || !dishName || !riskLevel || !reason || !conservativeLanguage) {
    return invalid("Dish entry is missing required text fields.");
  }

  if (riskLevel === "low_risk" && !hasConservativeUncertaintyText(`${reason} ${conservativeLanguage}`)) {
    return invalid("Low-risk dish wording must include confirmation or uncertainty language.");
  }

  if (!possibleAllergens || !hiddenRiskIngredients || !crossContactConcerns || !questionsToAsk) {
    return invalid("Dish entry has malformed arrays.");
  }

  if (questionsToAsk.length === 0) {
    return invalid("Dish entry must include staff questions.");
  }

  if (!questionsToAskUserLanguage || questionsToAskUserLanguage.length === 0) {
    return invalid("Dish entry must include user-language staff questions.");
  }

  const transparency = validateDishTransparency(value.transparency);
  if (!transparency) {
    return invalid("Dish entry must include transparency evidence.");
  }

  return {
    ok: true,
    value: {
      id,
      dishName,
      menuDescription: readOptionalString(value.menuDescription),
      riskLevel,
      possibleAllergens,
      hiddenRiskIngredients,
      crossContactConcerns,
      evidenceConfidence,
      riskBasis,
      reason,
      questionsToAsk,
      questionsToAskUserLanguage,
      conservativeLanguage,
      transparency
    }
  };
}

function validateDishTransparency(value: unknown): ScanResult["dishes"][number]["transparency"] {
  if (!isRecord(value)) {
    return undefined;
  }

  const visibleMenuText = readStringArray(value.visibleMenuText);
  const profileFactors = readStringArray(value.profileFactors);
  const commonRiskPatterns = readStringArray(value.commonRiskPatterns);
  const uncertainty = readStringArray(value.uncertainty);

  if (!visibleMenuText || !profileFactors || !commonRiskPatterns || !uncertainty) {
    return undefined;
  }

  return {
    visibleMenuText,
    profileFactors,
    commonRiskPatterns,
    uncertainty
  };
}

function validateScanTransparency(value: unknown): ScanResult["transparency"] {
  if (!isRecord(value)) {
    return undefined;
  }

  const checked = readStringArray(value.checked);
  const limitations = readStringArray(value.limitations);
  const webSearchQueries = readStringArray(value.webSearchQueries);
  const sourceReferences = Array.isArray(value.sourceReferences)
    ? value.sourceReferences
        .filter(isRecord)
        .map((source) => ({
          title: readString(source.title),
          uri: readString(source.uri),
          source: readOptionalString(source.source)
        }))
        .filter((source) => source.title && isSafeSourceReferenceUrl(source.uri))
    : null;

  if (!checked || !limitations || !sourceReferences) {
    return undefined;
  }

  return {
    checked,
    limitations,
    sourceReferences,
    webSearchQueries: webSearchQueries ?? []
  };
}

function validateImageQuality(value: unknown): Validation<ScanResult["imageQuality"]> {
  if (!isRecord(value)) {
    return invalid("imageQuality was missing.");
  }

  const readability = readString(value.readability);
  const issues = readStringArray(value.issues);

  if (!readabilityValues.has(readability) || !issues) {
    return invalid("imageQuality is malformed.");
  }

  return {
    ok: true,
    value: {
      readability: readability as ScanResult["imageQuality"]["readability"],
      issues,
      needsRetake:
        typeof value.needsRetake === "boolean"
          ? value.needsRetake
          : readability === "poor"
    }
  };
}

function validateRestaurantMessage(value: unknown): Validation<ScanResult["restaurantMessage"]> {
  if (value === undefined || value === null) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return invalid("restaurantMessage was malformed.");
  }

  const english = readString(value.english);
  if (!english) {
    return invalid("restaurantMessage.english is missing.");
  }

  return {
    ok: true,
    value: {
      english,
      translated: readOptionalString(value.translated),
      language: readOptionalString(value.language),
      userLanguageText: readOptionalString(value.userLanguageText),
      userLanguage: readOptionalString(value.userLanguage)
    }
  };
}

function invalid<T = ScanResult>(error: string): Validation<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const text = readString(value);
  return text || undefined;
}

function readRiskLevel(value: unknown): RiskLevel | null {
  const text = readString(value);
  return riskLevels.has(text as RiskLevel) ? (text as RiskLevel) : null;
}

function readEvidenceConfidence(value: unknown): EvidenceConfidence {
  const text = readString(value);
  return evidenceConfidenceValues.has(text as EvidenceConfidence) ? (text as EvidenceConfidence) : "low";
}

function readRiskBasisArray(value: unknown): RiskBasis[] {
  if (!Array.isArray(value)) {
    return ["unknown_ingredient"];
  }

  const riskBasis = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item): item is RiskBasis => riskBasisValues.has(item as RiskBasis));

  return riskBasis.length > 0 ? Array.from(new Set(riskBasis)) : ["unknown_ingredient"];
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isSafeSourceReferenceUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeCreatedAt(value: unknown): string {
  const text = readString(value);
  const parsedTime = Date.parse(text);
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (!text || !Number.isFinite(parsedTime) || parsedTime > Date.now() + oneDayMs) {
    return new Date().toISOString();
  }

  return text;
}

function hasConservativeUncertaintyText(value: string) {
  const text = value.toLowerCase();
  return [
    "visible menu",
    "visible text",
    "confirm",
    "ask staff",
    "cannot verify",
    "cannot confirm",
    "not confirmed",
    "unclear",
    "uncertain",
    "cross-contact",
    "kitchen"
  ].some((phrase) => text.includes(phrase));
}
