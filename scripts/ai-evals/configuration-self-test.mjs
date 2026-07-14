import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createConfigurationProvenance,
  getStaticConfigurationHashes,
  imagePreprocessingDescriptor,
  imagePreprocessingVersion
} from "../../supabase/functions/_shared/ai/configuration.mjs";
import { ontologyVersion } from "../../supabase/functions/_shared/ai/ontology.mjs";
import {
  createFallbackScanResult,
  normalizeModelScanResult,
  normalizationVersion
} from "../../supabase/functions/_shared/ai/normalization.mjs";
import { buildSystemPrompt, buildUserPrompt, promptVersion } from "../../supabase/functions/_shared/ai/prompts.mjs";
import {
  providerValidationVersion,
  validateModelScanResult
} from "../../supabase/functions/_shared/ai/provider-validation.mjs";
import {
  publicValidationVersion,
  validatePublicScanResult
} from "../../supabase/functions/_shared/ai/public-validation.mjs";
import {
  applyRiskPolicy,
  riskPolicyVersion
} from "../../supabase/functions/_shared/ai/risk-policy.mjs";
import {
  containsBannedSafetyLanguage,
  hasConservativeUncertaintyText,
  rewriteBannedSafetyLanguage,
  safetyLanguageVersion
} from "../../supabase/functions/_shared/ai/safety-language.mjs";
import {
  modelScanResultSchema,
  scanResultSchema,
  schemaVersion
} from "../../supabase/functions/_shared/ai/schemas.mjs";

const request = {
  profile: {
    id: "private-profile-id",
    name: "Private Person Name",
    preferredLanguage: "English",
    restaurantLanguage: "Japanese",
    allergies: [{
      id: "private-allergy-id",
      name: "Sesame",
      severity: "severe",
      avoidCrossContact: true,
      notes: "Avoid sesame oil"
    }]
  },
  restaurantLanguage: "Japanese"
};

const userPrompt = buildUserPrompt(request);
const parsedUserPrompt = JSON.parse(userPrompt);
assert.equal(userPrompt.includes("private-profile-id"), false);
assert.equal(userPrompt.includes("private-allergy-id"), false);
assert.equal(userPrompt.includes("Private Person Name"), false);
assert.deepEqual(parsedUserPrompt.allergyProfile, [{
  name: "Sesame",
  severity: "severe",
  avoidCrossContact: true,
  customDetails: "Avoid sesame oil"
}]);
assert.equal(parsedUserPrompt.restaurantLanguageMode, "requested");

const inferredLanguagePrompt = JSON.parse(buildUserPrompt({
  ...request,
  restaurantLanguage: "Not sure"
}));
assert.equal(inferredLanguagePrompt.restaurantLanguage, null);
assert.equal(inferredLanguagePrompt.restaurantLanguageMode, "infer_from_visible_menu");

const dishSchema = modelScanResultSchema.properties.dishes.items;
assert.ok(dishSchema.required.includes("evidence"));
for (const evidenceField of [
  "visibleMenuText",
  "directAllergenTerms",
  "allergenDerivatives",
  "commonRecipePatterns",
  "unknownPreparationComponents",
  "crossContactSignals",
  "uncertainties"
]) {
  assert.ok(dishSchema.properties.evidence.required.includes(evidenceField));
  assert.equal(dishSchema.properties.evidence.properties[evidenceField].type, "array");
}
assert.equal(dishSchema.properties.hiddenRiskIngredients, undefined);
assert.equal(dishSchema.properties.crossContactConcerns, undefined);
assert.equal(modelScanResultSchema.properties.restaurantMessage.properties.translated.type, "string");
assert.match(buildSystemPrompt(), /Use empty strings, never null/);

