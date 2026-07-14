export const schemaVersion = "13";

const riskLevelSchema = {
  type: "string",
  enum: ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]
};

const riskBasisSchema = {
  type: "string",
  enum: ["visible_text", "common_pattern", "unknown_ingredient", "cross_contact", "translation_uncertain", "image_uncertain"]
};

export const scanResultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "createdAt",
    "profileId",
    "pageAssessments",
    "scanSummary",
    "dishes",
    "imageQuality",
    "transparency"
  ],
  properties: {
    id: { type: "string" },
    createdAt: { type: "string" },
    imageUri: { type: ["string", "null"] },
    imageUris: { type: "array", items: { type: "string" } },
    restaurantName: { type: ["string", "null"] },
    profileId: { type: "string" },
    analysisLanguage: { type: ["string", "null"] },
    analysisSource: { type: "string", enum: ["mock", "ai", "fallback"] },
    analysisModel: { type: ["string", "null"] },
    analysisRequestId: { type: ["string", "null"] },
    pageAssessments: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pageNumber", "readability", "issues"],
        properties: {
          pageNumber: { type: "integer" },
          readability: { type: "string", enum: ["clear", "partially_clear", "poor"] },
          issues: { type: "array", maxItems: 8, items: { type: "string" } }
        }
      }
    },
    scanSummary: {
      type: "object",
      additionalProperties: false,
      required: ["overallRisk", "summary", "limitations"],
      properties: {
        overallRisk: riskLevelSchema,
        summary: { type: "string" },
        limitations: { type: "string" }
      }
    },
    dishes: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "dishName",
          "sourcePageNumbers",
          "riskLevel",
          "possibleAllergens",
          "hiddenRiskIngredients",
          "crossContactConcerns",
          "evidenceConfidence",
          "riskBasis",
          "reason",
          "questionsToAsk",
          "questionsToAskUserLanguage",
          "conservativeLanguage",
          "transparency"
        ],
        properties: {
          id: { type: "string" },
          dishName: { type: "string" },
          menuDescription: { type: ["string", "null"] },
          sourcePageNumbers: { type: "array", maxItems: 4, items: { type: "integer" } },
          riskLevel: riskLevelSchema,
          possibleAllergens: { type: "array", maxItems: 12, items: { type: "string" } },
          hiddenRiskIngredients: { type: "array", maxItems: 12, items: { type: "string" } },
          crossContactConcerns: { type: "array", maxItems: 8, items: { type: "string" } },
          evidenceConfidence: { type: "string", enum: ["high", "medium", "low"] },
          riskBasis: { type: "array", minItems: 1, items: riskBasisSchema },
          reason: { type: "string" },
          questionsToAsk: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          questionsToAskUserLanguage: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          conservativeLanguage: { type: "string" },
          transparency: {
            type: "object",
            additionalProperties: false,
            required: ["visibleMenuText", "profileFactors", "commonRiskPatterns", "uncertainty"],
            properties: {
              visibleMenuText: { type: "array", maxItems: 5, items: { type: "string" } },
              profileFactors: { type: "array", maxItems: 5, items: { type: "string" } },
              commonRiskPatterns: { type: "array", maxItems: 5, items: { type: "string" } },
              uncertainty: { type: "array", maxItems: 5, items: { type: "string" } }
            }
          }
        }
      }
    },
    restaurantMessage: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["english"],
      properties: {
        english: { type: "string" },
        translated: { type: ["string", "null"] },
        language: { type: ["string", "null"] },
        userLanguageText: { type: ["string", "null"] },
        userLanguage: { type: ["string", "null"] }
      }
    },
    imageQuality: {
      type: "object",
      additionalProperties: false,
      required: ["readability", "issues", "needsRetake"],
      properties: {
        readability: { type: "string", enum: ["clear", "partially_clear", "poor"] },
        issues: { type: "array", maxItems: 8, items: { type: "string" } },
        needsRetake: { type: "boolean" }
      }
    },
    transparency: {
      type: "object",
      additionalProperties: false,
      required: ["checked", "limitations", "sourceReferences", "webSearchQueries"],
      properties: {
        checked: { type: "array", maxItems: 6, items: { type: "string" } },
        limitations: { type: "array", maxItems: 6, items: { type: "string" } },
        sourceReferences: {
          type: "array",
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "uri"],
            properties: {
              title: { type: "string" },
              uri: { type: "string" },
              source: { type: ["string", "null"] }
            }
          }
        },
        webSearchQueries: { type: "array", maxItems: 12, items: { type: "string" } }
      }
    }
  }
};

