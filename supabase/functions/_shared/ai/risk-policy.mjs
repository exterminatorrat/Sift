import {
  allergenRelationships,
  normalizeOntologyTerm,
  ontologyEntriesForAllergy,
  preparationSignals,
  riskRank
} from "./ontology.mjs";
import {
  getPolicyCopyFingerprintSource,
  policyMessageForRisk
} from "./policy-copy.mjs";

export const riskPolicyVersion = "2026-07-14.4";

const evidenceConfidenceValues = new Set(["high", "medium", "low"]);
const riskBasisValues = new Set([
  "visible_text",
  "common_pattern",
  "unknown_ingredient",
  "cross_contact",
  "translation_uncertain",
  "image_uncertain"
]);

export function applyRiskPolicy(scanResult, profile) {
  const hasSevereAllergy = profile.allergies.some((allergy) => allergy.severity === "severe");
  const hasSensitiveAllergy = profile.allergies.some(
    (allergy) => allergy.severity === "severe" || allergy.avoidCrossContact
  );
  const poorImage = inferPoorImage(scanResult, hasSensitiveAllergy);

  const dishes = scanResult.dishes.map((dish) => {
    const policyEvidence = readPolicyEvidence(dish.__policyEvidence);
    const { __policyEvidence: _privatePolicyEvidence, ...publicDish } = dish;
    const reportedPossibleAllergens = uniqueStrings(publicDish.possibleAllergens);
    let nextDish = {
      ...publicDish,
      possibleAllergens: reportedPossibleAllergens.filter((claim) =>
        isProfileAllergenClaim(claim, profile.allergies)
      ),
      hiddenRiskIngredients: uniqueStrings(publicDish.hiddenRiskIngredients).filter((claim) =>
        isProfileRelevantEvidence(claim, profile.allergies)
      ),
      crossContactConcerns: uniqueStrings(publicDish.crossContactConcerns).filter((claim) =>
        isProfileRelevantEvidence(claim, profile.allergies)
      ),
      riskBasis: uniqueRiskBasis(publicDish.riskBasis),
      evidenceConfidence: evidenceConfidenceValues.has(publicDish.evidenceConfidence)
        ? publicDish.evidenceConfidence
        : "low"
    };

    const observedAllergenEvidence = uniqueStrings([
      ...policyEvidence.directAllergenTerms,
      ...policyEvidence.allergenDerivatives
    ]);
    if (policyEvidence.uncertainties.length > 0) {
      const uncertaintyBasis = uncertaintyRiskBasis(policyEvidence.uncertainties);
      nextDish = {
        ...nextDish,
        riskLevel: escalateRisk(nextDish.riskLevel, "ask_staff"),
        riskBasis: uniqueRiskBasis([...nextDish.riskBasis, ...uncertaintyBasis]),
        transparency: appendDishTransparency(nextDish.transparency, {
          uncertainty: policyEvidence.uncertainties
        })
      };
    }
    if (observedAllergenEvidence.length > 0) {
      const matchedProfileAllergies = profile.allergies.filter((allergy) =>
        observedAllergenEvidence.some((term) => isClaimForAllergy(term, allergy)) ||
        reportedPossibleAllergens.some((claim) => isClaimForAllergy(claim, allergy))
      );

      if (matchedProfileAllergies.length === 0) {
        nextDish = {
          ...nextDish,
          riskLevel: escalateRisk(
            nextDish.riskLevel,
            hasSevereAllergy ? "avoid_unless_confirmed" : "high_risk"
          ),
          riskBasis: uniqueRiskBasis([...nextDish.riskBasis, "visible_text", "unknown_ingredient"]),
          transparency: appendDishTransparency(nextDish.transparency, {
            profileFactors: profile.allergies.map(formatProfileFactor),
            uncertainty: [
              "Observed allergen evidence could not be reconciled with the supplied profile, so reassuring language is not supported."
            ]
          })
        };
      } else {
        for (const allergy of matchedProfileAllergies) {
          nextDish = {
            ...nextDish,
            riskLevel: escalateRisk(
              nextDish.riskLevel,
              allergy.severity === "severe" ? "avoid_unless_confirmed" : "high_risk"
            ),
            possibleAllergens: uniqueStrings([...nextDish.possibleAllergens, allergy.name]),
            riskBasis: uniqueRiskBasis([...nextDish.riskBasis, "visible_text"]),
            transparency: appendDishTransparency(nextDish.transparency, {
              profileFactors: [formatProfileFactor(allergy)],
              uncertainty: [
                "Observed menu text directly names this allergen or an allergen derivative."
              ]
            })
          };
        }
      }
    }
    if (nextDish.hiddenRiskIngredients.length > 0) {
      nextDish = {
        ...nextDish,
        riskLevel: escalateRisk(nextDish.riskLevel, "ask_staff"),
        riskBasis: uniqueRiskBasis([...nextDish.riskBasis, "unknown_ingredient"])
      };
    }
    if (nextDish.crossContactConcerns.length > 0) {
      nextDish = {
        ...nextDish,
        riskLevel: escalateRisk(nextDish.riskLevel, "ask_staff"),
        riskBasis: uniqueRiskBasis([...nextDish.riskBasis, "cross_contact"])
      };
    }

    const visibleDishText = buildVisibleDishSearchText(nextDish);
    const possibleAllergenText = nextDish.possibleAllergens.join(" ");
    const hiddenRiskText = [
      ...nextDish.hiddenRiskIngredients,
      ...(nextDish.transparency?.commonRiskPatterns ?? [])
    ].join(" ");
    const crossContactText = nextDish.crossContactConcerns.join(" ");
    const visiblePrepSignals = matchOntologyEntries(visibleDishText, preparationSignals);
    const inferredPrepSignals = matchOntologyEntries(hiddenRiskText, preparationSignals);
    const reportedCrossContactSignals = matchOntologyEntries(crossContactText, preparationSignals);
    const allPrepSignals = uniqueOntologyMatches([
      ...visiblePrepSignals,
      ...inferredPrepSignals,
      ...reportedCrossContactSignals
    ]);
    const unknownPrepMatches = allPrepSignals
      .filter((entry) => entry.riskBasis?.includes("unknown_ingredient"))
      .map((entry) => entry.term);
    const crossContactPrepMatches = allPrepSignals
      .filter((entry) => entry.riskBasis?.includes("cross_contact"))
      .map((entry) => entry.term);

    for (const allergy of profile.allergies) {
      const relationships = ontologyEntriesForAllergy(allergy);
      if (relationships.length === 0) {
        continue;
      }

      const visibleRelationships = matchOntologyEntries(visibleDishText, relationships);
      const possibleRelationships = matchOntologyEntries(possibleAllergenText, relationships);
      const hiddenRelationships = matchOntologyEntries(hiddenRiskText, relationships);
      const crossContactRelationships = matchOntologyEntries(crossContactText, relationships);
      const matchedRelationships = uniqueOntologyMatches([
        ...visibleRelationships,
        ...possibleRelationships,
        ...hiddenRelationships,
        ...crossContactRelationships
      ]);
      if (matchedRelationships.length === 0) {
        continue;
      }

      const strongVisibleMatches = visibleRelationships.filter((entry) =>
        entry.relationship === "direct_name" || entry.relationship === "contains_allergen"
      );
      const visibleRisk = visibleRelationships.reduce(
        (minimum, entry) => escalateRisk(minimum, riskFloorForRelationship(entry, allergy)),
        "low_risk"
      );
      const hiddenRisk = hiddenRelationships.reduce(
        (minimum, entry) => escalateRisk(minimum, riskFloorForRelationship(entry, allergy)),
        "low_risk"
      );
      const possibleRisk = possibleRelationships.length === 0
        ? "low_risk"
        : allergy.severity === "severe"
          ? "high_risk"
          : "ask_staff";
      const crossContactRisk = crossContactRelationships.length === 0
        ? "low_risk"
        : allergy.severity === "severe" || allergy.avoidCrossContact
          ? "high_risk"
          : "ask_staff";
      const targetRisk = [visibleRisk, hiddenRisk, possibleRisk, crossContactRisk]
        .reduce((minimum, risk) => escalateRisk(minimum, risk), "low_risk");
      const inferredPatterns = uniqueOntologyMatches([
        ...possibleRelationships,
        ...hiddenRelationships,
        ...crossContactRelationships
      ])
        .map((entry) => entry.term);
      const derivedRiskBasis = [
        ...(visibleRelationships.length > 0 ? ["visible_text"] : []),
        ...(possibleRelationships.length > 0 || hiddenRelationships.length > 0 ? ["common_pattern"] : []),
        ...(crossContactRelationships.length > 0 ? ["cross_contact"] : [])
      ];
      const policyUncertainty = [
        ...(possibleRelationships.length > 0
          ? ["The model reported this profile allergen as possible, so a low-risk result is not supported."]
          : []),
        ...(hiddenRelationships.length > 0
          ? ["A reported hidden ingredient or preparation pattern matches this allergy profile."]
          : []),
        ...(crossContactRelationships.length > 0
          ? ["A reported cross-contact concern matches this allergy profile."]
          : [])
      ];

      nextDish = {
        ...nextDish,
        riskLevel: escalateRisk(nextDish.riskLevel, targetRisk),
        possibleAllergens: uniqueStrings([...nextDish.possibleAllergens, allergy.name]),
        hiddenRiskIngredients: uniqueStrings([
          ...nextDish.hiddenRiskIngredients,
          ...hiddenRelationships.map((entry) => entry.term)
        ]),
        riskBasis: uniqueRiskBasis([
          ...nextDish.riskBasis,
          ...derivedRiskBasis
        ]),
        transparency: appendDishTransparency(nextDish.transparency, {
          profileFactors: [formatProfileFactor(allergy)],
          commonRiskPatterns: inferredPatterns,
          uncertainty: policyUncertainty.length > 0
            ? policyUncertainty
            : [
                strongVisibleMatches.length > 0
                  ? "Visible menu evidence matches this allergy profile."
                  : "Sift applied its deterministic allergen relationship policy."
              ]
        })
      };
    }

    if (allPrepSignals.length > 0) {
      nextDish = {
        ...nextDish,
        riskLevel: escalateRisk(nextDish.riskLevel, "ask_staff"),
        hiddenRiskIngredients: uniqueStrings([
          ...nextDish.hiddenRiskIngredients,
          ...unknownPrepMatches
        ]),
        crossContactConcerns: uniqueStrings([
          ...nextDish.crossContactConcerns,
          ...crossContactPrepMatches
        ]),
        riskBasis: uniqueRiskBasis([
          ...nextDish.riskBasis,
          ...allPrepSignals.flatMap((entry) => entry.riskBasis ?? [])
        ]),
        transparency: appendDishTransparency(nextDish.transparency, {
          visibleMenuText: visiblePrepSignals.map((entry) => entry.term),
          profileFactors: profile.allergies.map(formatProfileFactor),
          commonRiskPatterns: allPrepSignals.map((entry) => entry.term),
          uncertainty: ["Vague preparation terms can hide sauces, oils, shared equipment, or omitted ingredients."]
        })
      };
    }

    const hasMaterialUncertainty = nextDish.riskBasis.some((basis) =>
      basis === "common_pattern" ||
      basis === "unknown_ingredient" ||
      basis === "cross_contact" ||
      basis === "translation_uncertain" ||
      basis === "image_uncertain"
    );
    if (hasSensitiveAllergy && hasMaterialUncertainty && nextDish.riskLevel === "low_risk") {
      nextDish = {
        ...nextDish,
        riskLevel: "ask_staff",
        conservativeLanguage: "Possible hidden or cross-contact risk. Ask staff before ordering.",
        transparency: appendDishTransparency(nextDish.transparency, {
          profileFactors: profile.allergies
            .filter((allergy) => allergy.severity === "severe" || allergy.avoidCrossContact)
            .map(formatProfileFactor),
          uncertainty: [
            "A severe or cross-contact-sensitive profile requires staff confirmation when preparation or ingredient evidence is uncertain."
          ]
        })
      };
    }

    if ((poorImage || (hasSevereAllergy && nextDish.evidenceConfidence === "low")) && nextDish.riskLevel === "low_risk") {
      nextDish = {
        ...nextDish,
        riskLevel: poorImage ? "unclear" : "ask_staff",
        riskBasis: uniqueRiskBasis([...nextDish.riskBasis, poorImage ? "image_uncertain" : "unknown_ingredient"]),
        transparency: appendDishTransparency(nextDish.transparency, {
          uncertainty: [
            poorImage
              ? "Image quality is too poor to support a low-risk result."
              : "Low confidence is not enough to support low-risk language for a severe allergy profile."
          ]
        })
      };
    }

    return {
      ...nextDish,
      conservativeLanguage: policyMessageForRisk(nextDish.riskLevel, profile.preferredLanguage)
    };
  });

  const materiallyTruncatedDishCount = dishes.filter((dish) =>
    /(^|\s)(?:\.{3}|…)/u.test(`${dish.dishName} ${dish.menuDescription ?? ""}`)
  ).length;
  const normalizedImageIssues = scanResult.imageQuality.issues.map(normalizeForMatch);
  const reportsBlur = normalizedImageIssues.some((issue) => issue.includes("blur"));
  const reportsLowResolution = normalizedImageIssues.some((issue) =>
    issue.includes("low resolution") || issue.includes("low quality")
  );
  const reportsLowContrast = normalizedImageIssues.some((issue) => issue.includes("low contrast"));
  const inferredPoorImage =
    poorImage ||
    materiallyTruncatedDishCount >= 2 ||
    (reportsBlur && reportsLowResolution) ||
    (hasSensitiveAllergy && reportsBlur && reportsLowContrast);
  const imageQuality = {
    ...scanResult.imageQuality,
    readability: inferredPoorImage ? "poor" : scanResult.imageQuality.readability,
    issues: uniqueStrings([
      ...scanResult.imageQuality.issues,
      ...(materiallyTruncatedDishCount >= 2 ? ["Multiple menu entries are cut off."] : []),
      ...(reportsBlur && reportsLowResolution ? ["Blur and low resolution make the menu unreliable to read."] : []),
      ...(hasSensitiveAllergy && reportsBlur && reportsLowContrast
        ? ["Blur and low contrast are not reliable enough for a severe or cross-contact-sensitive profile."]
        : [])
    ]),
    needsRetake: scanResult.imageQuality.needsRetake === true || inferredPoorImage
  };
  const overallRisk = inferredPoorImage ? "unclear" : recomputeOverallRisk(dishes);

  return {
    ...scanResult,
    dishes,
    imageQuality,
    scanSummary: {
      ...scanResult.scanSummary,
      overallRisk,
      summary: policyMessageForRisk(overallRisk, profile.preferredLanguage)
    },
    transparency: {
      checked: scanResult.transparency?.checked ?? ["Menu photo", "Allergy profile", "Common ingredient and preparation patterns"],
      limitations: scanResult.transparency?.limitations ?? ["Sift cannot verify full ingredients, staff practices, or kitchen cross-contact."],
      sourceReferences: scanResult.transparency?.sourceReferences ?? [],
      webSearchQueries: scanResult.transparency?.webSearchQueries ?? []
    }
  };
}

