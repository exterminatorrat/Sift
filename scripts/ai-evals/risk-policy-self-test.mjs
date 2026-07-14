import assert from "node:assert/strict";

import {
  ontologyEntriesForAllergy,
  preparationSignals
} from "../../supabase/functions/_shared/ai/ontology.mjs";
import {
  normalizeModelScanResult,
  sanitizeScanResult
} from "../../supabase/functions/_shared/ai/normalization.mjs";
import { policyMessageForRisk } from "../../supabase/functions/_shared/ai/policy-copy.mjs";
import { validateModelScanResult } from "../../supabase/functions/_shared/ai/provider-validation.mjs";
import { applyRiskPolicy, riskPolicyVersion } from "../../supabase/functions/_shared/ai/risk-policy.mjs";
import {
  containsBannedSafetyLanguage,
  hasConservativeUncertaintyText
} from "../../supabase/functions/_shared/ai/safety-language.mjs";

const severeSesameProfile = profile([
  allergy("Sesame", "severe", true)
]);

const directResult = applyRiskPolicy(result([
  dish("Hummus Plate", "Hummus with tahini", ["tahini"]),
  dish("Plain Apple", "Fresh apple slices", ["Fresh apple slices"])
]), severeSesameProfile);

assert.equal(directResult.dishes[0].riskLevel, "avoid_unless_confirmed");
assert.ok(directResult.dishes[0].possibleAllergens.includes("Sesame"));
assert.equal(directResult.dishes[1].riskLevel, "low_risk", "A direct allergen in one dish leaked into a benign dish.");

const outOfOntologyProviderResult = providerEvidenceResult({
  dishName: "سلطة موسمية",
  menuDescription: "سلطة مع سمسم محمص",
  possibleAllergens: ["Sesame"],
  visibleMenuText: ["سلطة مع سمسم محمص"],
  directAllergenTerms: ["سمسم"]
});
assert.equal(
  validateModelScanResult(outOfOntologyProviderResult, { profile: severeSesameProfile, imageCount: 1 }),
  "provider_observed_allergen_not_profile_supported"
);
const outOfOntologyResult = applyRiskPolicy(
  sanitizeScanResult(normalizeModelScanResult(outOfOntologyProviderResult, severeSesameProfile.id)),
  severeSesameProfile
);
assert.equal(
  outOfOntologyResult.dishes[0].riskLevel,
  "avoid_unless_confirmed",
  "Observed profile evidence outside the ontology must still receive the severe direct-evidence floor."
);
assert.ok(outOfOntologyResult.dishes[0].possibleAllergens.includes("Sesame"));
assert.equal(
  "__policyEvidence" in outOfOntologyResult.dishes[0],
  false,
  "Private provider evidence must not reach the public ScanResult."
);
assert.equal(JSON.stringify(outOfOntologyResult).includes("__policyEvidence"), false);

const derivativeProviderResult = providerEvidenceResult({
  dishName: "Seasonal bread",
  menuDescription: "Made with lupin flour",
  possibleAllergens: ["Lupin"],
  visibleMenuText: ["Made with lupin flour"],
  allergenDerivatives: ["lupin flour"]
});
const severeLupinProfile = profile([allergy("Lupin", "severe", true)]);
assert.equal(
  validateModelScanResult(derivativeProviderResult, { profile: severeLupinProfile, imageCount: 1 }),
  null
);
const derivativeResult = applyRiskPolicy(
  sanitizeScanResult(normalizeModelScanResult(derivativeProviderResult, severeLupinProfile.id)),
  severeLupinProfile
);
assert.equal(
  derivativeResult.dishes[0].riskLevel,
  "avoid_unless_confirmed",
  "Observed severe allergen derivatives must floor avoid_unless_confirmed."
);
assert.equal("__policyEvidence" in derivativeResult.dishes[0], false);