const validProviderResult = {
  restaurantName: "Ramen menu",
  scanSummary: {
    overallRisk: "ask_staff",
    summary: "The broth needs confirmation for the listed allergy.",
    limitations: "Visible menu text cannot confirm kitchen preparation or cross-contact."
  },
  pageAssessments: [{ pageNumber: 1, contentType: "dish_listing", readability: "clear", issues: [] }],
  dishes: [{
    dishName: "Tonkotsu ramen",
    menuDescription: "Pork broth, noodles, scallion",
    sourcePageNumbers: [1],
    riskLevel: "ask_staff",
    possibleAllergens: ["Sesame"],
    evidenceConfidence: "medium",
    riskBasis: ["unknown_ingredient"],
    evidence: {
      visibleMenuText: ["Pork broth, noodles, scallion"],
      directAllergenTerms: [],
      allergenDerivatives: [],
      commonRecipePatterns: ["Ramen seasoning oil may contain sesame."],
      unknownPreparationComponents: ["seasoning oil"],
      crossContactSignals: ["shared ladle"],
      uncertainties: ["The broth recipe is not listed."]
    },
    reason: "The visible description does not identify the broth seasoning.",
    questionsToAsk: ["[Sesame] この料理のスープや調味油にごまが含まれていますか？"],
    questionsToAskUserLanguage: ["Does the broth or seasoning oil contain sesame?"],
    conservativeLanguage: "Ask staff to confirm the broth and preparation before ordering."
  }],
  restaurantMessage: {
    english: "[Sesame: severe] I have a severe sesame allergy. Does this contain sesame?",
    translated: "[Sesame: severe] 私は重度のごまアレルギーがあります。この料理にごまが含まれていますか？",
    language: "Japanese",
    userLanguageText: "[Sesame: severe] I have a severe sesame allergy. Does this contain sesame?",
    userLanguage: "English"
  },
  imageQuality: {
    readability: "clear",
    issues: [],
    needsRetake: false
  }
};

const providerContext = {
  profile: request.profile,
  imageCount: 1,
  userLanguage: request.profile.preferredLanguage,
  restaurantLanguage: request.restaurantLanguage
};
const validateProvider = (value) => validateModelScanResult(value, providerContext);

assert.equal(validateProvider(validProviderResult), null);

const missingVisibleEvidence = structuredClone(validProviderResult);
missingVisibleEvidence.dishes[0].evidence.visibleMenuText = [];
assert.equal(
  validateProvider(missingVisibleEvidence),
  "provider_readable_dish_missing_visible_evidence"
);

const unsupportedObservedAllergen = structuredClone(validProviderResult);
unsupportedObservedAllergen.dishes[0].evidence.directAllergenTerms = ["sesame"];
assert.equal(
  validateProvider(unsupportedObservedAllergen),
  "provider_observed_allergen_not_supported"
);

const missingStaffQuestions = structuredClone(validProviderResult);
missingStaffQuestions.dishes[0].questionsToAsk = [];
assert.equal(validateProvider(missingStaffQuestions), "provider_invalid_dish_contract");

const poorWithoutRetake = structuredClone(validProviderResult);
poorWithoutRetake.imageQuality.readability = "poor";
poorWithoutRetake.imageQuality.needsRetake = false;
poorWithoutRetake.scanSummary.overallRisk = "unclear";
assert.equal(validateProvider(poorWithoutRetake), "provider_poor_image_missing_retake");

const poorWithoutReadableDishes = structuredClone(validProviderResult);
poorWithoutReadableDishes.imageQuality = { readability: "poor", issues: ["blur"], needsRetake: true };
poorWithoutReadableDishes.scanSummary.overallRisk = "unclear";
poorWithoutReadableDishes.dishes = [];
poorWithoutReadableDishes.pageAssessments[0] = {
  pageNumber: 1,
  contentType: "unusable_or_unknown",
  readability: "poor",
  issues: ["blur"]
};
assert.equal(validateProvider(poorWithoutReadableDishes), null);
const readableWithoutDishes = structuredClone(poorWithoutReadableDishes);
readableWithoutDishes.imageQuality = { readability: "clear", issues: [], needsRetake: false };
readableWithoutDishes.pageAssessments[0] = {
  pageNumber: 1,
  contentType: "dish_listing",
  readability: "clear",
  issues: []
};
assert.equal(validateProvider(readableWithoutDishes), "provider_invalid_dishes");