export function riskAtLeast(actual, minimum) {
  return riskRank[actual] >= riskRank[minimum];
}

export function getRiskPolicyFingerprintSource() {
  return [
    riskPolicyVersion,
    getPolicyCopyFingerprintSource(),
    applyRiskPolicy,
    riskAtLeast,
    buildVisibleDishSearchText,
    matchOntologyEntries,
    uniqueOntologyMatches,
    riskFloorForRelationship,
    appendDishTransparency,
    inferPoorImage,
    readPolicyEvidence,
    uncertaintyRiskBasis,
    recomputeOverallRisk,
    escalateRisk,
    formatProfileFactor,
    uniqueRiskBasis,
    uniqueStrings,
    isClaimForAllergy,
    isProfileAllergenClaim,
    isProfileRelevantEvidence,
    normalizeForMatch
  ].map(String).join("\n---\n");
}

function inferPoorImage(scanResult, hasSensitiveAllergy) {
  const dishes = Array.isArray(scanResult.dishes) ? scanResult.dishes : [];
  const materiallyTruncatedDishCount = dishes.filter((dish) => {
    const text = `${dish?.dishName ?? ""} ${dish?.menuDescription ?? ""}`;
    return text.includes("...") || text.includes("…") || text.includes("鈥") || text.includes("�");
  }).length;
  const normalizedImageIssues = (scanResult.imageQuality?.issues ?? []).map(normalizeForMatch);
  const reportsBlur = normalizedImageIssues.some((issue) => issue.includes("blur"));
  const reportsLowResolution = normalizedImageIssues.some((issue) =>
    issue.includes("low resolution") || issue.includes("low quality")
  );
  const reportsLowContrast = normalizedImageIssues.some((issue) => issue.includes("low contrast"));

  return scanResult.imageQuality?.readability === "poor" ||
    materiallyTruncatedDishCount >= 2 ||
    (reportsBlur && reportsLowResolution) ||
    (hasSensitiveAllergy && reportsBlur && reportsLowContrast);
}