const inconsistentProviderResult = providerEvidenceResult({
  dishName: "Sesame salad",
  menuDescription: "Salad with sesame",
  possibleAllergens: [],
  visibleMenuText: ["Salad with sesame"],
  directAllergenTerms: ["sesame"]
});
assert.equal(
  validateModelScanResult(inconsistentProviderResult, { profile: severeSesameProfile, imageCount: 1 }),
  "provider_inconsistent_direct_evidence",
  "Observed allergen evidence without an allergen claim must fail provider validation."
);

for (const mutate of [
  (dishValue) => { dishValue.riskBasis = ["common_pattern"]; },
  (dishValue) => { dishValue.riskLevel = "low_risk"; }
]) {
  const inconsistentDirectEvidence = providerEvidenceResult({
    dishName: "Sesame salad",
    menuDescription: "Salad with sesame",
    possibleAllergens: ["Sesame"],
    visibleMenuText: ["Salad with sesame"],
    directAllergenTerms: ["sesame"]
  });
  mutate(inconsistentDirectEvidence.dishes[0]);
  assert.equal(
    validateModelScanResult(inconsistentDirectEvidence, { profile: severeSesameProfile, imageCount: 1 }),
    "provider_inconsistent_direct_evidence",
    "Observed evidence with an inconsistent risk contract must fail provider validation."
  );
}

const inconsistentPolicyDish = dish("Mystery garnish", "Unknown allergen garnish", ["Unknown allergen garnish"]);
inconsistentPolicyDish.__policyEvidence = {
  directAllergenTerms: ["unknown allergen"],
  allergenDerivatives: []
};
const inconsistentPolicyResult = applyRiskPolicy(result([inconsistentPolicyDish]), severeSesameProfile);
assert.equal(
  inconsistentPolicyResult.dishes[0].riskLevel,
  "avoid_unless_confirmed",
  "Profile-inconsistent observed evidence must fail closed for a severe profile."
);
assert.equal("__policyEvidence" in inconsistentPolicyResult.dishes[0], false);

const sesameRelationships = ontologyEntriesForAllergy(allergy("Sesame", "severe", true));
assert.equal(
  sesameRelationships.find((entry) => entry.term === "tahini")?.relationship,
  "contains_allergen"
);
const peanutRelationships = ontologyEntriesForAllergy(allergy("Peanut", "severe", true));
assert.equal(
  peanutRelationships.find((entry) => entry.term === "mole")?.relationship,
  "ambiguous_association"
);

const mildTahiniResult = applyRiskPolicy(result([
  dish("Tahini Toast", "Toast with tahini", ["tahini"])
]), profile([allergy("Sesame", "mild", false)]));
assert.equal(mildTahiniResult.dishes[0].riskLevel, "high_risk");

const molePatternResult = applyRiskPolicy(result([
  dish("Chicken Mole", "Chicken with mole sauce", ["mole sauce"])
]), profile([allergy("Peanut", "severe", true)]));
assert.equal(molePatternResult.dishes[0].riskLevel, "ask_staff");

const vagueResult = applyRiskPolicy(result([
  dish("Grilled Chicken", "Grilled chicken with house sauce", ["house sauce"])
]), severeSesameProfile);
assert.equal(vagueResult.dishes[0].riskLevel, "ask_staff");
assert.ok(vagueResult.dishes[0].riskBasis.includes("unknown_ingredient"));
assert.ok(vagueResult.dishes[0].questionsToAsk.length > 0);

const inferredVagueDish = dish("Grilled Chicken", "Grilled chicken", ["Grilled chicken"]);
inferredVagueDish.hiddenRiskIngredients = ["house sauce"];
inferredVagueDish.transparency.commonRiskPatterns = ["house sauce"];
const inferredVagueResult = applyRiskPolicy(result([inferredVagueDish]), severeSesameProfile);
assert.equal(inferredVagueResult.dishes[0].riskLevel, "ask_staff");
assert.equal(
  inferredVagueResult.dishes[0].transparency.visibleMenuText.includes("house sauce"),
  false,
  "Inferred preparation evidence must never be relabeled as visible menu text."
);
assert.equal(
  inferredVagueResult.dishes[0].crossContactConcerns.includes("house sauce"),
  false,
  "A vague sauce must not be relabeled as a cross-contact observation."
);