const lowRiskWithExplicitUncertainty = structuredClone(validProviderResult);
lowRiskWithExplicitUncertainty.dishes[0].riskLevel = "low_risk";
assert.equal(
  validateProvider(lowRiskWithExplicitUncertainty),
  "provider_uncertainty_inconsistent_with_risk"
);

const wrongProfileMessage = structuredClone(validProviderResult);
wrongProfileMessage.restaurantMessage.english = "[Dairy: mild] I have a mild dairy allergy.";
assert.equal(
  validateProvider(wrongProfileMessage),
  "provider_restaurant_message_not_profile_bound"
);

const wrongProfileQuestions = structuredClone(validProviderResult);
wrongProfileQuestions.dishes[0].questionsToAsk = ["Does this contain dairy?"];
assert.equal(
  validateProvider(wrongProfileQuestions),
  "provider_questions_not_profile_bound"
);

const wrongRestaurantLanguage = structuredClone(validProviderResult);
wrongRestaurantLanguage.dishes[0].questionsToAsk = ["[Sesame] Does this contain sesame?"];
wrongRestaurantLanguage.restaurantMessage.translated =
  "[Sesame: severe] I have a severe sesame allergy. Does this contain sesame?";
assert.equal(
  validateProvider(wrongRestaurantLanguage),
  "provider_restaurant_communication_wrong_language"
);

const wrongRestaurantMetadata = structuredClone(validProviderResult);
wrongRestaurantMetadata.restaurantMessage.language = "Korean";
assert.equal(
  validateProvider(wrongRestaurantMetadata),
  "provider_restaurant_language_metadata_mismatch"
);

const simplifiedChineseResult = structuredClone(validProviderResult);
simplifiedChineseResult.dishes[0].questionsToAsk = ["[Sesame] 这道菜含有芝麻吗？"];
simplifiedChineseResult.restaurantMessage.translated =
  "[Sesame: severe] 我有严重的芝麻过敏。这道菜含有芝麻吗？";
simplifiedChineseResult.restaurantMessage.language = "Chinese Simplified";
assert.equal(
  validateModelScanResult(simplifiedChineseResult, {
    ...providerContext,
    restaurantLanguage: "Chinese Simplified"
  }),
  null
);

const inventedDerivative = structuredClone(validProviderResult);
inventedDerivative.dishes[0].menuDescription = "House sauce";
inventedDerivative.dishes[0].evidence.visibleMenuText = ["House sauce"];
inventedDerivative.dishes[0].evidence.unknownPreparationComponents = [];
inventedDerivative.dishes[0].evidence.uncertainties = [];
inventedDerivative.dishes[0].evidence.allergenDerivatives = ["house sauce"];
inventedDerivative.dishes[0].riskBasis = ["visible_text"];
assert.equal(
  validateProvider(inventedDerivative),
  "provider_observed_allergen_not_profile_supported"
);

const uncoveredSecondPage = structuredClone(validProviderResult);
uncoveredSecondPage.pageAssessments.push({
  pageNumber: 2,
  contentType: "dish_listing",
  readability: "clear",
  issues: []
});
assert.equal(
  validateModelScanResult(uncoveredSecondPage, { profile: request.profile, imageCount: 2 }),
  "provider_dish_listing_page_missing_coverage"
);

const supportingInformationPage = structuredClone(uncoveredSecondPage);
supportingInformationPage.pageAssessments[1].contentType = "supporting_information";
assert.equal(
  validateModelScanResult(supportingInformationPage, { profile: request.profile, imageCount: 2 }),
  null,
  "A readable cover or allergen legend must not force the model to invent a dish."
);

const unusableButClearPage = structuredClone(supportingInformationPage);
unusableButClearPage.pageAssessments[1].contentType = "unusable_or_unknown";
assert.equal(
  validateModelScanResult(unusableButClearPage, { profile: request.profile, imageCount: 2 }),
  "provider_unusable_page_not_poor"
);