function readPolicyEvidence(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { directAllergenTerms: [], allergenDerivatives: [], uncertainties: [] };
  }

  return {
    directAllergenTerms: uniqueStrings(
      Array.isArray(value.directAllergenTerms) ? value.directAllergenTerms : []
    ),
    allergenDerivatives: uniqueStrings(
      Array.isArray(value.allergenDerivatives) ? value.allergenDerivatives : []
    ),
    uncertainties: uniqueStrings(
      Array.isArray(value.uncertainties) ? value.uncertainties : []
    )
  };
}

function uncertaintyRiskBasis(uncertainties) {
  const text = normalizeForMatch(uncertainties.join(" "));
  const values = ["unknown_ingredient"];
  if (/(?:blur|cropp|cut off|glare|image|photo|unread|pixel|resolution)/u.test(text)) {
    values.push("image_uncertain");
  }
  if (/(?:translat|language|interpret|script)/u.test(text)) {
    values.push("translation_uncertain");
  }
  return values;
}

function buildVisibleDishSearchText(dish) {
  return [
    dish.dishName,
    dish.menuDescription,
    ...(dish.transparency?.visibleMenuText ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

function matchOntologyEntries(text, entries) {
  const normalizedText = normalizeOntologyTerm(text);
  const paddedText = ` ${normalizedText} `;
  const seen = new Set();
  return entries.filter((entry) => {
    const normalizedPattern = entry.normalizedTerm || normalizeOntologyTerm(entry.term);
    if (!normalizedPattern) {
      return false;
    }
    const matched = /[^a-z0-9 ]/u.test(normalizedPattern)
      ? normalizedText.includes(normalizedPattern)
      : paddedText.includes(` ${normalizedPattern} `);
    const identity = `${entry.canonicalAllergen ?? "preparation"}:${normalizedPattern}:${entry.relationship}`;
    if (!matched || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function uniqueOntologyMatches(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const identity = `${entry.canonicalAllergen ?? "preparation"}:${entry.normalizedTerm}:${entry.relationship}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function riskFloorForRelationship(relationship, allergy) {
  return allergy.severity === "severe"
    ? relationship.riskFloor.severe
    : relationship.riskFloor.default;
}

function appendDishTransparency(transparency, patch) {
  return {
    visibleMenuText: uniqueStrings([...(transparency?.visibleMenuText ?? []), ...(patch.visibleMenuText ?? [])]).slice(0, 5),
    profileFactors: uniqueStrings([...(transparency?.profileFactors ?? []), ...(patch.profileFactors ?? [])]).slice(0, 5),
    commonRiskPatterns: uniqueStrings([...(transparency?.commonRiskPatterns ?? []), ...(patch.commonRiskPatterns ?? [])]).slice(0, 5),
    uncertainty: uniqueStrings([...(transparency?.uncertainty ?? []), ...(patch.uncertainty ?? [])]).slice(0, 5)
  };
}

function recomputeOverallRisk(dishes) {
  const levels = new Set(dishes.map((dish) => dish.riskLevel));
  if (levels.has("avoid_unless_confirmed")) return "avoid_unless_confirmed";
  if (levels.has("high_risk")) return "high_risk";
  if (levels.has("unclear")) return "unclear";
  if (levels.has("ask_staff")) return "ask_staff";
  return "low_risk";
}

function escalateRisk(current, target) {
  if (current === "unclear" && (target === "low_risk" || target === "ask_staff")) return "unclear";
  if (target === "unclear" && (current === "low_risk" || current === "ask_staff")) return "unclear";
  return riskRank[target] > riskRank[current] ? target : current;
}

function formatProfileFactor(allergy) {
  return `${allergy.name}: ${allergy.severity}${allergy.avoidCrossContact ? ", cross-contact sensitive" : ""}`;
}

function uniqueRiskBasis(values) {
  const riskBasis = values.filter((value) => typeof value === "string" && riskBasisValues.has(value));
  return riskBasis.length > 0 ? Array.from(new Set(riskBasis)) : ["unknown_ingredient"];
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean)));
}

function isProfileAllergenClaim(claim, allergies) {
  return allergies.some((allergy) => isClaimForAllergy(claim, allergy));
}

function isClaimForAllergy(claim, allergy) {
  const normalizedClaim = normalizeOntologyTerm(claim);
  if (!normalizedClaim) return false;
  const paddedClaim = ` ${normalizedClaim} `;
  const candidates = new Set([
    normalizeOntologyTerm(allergy.name),
    ...ontologyEntriesForAllergy(allergy).flatMap((entry) => [
      normalizeOntologyTerm(entry.canonicalAllergen ?? ""),
      entry.normalizedTerm
    ])
  ]);

  return Array.from(candidates).filter(Boolean).some((candidate) => {
    const paddedCandidate = ` ${candidate} `;
    return paddedClaim.includes(paddedCandidate) || paddedCandidate.includes(paddedClaim);
  });
}

function isProfileRelevantEvidence(value, allergies) {
  const normalizedValue = normalizeOntologyTerm(value);
  if (!normalizedValue) return false;
  const paddedValue = ` ${normalizedValue} `;
  const namesKnownAllergen = allergenRelationships.some((entry) =>
    paddedValue.includes(` ${entry.normalizedTerm} `)
  );
  return !namesKnownAllergen || isProfileAllergenClaim(value, allergies);
}

function normalizeForMatch(value) {
  return normalizeOntologyTerm(value);
}