assert.equal(
  preparationSignals.find((entry) => entry.term === "shared fryer")?.relationship,
  "cross_contact_question"
);
assert.equal(
  preparationSignals.find((entry) => entry.term === "house sauce")?.relationship,
  "preparation_risk"
);

const poorImage = result([
  dish("Simple Rice", "Plain rice", ["Plain rice"])
]);
poorImage.imageQuality = {
  readability: "poor",
  issues: ["Blur and low resolution obscure ingredients."],
  needsRetake: true
};
const poorResult = applyRiskPolicy(poorImage, severeSesameProfile);
assert.equal(poorResult.scanSummary.overallRisk, "unclear");
assert.equal(poorResult.dishes[0].riskLevel, "unclear");
assert.equal(poorResult.imageQuality.needsRetake, true);

const singleIssueInferredPoorImage = result([
  dish("Simple Rice", "Plain rice", ["Plain rice"])
]);
singleIssueInferredPoorImage.imageQuality = {
  readability: "partially_clear",
  issues: ["Blur and low resolution obscure the ingredient text."],
  needsRetake: false
};
const singleIssueInferredPoorResult = applyRiskPolicy(singleIssueInferredPoorImage, severeSesameProfile);
assert.equal(singleIssueInferredPoorResult.imageQuality.readability, "poor");
assert.equal(singleIssueInferredPoorResult.imageQuality.needsRetake, true);
assert.equal(
  singleIssueInferredPoorResult.dishes[0].riskLevel,
  "unclear",
  "A dish must not remain low risk when server policy infers a poor image."
);
assert.equal(
  singleIssueInferredPoorResult.dishes.some((candidate) => candidate.riskLevel === "low_risk"),
  false,
  "Poor-image results must not expose reassuring low-risk dishes."
);

const customDetailProfile = profile([
  { ...allergy("Peanut", "severe", true), notes: "Avoid peanut oil too" }
]);
const customDetailResult = applyRiskPolicy(result([
  dish("Fried Noodles", "Noodles cooked in peanut oil", ["peanut oil"])
]), customDetailProfile);
assert.equal(customDetailResult.dishes[0].riskLevel, "avoid_unless_confirmed");

const contradictoryDish = dish("Sesame Special", "Chef's special", ["Chef's special"]);
contradictoryDish.possibleAllergens = ["Sesame"];
contradictoryDish.hiddenRiskIngredients = ["tahini"];
contradictoryDish.crossContactConcerns = ["Shared equipment with sesame dishes"];
const contradictoryResult = applyRiskPolicy(result([contradictoryDish]), severeSesameProfile);
assert.equal(
  contradictoryResult.dishes[0].riskLevel,
  "avoid_unless_confirmed",
  "Contradictory model evidence must not remain low risk."
);
assert.ok(contradictoryResult.dishes[0].riskBasis.includes("cross_contact"));
assert.doesNotMatch(contradictoryResult.dishes[0].conservativeLanguage, /low risk/i);
assert.equal(
  contradictoryResult.scanSummary.summary,
  policyMessageForRisk("avoid_unless_confirmed", "English")
);

const possibleOnlyDish = dish("Chef Salad", "Seasonal salad", ["Seasonal salad"]);
possibleOnlyDish.possibleAllergens = ["Sesame"];
const possibleOnlyResult = applyRiskPolicy(result([possibleOnlyDish]), severeSesameProfile);
assert.equal(
  possibleOnlyResult.dishes[0].riskLevel,
  "high_risk",
  "A model-reported possible severe allergen must not remain low risk."
);