const providerSettings = {
  endpoint: "generateContent_v1beta",
  responseMimeType: "application/json",
  responseSchemaEnabled: true,
  groundingEnabled: false,
  temperature: "provider_default"
};
const first = await createConfigurationProvenance({
  provider: "gemini",
  model: "gemini-3.5-flash",
  thinkingLevel: "low",
  maxOutputTokens: 6000,
  providerSettings,
  wireSchema: modelScanResultSchema
});
const second = await createConfigurationProvenance({
  provider: "gemini",
  model: "gemini-3.5-flash",
  thinkingLevel: "low",
  maxOutputTokens: 6000,
  providerSettings,
  wireSchema: modelScanResultSchema
});
const changed = await createConfigurationProvenance({
  provider: "gemini",
  model: "gemini-3.5-flash",
  thinkingLevel: "medium",
  maxOutputTokens: 6000,
  providerSettings,
  wireSchema: modelScanResultSchema
});
const changedWireSettings = await createConfigurationProvenance({
  provider: "gemini",
  model: "gemini-3.5-flash",
  thinkingLevel: "low",
  maxOutputTokens: 6000,
  providerSettings: { ...providerSettings, groundingEnabled: true },
  wireSchema: modelScanResultSchema
});
const schemaDisabled = await createConfigurationProvenance({
  provider: "gemini",
  model: "gemini-3.5-flash",
  thinkingLevel: "low",
  maxOutputTokens: 6000,
  providerSettings: { ...providerSettings, responseSchemaEnabled: false },
  wireSchema: null
});

assert.deepEqual(first, second);
assert.notEqual(first.configurationSha256, changed.configurationSha256);
assert.notEqual(first.configurationSha256, changedWireSettings.configurationSha256);
assert.notEqual(first.configurationSha256, schemaDisabled.configurationSha256);
assert.equal(typeof first.wireSchemaSha256, "string");
assert.equal(schemaDisabled.wireSchemaSha256, null);
assert.equal(first.promptVersion, promptVersion);
assert.equal(first.schemaVersion, schemaVersion);
assert.equal(first.riskPolicyVersion, riskPolicyVersion);
assert.equal(first.ontologyVersion, ontologyVersion);
assert.equal(first.normalizationVersion, normalizationVersion);
assert.equal(first.safetyLanguageVersion, safetyLanguageVersion);
assert.equal(first.imagePreprocessingVersion, imagePreprocessingVersion);
assert.equal(first.providerValidationVersion, providerValidationVersion);
assert.equal(first.publicValidationVersion, publicValidationVersion);
assert.match(first.userPromptSha256, /^[0-9a-f]{64}$/);
assert.match(first.providerValidationSha256, /^[0-9a-f]{64}$/);
assert.match(first.publicValidationSha256, /^[0-9a-f]{64}$/);
assert.match(first.imagePreprocessingSha256, /^[0-9a-f]{64}$/);
assert.deepEqual(imagePreprocessingDescriptor, {
  version: imagePreprocessingVersion,
  format: "jpeg",
  maxLongEdge: 1600,
  compress: 0.72
});
assert.equal(scanResultSchema.properties.analysisSource.enum.includes("ai"), true);
assert.equal(
  scanResultSchema.properties.dishes.items.properties.transparency.properties.visibleMenuText.maxItems,
  5
);

