import {
  containsBannedSafetyLanguage,
  hasConservativeUncertaintyText
} from "./safety-language.mjs";
import { scanResultSchema } from "./schemas.mjs";

export const publicValidationVersion = "2026-07-14.4";

export function validatePublicScanResult(value) {
  const schemaError = validateJsonSchema(value, scanResultSchema, "$", new Set());
  if (schemaError) return schemaError;

  if (containsBannedSafetyLanguage(value)) return "banned_safety_language";
  if (!isValidDateString(value.createdAt)) return "invalid_created_at";
  if (!hasConservativeUncertaintyText(value.scanSummary.limitations)) {
    return "summary_missing_uncertainty";
  }

  if (value.pageAssessments.some((page, index) => page.pageNumber !== index + 1)) {
    return "page_assessments_out_of_order";
  }
  const pageCount = value.pageAssessments.length;
  const readablePages = value.pageAssessments.filter((page) => page.readability !== "poor");
  const expectedAggregateReadability = value.pageAssessments.some((page) => page.readability === "poor")
    ? "poor"
    : value.pageAssessments.some((page) => page.readability === "partially_clear")
      ? "partially_clear"
      : "clear";
  if (value.imageQuality.readability !== expectedAggregateReadability) {
    return "aggregate_page_readability_mismatch";
  }
  for (const dish of value.dishes) {
    if (
      !isValidPageNumberArray(dish.sourcePageNumbers, pageCount) ||
      (readablePages.length > 0 && dish.sourcePageNumbers.length === 0)
    ) {
      return "invalid_dish_source_pages";
    }
    if (value.imageQuality.readability === "poor" && dish.riskLevel === "low_risk") {
      return "poor_image_contains_low_risk_dish";
    }
    if (
      dish.riskLevel === "low_risk" &&
      !hasConservativeUncertaintyText(`${dish.reason} ${dish.conservativeLanguage}`)
    ) {
      return "low_risk_missing_confirmation_language";
    }
    if (
      dish.riskLevel === "low_risk" &&
      (dish.possibleAllergens.length > 0 ||
        dish.hiddenRiskIngredients.length > 0 ||
        dish.crossContactConcerns.length > 0)
    ) {
      return "low_risk_contradicts_reported_concerns";
    }
    if (
      dish.riskLevel === "low_risk" &&
      dish.riskBasis.some((basis) => basis !== "visible_text")
    ) {
      return "low_risk_contradicts_uncertain_risk_basis";
    }
  }

  if (
    value.imageQuality.readability === "poor" &&
    (value.imageQuality.needsRetake !== true || value.scanSummary.overallRisk !== "unclear")
  ) {
    return "poor_image_missing_unclear_retake";
  }

  if (value.transparency.sourceReferences.some((source) => !isHttpsUrl(source.uri))) {
    return "invalid_transparency_source_uri";
  }

  if (
    value.restaurantMessage?.translated &&
    !readString(value.restaurantMessage.userLanguageText)
  ) {
    return "missing_user_language_restaurant_message";
  }

  return null;
}

export function getPublicValidationFingerprintSource() {
  return [
    publicValidationVersion,
    validatePublicScanResult,
    validateJsonSchema,
    matchesType,
    isValidDateString,
    isValidPageNumberArray,
    isHttpsUrl,
    readString,
    isRecord
  ].map(String).join("\n---\n");
}

function isValidPageNumberArray(value, pageCount) {
  return Array.isArray(value)
    && value.every((pageNumber) => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= pageCount)
    && new Set(value).size === value.length;
}

function validateJsonSchema(value, schema, path, seen) {
  if (!schema || typeof schema !== "object") return `${path}:invalid_schema`;

  if (schema.enum && !schema.enum.includes(value)) return `${path}:invalid_enum`;
  if (schema.type && !matchesType(value, schema.type)) return `${path}:invalid_type`;

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      return `${path}:too_few_items`;
    }
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      return `${path}:too_many_items`;
    }
    for (let index = 0; index < value.length; index += 1) {
      const error = validateJsonSchema(value[index], schema.items, `${path}[${index}]`, seen);
      if (error) return error;
    }
    return null;
  }

  if (!isRecord(value)) return null;
  if (seen.has(value)) return `${path}:cyclic_value`;
  seen.add(value);
  try {
    for (const requiredKey of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(value, requiredKey)) {
        return `${path}.${requiredKey}:missing_required_property`;
      }
    }

    const properties = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      const unknownKey = Object.keys(value).find((key) => !Object.prototype.hasOwnProperty.call(properties, key));
      if (unknownKey) return `${path}.${unknownKey}:additional_property`;
    }

    for (const [key, child] of Object.entries(value)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) continue;
      const error = validateJsonSchema(child, properties[key], `${path}.${key}`, seen);
      if (error) return error;
    }
    return null;
  } finally {
    seen.delete(value);
  }
}

function matchesType(value, expected) {
  const types = Array.isArray(expected) ? expected : [expected];
  return types.some((type) => {
    if (type === "null") return value === null;
    if (type === "array") return Array.isArray(value);
    if (type === "object") return isRecord(value);
    if (type === "integer") return Number.isInteger(value);
    if (type === "number") return typeof value === "number" && Number.isFinite(value);
    return typeof value === type;
  });
}

function isValidDateString(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