const unrelatedClaimDish = dish("Plain Rice", "Plain rice", ["Plain rice"]);
unrelatedClaimDish.possibleAllergens = ["Dairy"];
unrelatedClaimDish.hiddenRiskIngredients = ["cheese", "house sauce"];
unrelatedClaimDish.crossContactConcerns = ["shared with milk dishes", "shared fryer"];
const unrelatedClaimResult = applyRiskPolicy(result([unrelatedClaimDish]), severeSesameProfile);
assert.deepEqual(
  unrelatedClaimResult.dishes[0].possibleAllergens,
  [],
  "Provider allergen claims outside the supplied profile must not reach the public result."
);
assert.deepEqual(unrelatedClaimResult.dishes[0].hiddenRiskIngredients, ["house sauce"]);
assert.deepEqual(unrelatedClaimResult.dishes[0].crossContactConcerns, ["shared fryer"]);

const explicitlyUncertainDish = dish("House salad", "House salad", ["House salad"]);
explicitlyUncertainDish.__policyEvidence = {
  directAllergenTerms: [],
  allergenDerivatives: [],
  uncertainties: ["The allergen legend is cut off and peanut status is unknown."]
};
const explicitlyUncertainResult = applyRiskPolicy(
  result([explicitlyUncertainDish]),
  profile([allergy("Peanut", "severe", true)])
);
assert.equal(
  explicitlyUncertainResult.dishes[0].riskLevel,
  "ask_staff",
  "Explicit provider uncertainty must not remain low risk."
);

const askDish = dish("Soup", "House soup", ["House soup"]);
askDish.riskLevel = "ask_staff";
const unclearDish = dish("Unreadable special", "", ["Unreadable special"]);
unclearDish.riskLevel = "unclear";
assert.equal(
  applyRiskPolicy(result([askDish, unclearDish]), severeSesameProfile).scanSummary.overallRisk,
  "unclear"
);
assert.equal(
  applyRiskPolicy(result([unclearDish, askDish]), severeSesameProfile).scanSummary.overallRisk,
  "unclear",
  "Overall risk must not depend on dish order when unclear and ask_staff coexist."
);

for (const sample of [
  { allergyName: "Dairy", dishName: "Käse Teller", visibleText: "Käse", expectedRisk: "avoid_unless_confirmed" },
  { allergyName: "Shellfish", dishName: "Camarão Grelhado", visibleText: "Camarão", expectedRisk: "avoid_unless_confirmed" },
  { allergyName: "Shellfish", dishName: "새우 구이", visibleText: "새우", expectedRisk: "avoid_unless_confirmed" }
]) {
  const multilingualResult = applyRiskPolicy(result([
    dish(sample.dishName, sample.visibleText, [sample.visibleText])
  ]), profile([allergy(sample.allergyName, "severe", true)]));
  assert.equal(
    multilingualResult.dishes[0].riskLevel,
    sample.expectedRisk,
    `${sample.visibleText} should match the multilingual ontology.`
  );
}

for (const language of [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Korean",
  "Chinese Simplified", "Chinese Traditional", "Thai", "Vietnamese", "Turkish", "Polish",
  "Indonesian", "Dutch"
]) {
  for (const riskLevel of ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]) {
    const message = policyMessageForRisk(riskLevel, language);
    assert.ok(message.length > 0, `${language} ${riskLevel} policy copy is missing.`);
    assert.equal(
      containsBannedSafetyLanguage(message),
      false,
      `${language} ${riskLevel} policy copy contains banned assurance language.`
    );
  }
  assert.equal(
    hasConservativeUncertaintyText(policyMessageForRisk("low_risk", language)),
    true,
    `${language} low-risk policy copy lacks a confirmation or visible-text marker.`
  );
}

const vietnamesePolicyResult = applyRiskPolicy(result([
  dish("Camarão grelhado", "Camarão", ["Camarão"])
]), profile([allergy("Shellfish", "severe", true)], "Vietnamese"));
assert.equal(
  vietnamesePolicyResult.scanSummary.summary,
  policyMessageForRisk("avoid_unless_confirmed", "Vietnamese")
);