assert.equal(containsBannedSafetyLanguage("This meal is safe to eat."), true);
assert.equal(containsBannedSafetyLanguage({ uri: "https://example.com/safe-to-eat" }), false);
assert.equal(
  containsBannedSafetyLanguage(rewriteBannedSafetyLanguage("This dish is definitely safe.")),
  false
);
assert.equal(
  hasConservativeUncertaintyText("Low risk based on visible menu text; confirm with staff."),
  true
);
for (const sample of [
  "Món này hoàn toàn an toàn.",
  "Bu yemek tamamen güvenli.",
  "To danie jest całkowicie bezpieczne.",
  "Hidangan ini sepenuhnya aman.",
  "Dit gerecht is volledig veilig."
]) {
  assert.equal(containsBannedSafetyLanguage(sample), true, `Missed banned assurance: ${sample}`);
  assert.equal(
    containsBannedSafetyLanguage(rewriteBannedSafetyLanguage(sample)),
    false,
    `Rewrite retained banned assurance: ${sample}`
  );
}
for (const sample of [
  "Hãy xác nhận với nhân viên.",
  "Personele sorun ve doğrulayın.",
  "Zapytaj personel i potwierdź.",
  "Tanyakan kepada staf untuk konfirmasi.",
  "Vraag het personeel om dit te bevestigen."
]) {
  assert.equal(hasConservativeUncertaintyText(sample), true, `Missed uncertainty marker: ${sample}`);
}
for (const sample of [
  "安全に食べられる",
  "먹어도 안전",
  "可以安全食用",
  "沒有風險",
  "ปลอดภัยที่จะกิน",
  "an toàn để ăn",
  "yemek için güvenli"
]) {
  assert.equal(containsBannedSafetyLanguage(sample), true, `Missed multilingual assurance: ${sample}`);
  const rewritten = rewriteBannedSafetyLanguage(sample);
  assert.notEqual(rewritten, sample, `Did not rewrite multilingual assurance: ${sample}`);
  assert.equal(containsBannedSafetyLanguage(rewritten), false, `Rewrite retained assurance: ${sample}`);
  assert.equal(hasConservativeUncertaintyText(rewritten), true, `Rewrite lost uncertainty: ${sample}`);
}

const normalizedProviderResult = normalizeModelScanResult(
  validProviderResult,
  "profile-test",
  { now: "2026-07-13T00:00:00.000Z", scanId: "scan-test", imageCount: 1 }
);
assert.equal(normalizedProviderResult.id, "scan-test");
assert.equal(normalizedProviderResult.createdAt, "2026-07-13T00:00:00.000Z");
assert.deepEqual(
  normalizedProviderResult.dishes[0].transparency.visibleMenuText,
  validProviderResult.dishes[0].evidence.visibleMenuText
);
assert.deepEqual(normalizedProviderResult.dishes[0].hiddenRiskIngredients, ["seasoning oil"]);
assert.deepEqual(normalizedProviderResult.dishes[0].crossContactConcerns, ["shared ladle"]);
assert.deepEqual(normalizedProviderResult.pageAssessments, [{
  pageNumber: 1,
  readability: "clear",
  issues: []
}]);
assert.equal(
  Object.hasOwn(normalizedProviderResult.pageAssessments[0], "contentType"),
  false,
  "Provider-only page classification must not widen the public ScanResult contract."
);
assert.deepEqual(normalizedProviderResult.dishes[0].sourcePageNumbers, [1]);
assert.equal(
  validatePublicScanResult(applyRiskPolicy(normalizedProviderResult, request.profile)),
  null,
  "Normalized page provenance must survive deterministic policy and the public wire contract."
);
assert.equal(
  normalizedProviderResult.restaurantMessage.english,
  "I have a severe sesame allergy. Does this contain sesame?"
);
assert.equal(
  normalizedProviderResult.restaurantMessage.userLanguageText,
  "I have a severe sesame allergy. Does this contain sesame?"
);
assert.doesNotMatch(JSON.stringify(normalizedProviderResult.restaurantMessage), /\[Sesame: severe\]/u);

const oversizedEvidence = structuredClone(validProviderResult);
oversizedEvidence.dishes[0].evidence.visibleMenuText = Array.from({ length: 8 }, (_, index) => `visible-${index}`);
oversizedEvidence.dishes[0].evidence.commonRecipePatterns = Array.from({ length: 8 }, (_, index) => `pattern-${index}`);
oversizedEvidence.dishes[0].evidence.uncertainties = Array.from({ length: 8 }, (_, index) => `uncertainty-${index}`);
const normalizedOversizedEvidence = normalizeModelScanResult(
  oversizedEvidence,
  "profile-test",
  { now: "2026-07-13T00:00:00.000Z", scanId: "scan-bounded", imageCount: 1 }
);
assert.equal(normalizedOversizedEvidence.dishes[0].transparency.visibleMenuText.length, 8);
assert.equal(normalizedOversizedEvidence.dishes[0].transparency.commonRiskPatterns.length, 8);
assert.equal(normalizedOversizedEvidence.dishes[0].transparency.uncertainty.length, 8);