// Provider-facing schema. Server-owned identity and transparency fields are
// normalized and validated after inference to keep Gemini's schema tractable.
export const modelScanResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["restaurantName", "scanSummary", "pageAssessments", "dishes", "restaurantMessage", "imageQuality"],
  properties: {
    restaurantName: {
      type: "string",
      description: "Short 1-4 word title for the whole readable menu, or Menu scan when no theme is reliable."
    },
    scanSummary: {
      type: "object",
      additionalProperties: false,
      required: ["overallRisk", "summary", "limitations"],
      properties: {
        overallRisk: riskLevelSchema,
        summary: { type: "string", description: "Calm summary of the menu-level risk, never a safety guarantee." },
        limitations: { type: "string", description: "State that visible text cannot verify ingredients, preparation, or cross-contact." }
      }
    },
    pageAssessments: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      description: "Exactly one assessment for every supplied menu page, in page order.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pageNumber", "contentType", "readability", "issues"],
        properties: {
          pageNumber: { type: "integer", description: "One-based supplied page number." },
          contentType: {
            type: "string",
            enum: ["dish_listing", "supporting_information", "unusable_or_unknown"],
            description: "dish_listing only when at least one individual dish is reliably readable; supporting_information for readable covers, legends, or menu-wide notes without individual dishes; unusable_or_unknown when the image cannot be used as menu evidence."
          },
          readability: { type: "string", enum: ["clear", "partially_clear", "poor"] },
          issues: { type: "array", maxItems: 6, items: { type: "string" } }
        }
      }
    },
    dishes: {
      type: "array",
      minItems: 0,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "dishName",
          "menuDescription",
          "sourcePageNumbers",
          "evidence",
          "riskLevel",
          "possibleAllergens",
          "evidenceConfidence",
          "riskBasis",
          "reason",
          "questionsToAsk",
          "questionsToAskUserLanguage",
          "conservativeLanguage"
        ],
        properties: {
          dishName: { type: "string", description: "Dish name exactly as reliably readable on the menu." },
          menuDescription: { type: "string", description: "Only the reliably readable description printed for this dish; empty when absent." },
          sourcePageNumbers: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            description: "One-based page numbers where this dish is visibly readable. Include overlapping pages when applicable.",
            items: { type: "integer" }
          },
          evidence: {
            type: "object",
            additionalProperties: false,
            required: [
              "visibleMenuText",
              "directAllergenTerms",
              "allergenDerivatives",
              "commonRecipePatterns",
              "unknownPreparationComponents",
              "crossContactSignals",
              "uncertainties"
            ],
            properties: {
              visibleMenuText: {
                type: "array",
                maxItems: 8,
                description: "Exact or closely quoted menu snippets for this dish. Never include inferred ingredients.",
                items: { type: "string" }
              },
              directAllergenTerms: {
                type: "array",
                maxItems: 8,
                description: "Profile-allergen names visibly printed for this dish. Every item must occur in visible menu text.",
                items: { type: "string" }
              },
              allergenDerivatives: {
                type: "array",
                maxItems: 8,
                description: "Visibly printed ingredients that contain or derive from a profile allergen, such as tahini for sesame. Every item must occur in visible menu text.",
                items: { type: "string" }
              },
              commonRecipePatterns: {
                type: "array",
                maxItems: 8,
                description: "Plausible cuisine or recipe associations that are not proof of an ingredient.",
                items: { type: "string" }
              },
              unknownPreparationComponents: {
                type: "array",
                maxItems: 8,
                description: "Unspecified sauces, broths, oils, marinades, batters, dressings, spice mixes, or garnishes that require staff confirmation.",
                items: { type: "string" }
              },
              crossContactSignals: {
                type: "array",
                maxItems: 8,
                description: "Specific shared fryer, grill, wok, utensil, surface, or preparation signals. Do not use generic kitchen uncertainty as a claimed signal.",
                items: { type: "string" }
              },
              uncertainties: {
                type: "array",
                maxItems: 8,
                description: "Image, translation, menu completeness, or preparation limitations that affect confidence.",
                items: { type: "string" }
              }
            }
          },
          riskLevel: riskLevelSchema,
          possibleAllergens: { type: "array", maxItems: 12, description: "Only allergens from the supplied profile or clear canonical equivalents.", items: { type: "string" } },
          evidenceConfidence: { type: "string", enum: ["high", "medium", "low"] },
          riskBasis: { type: "array", minItems: 1, maxItems: 6, items: riskBasisSchema },
          reason: { type: "string" },
          questionsToAsk: { type: "array", minItems: 1, maxItems: 6, description: "Short practical questions in the restaurant language about the exact uncertainty.", items: { type: "string" } },
          questionsToAskUserLanguage: { type: "array", minItems: 1, maxItems: 6, description: "Meaning-equivalent question set in the user's language.", items: { type: "string" } },
          conservativeLanguage: { type: "string" }
        }
      }
    },
    restaurantMessage: {
      type: "object",
      additionalProperties: false,
      required: ["english", "translated", "language", "userLanguageText", "userLanguage"],
      properties: {
        english: { type: "string" },
        translated: { type: "string" },
        language: { type: "string" },
        userLanguageText: { type: "string" },
        userLanguage: { type: "string" }
      }
    },
    imageQuality: {
      type: "object",
      additionalProperties: false,
      required: ["readability", "issues", "needsRetake"],
      properties: {
        readability: { type: "string", enum: ["clear", "partially_clear", "poor"] },
        issues: { type: "array", maxItems: 8, items: { type: "string" } },
        needsRetake: { type: "boolean" }
      }
    }
  }
};

export function toGeminiOpenApiSchema(value) {
  if (Array.isArray(value)) {
    return value.map(toGeminiOpenApiSchema);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const converted = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "additionalProperties" || key === "minItems" || key === "maxItems") {
      continue;
    }

    converted[key] = key === "type" && typeof entry === "string"
      ? entry.toUpperCase()
      : toGeminiOpenApiSchema(entry);
  }

  return converted;
}