assert.match(riskPolicyVersion, /^\d{4}-\d{2}-\d{2}\.\d+$/);
console.log(`Risk policy ${riskPolicyVersion} self-tests passed.`);

function providerEvidenceResult({
  dishName,
  menuDescription,
  possibleAllergens,
  visibleMenuText,
  directAllergenTerms = [],
  allergenDerivatives = []
}) {
  const communicationAllergen = possibleAllergens[0] ?? directAllergenTerms[0] ?? allergenDerivatives[0] ?? "Allergy";
  return {
    restaurantName: "Test menu",
    scanSummary: {
      overallRisk: "high_risk",
      summary: "Visible menu text requires staff confirmation.",
      limitations: "Visible menu text cannot verify kitchen preparation or cross-contact."
    },
    pageAssessments: [{ pageNumber: 1, contentType: "dish_listing", readability: "clear", issues: [] }],
    dishes: [{
      dishName,
      menuDescription,
      sourcePageNumbers: [1],
      riskLevel: "high_risk",
      possibleAllergens,
      evidenceConfidence: "high",
      riskBasis: ["visible_text"],
      evidence: {
        visibleMenuText,
        directAllergenTerms,
        allergenDerivatives,
        commonRecipePatterns: [],
        unknownPreparationComponents: [],
        crossContactSignals: [],
        uncertainties: []
      },
      reason: "The visible menu text requires staff confirmation.",
      questionsToAsk: [`Can you confirm whether this contains ${communicationAllergen}?`],
      questionsToAskUserLanguage: [`Can you confirm whether this contains ${communicationAllergen}?`],
      conservativeLanguage: "Confirm the visible menu text and preparation with staff."
    }],
    restaurantMessage: {
      english: `[${communicationAllergen}: severe] Please confirm the listed allergens and preparation.`,
      translated: "",
      language: "",
      userLanguageText: `[${communicationAllergen}: severe] Please confirm the listed allergens and preparation.`,
      userLanguage: "English"
    },
    imageQuality: {
      readability: "clear",
      issues: [],
      needsRetake: false
    }
  };
}

function allergy(name, severity, avoidCrossContact) {
  return {
    id: `allergy-${name.toLowerCase()}`,
    name,
    severity,
    avoidCrossContact
  };
}

function profile(allergies, preferredLanguage = "English") {
  return {
    id: "profile-test",
    name: "Test profile",
    allergies,
    preferredLanguage,
    restaurantLanguage: "English"
  };
}

function dish(dishName, menuDescription, visibleMenuText) {
  return {
    id: dishName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    dishName,
    menuDescription,
    riskLevel: "low_risk",
    possibleAllergens: [],
    hiddenRiskIngredients: [],
    crossContactConcerns: [],
    evidenceConfidence: "high",
    riskBasis: ["visible_text"],
    reason: "No obvious concern from visible menu text; confirm with staff.",
    questionsToAsk: ["Can you confirm the ingredients and preparation?"],
    questionsToAskUserLanguage: ["Can you confirm the ingredients and preparation?"],
    conservativeLanguage: "Low risk based on visible menu text; confirm with staff.",
    transparency: {
      visibleMenuText,
      profileFactors: [],
      commonRiskPatterns: [],
      uncertainty: []
    }
  };
}

function result(dishes) {
  return {
    id: "scan-test",
    createdAt: "2026-07-13T00:00:00.000Z",
    imageUri: null,
    restaurantName: "Test menu",
    profileId: "profile-test",
    scanSummary: {
      overallRisk: "low_risk",
      summary: "No obvious concern from visible menu text; confirm with staff.",
      limitations: "Visible menu text only; kitchen preparation and cross-contact cannot be verified."
    },
    dishes,
    restaurantMessage: null,
    imageQuality: {
      readability: "clear",
      issues: [],
      needsRetake: false
    },
    transparency: {
      checked: ["Menu photo", "Allergy profile"],
      limitations: ["Kitchen preparation cannot be verified."],
      sourceReferences: [],
      webSearchQueries: []
    }
  };
}