const lateSevereEvidence = structuredClone(validProviderResult);
lateSevereEvidence.dishes[0] = {
  ...lateSevereEvidence.dishes[0],
  dishName: "Seasonal plate",
  menuDescription: "Chef selection",
  riskLevel: "low_risk",
  possibleAllergens: [],
  evidence: {
    visibleMenuText: [
      "seasonal",
      "chef selection",
      "fresh garnish",
      "daily plate",
      "special preparation",
      "sesame"
    ],
    directAllergenTerms: ["sesame"],
    allergenDerivatives: [],
    commonRecipePatterns: [],
    unknownPreparationComponents: [],
    crossContactSignals: [],
    uncertainties: []
  },
  riskBasis: ["visible_text"],
  evidenceConfidence: "high"
};
const normalizedLateSevereEvidence = normalizeModelScanResult(
  lateSevereEvidence,
  request.profile.id,
  { now: "2026-07-13T00:00:00.000Z", scanId: "scan-late-evidence", imageCount: 1 }
);
const policyLateSevereEvidence = applyRiskPolicy(normalizedLateSevereEvidence, request.profile);
assert.equal(
  policyLateSevereEvidence.dishes[0].riskLevel,
  "avoid_unless_confirmed",
  "Every provider-accepted visible evidence item must participate in deterministic risk floors."
);

const poorProviderResult = structuredClone(validProviderResult);
poorProviderResult.imageQuality = { readability: "poor", issues: ["blur"], needsRetake: true };
poorProviderResult.scanSummary.overallRisk = "unclear";
poorProviderResult.dishes[0].evidence.visibleMenuText = [];
poorProviderResult.dishes[0].evidence.directAllergenTerms = [];
poorProviderResult.dishes[0].evidence.allergenDerivatives = [];
const normalizedPoor = normalizeModelScanResult(
  poorProviderResult,
  "profile-test",
  { now: "2026-07-13T00:00:00.000Z", scanId: "scan-poor", imageCount: 1 }
);
assert.deepEqual(normalizedPoor.dishes[0].transparency.visibleMenuText, []);

const normalizedPoorWithoutDishes = normalizeModelScanResult(
  poorWithoutReadableDishes,
  "profile-test",
  { now: "2026-07-13T00:00:00.000Z", scanId: "scan-poor-empty", imageCount: 1 }
);
assert.equal(normalizedPoorWithoutDishes.dishes.length, 1);
assert.equal(normalizedPoorWithoutDishes.dishes[0].riskLevel, "unclear");
assert.equal(normalizedPoorWithoutDishes.dishes[0].dishName, "Menu image unclear");

const multiPageFallback = createFallbackScanResult("profile-test", "gemini-test", {
  now: "2026-07-13T00:00:00.000Z",
  scanId: "scan-multi-fallback",
  imageCount: 3
});
assert.deepEqual(multiPageFallback.pageAssessments.map((page) => page.pageNumber), [1, 2, 3]);
assert.ok(multiPageFallback.pageAssessments.every((page) => page.readability === "poor"));
assert.equal(multiPageFallback.dishes[0].sourcePageNumbers.length, 0);
assert.equal(validatePublicScanResult(multiPageFallback), null);

const imageServiceSource = fs.readFileSync("src/services/imageService.ts", "utf8");
assert.ok(imageServiceSource.includes(`version: "${imagePreprocessingVersion}"`));
assert.ok(imageServiceSource.includes("maxLongEdge: 1600"));
assert.ok(imageServiceSource.includes("compress: 0.72"));

const hashes = await getStaticConfigurationHashes();
for (const value of Object.values(hashes)) {
  assert.match(value, /^[0-9a-f]{64}$/);
}

console.log(`AI configuration self-tests passed for prompt ${promptVersion}, schema ${schemaVersion}, policy ${riskPolicyVersion}, ontology ${ontologyVersion}.`);
