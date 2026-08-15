import assert from "node:assert/strict";

import {
  compareRiskLevels,
  getResultAvailabilityStatus,
  latencyPercentiles,
  nearestRankPercentile,
  normalizeAvailabilityStatus,
  normalizeQuestionLanguage,
  normalizeSchemaStatus,
  riskRank,
  scoreBenchmark,
  scoreBenchmarkCase,
  summarizeExactRiskConfusion,
  summarizeCaseStability,
  summarizeScores,
  summarizeSlices,
  summarizeStability,
  wilsonInterval
} from "./lib/index.mjs";

const benchmarkCase = {
  id: "C-001",
  language: "English",
  sourceType: "controlled",
  critical: true,
  profile: {
    allergies: [{ name: "Peanut", severity: "severe" }]
  },
  expected: {
    readability: "clear",
    minimumRisks: [
      { dishName: "Spicy Noodles", minimumRisk: "high_risk", directListed: true },
      { dishName: "Mystery Soup", minimumRisk: "ask_staff" }
    ],
    maximumRisks: [
      { dishName: "Plain Rice", maximumRisk: "ask_staff" }
    ],
    allowedRisks: [
      { dishName: "Fruit Cup", allowedRisks: ["low_risk", "ask_staff"] }
    ],
    expectedDishes: ["Side Salad"],
    benignDishes: ["Plain Rice", "Side Salad"]
  }
};

const goodResult = {
  caseId: "C-001",
  pass: 1,
  schemaStatus: { ok: true },
  availability: "available",
  forbiddenSafetyClaims: 0,
  latencyMs: 100,
  output: outputWith({
    dishes: [
      dish("Spicy Noodles", "avoid_unless_confirmed"),
      dish("Mystery Soup", "ask_staff"),
      dish("Plain Rice", "low_risk"),
      dish("Fruit Cup", "ask_staff"),
      dish("Side Salad", "low_risk")
    ],
    readability: "clear",
    references: [{ uri: "https://example.test/source" }]
  })
};

const failingResult = {
  caseId: "C-001",
  pass: 2,
  schemaStatus: "invalid",
  available: true,
  forbiddenSafetyClaimResult: ["safe to eat"],
  latencyMs: 400,
  output: outputWith({
    dishes: [
      dish("Spicy Noodles", "low_risk"),
      dish("Mystery Soup", "low_risk", []),
      dish("Plain Rice", "high_risk"),
      dish("Fruit Cup", "high_risk")
    ],
    readability: "partially_clear",
    references: [
      { uri: "https://example.test/good" },
      { uri: "http://example.test/insecure" }
    ]
  })
};

const poorImageCase = {
  id: "C-POOR",
  language: "French",
  sourceType: "licensed",
  critical: false,
  expected: {
    readability: "poor",
    needsRetake: true,
    overallRisk: "unclear"
  }
};

const poorImageResult = {
  caseId: "C-POOR",
  pass: 1,
  schemaStatus: true,
  fallback: false,
  forbiddenSafetyClaims: false,
  latencyMs: 200,
  output: outputWith({
    dishes: [dish("Unreadable item", "unclear")],
    readability: "poor",
    needsRetake: true,
    overallRisk: "unclear",
    references: []
  })
};

const fallbackResult = {
  caseId: "C-POOR",
  pass: 2,
  schemaStatus: "passed",
  fallback: true,
  forbiddenSafetyClaims: { count: 0 },
  latencyMs: 300,
  output: outputWith({
    dishes: [dish("Fallback item", "unclear")],
    readability: "poor",
    needsRetake: false,
    overallRisk: "unclear",
    references: []
  })
};

testRiskAndStatusUtilities();
testDetailedCaseScoring();
testVersionedManifestShape();
testMultiPageScoring();
testFallbackAndSafetyHook();
testAutomatedQuestionIntentCoverage();
testHoldoutLanguageQuestionIntentCoverage();
testAggregateAndSliceScoring();
testExactRiskConfusionMatrix();
testStabilityScoring();
testCriticalRiskDowngradeScoring();
testNewMetricZeroDenominators();
testStatistics();

console.log("AI eval scoring self-tests passed: deterministic scoring, semantic proxies, stability, latency, and Wilson intervals.");

function testRiskAndStatusUtilities() {
  assert.equal(riskRank("low_risk"), 0);
  assert.equal(riskRank("unclear"), null);
  assert.equal(riskRank("missing"), null);
  assert.equal(compareRiskLevels("avoid_unless_confirmed", "high_risk"), 1);
  assert.equal(compareRiskLevels("ask_staff", "unclear"), null);
  assert.equal(compareRiskLevels("missing", "low_risk"), null);
  assert.equal(normalizeQuestionLanguage("zh-Hant-TW"), "zh-hant");
  assert.equal(normalizeQuestionLanguage("Simplified Chinese"), "zh-hans");

  assert.equal(normalizeSchemaStatus(true), "valid");
  assert.equal(normalizeSchemaStatus({ status: "failed" }), "invalid");
  assert.equal(normalizeSchemaStatus({ passed: true }), "valid");
  assert.equal(normalizeSchemaStatus("not-run"), "unknown");
  assert.equal(normalizeAvailabilityStatus(true), "available");
  assert.equal(normalizeAvailabilityStatus("degraded"), "fallback");
  assert.equal(normalizeAvailabilityStatus("timeout"), "unavailable");
  assert.equal(getResultAvailabilityStatus({ fallback: true, output: {} }), "fallback");
  assert.equal(getResultAvailabilityStatus({ analysisSource: "fallback", output: {} }), "fallback");
  assert.equal(getResultAvailabilityStatus({ output: { dishes: [] } }), "available");
  assert.equal(getResultAvailabilityStatus({}), "unknown");
}

function testDetailedCaseScoring() {
  const good = scoreBenchmarkCase(benchmarkCase, goodResult, {
    detectForbiddenSafetyClaims: () => {
      throw new Error("Explicit forbidden-claim results must take precedence over the hook.");
    }
  });
  assert.equal(good.passed, true);
  assert.equal(good.schemaStatus, "valid");
  assert.equal(good.expectedDishes.total, 5);
  assert.equal(good.expectedDishes.matched, 5);
  assert.equal(good.expectedDishes.recall, 1);
  assert.equal(good.risk.minimumChecks.length, 2);
  assert.equal(good.risk.minimumViolations, 0);
  assert.equal(good.risk.maximumViolations, 0);
  assert.equal(good.risk.allowedViolations, 0);
  assert.equal(good.risk.severeDirectChecks, 1);
  assert.equal(good.risk.severeDirectPasses, 1);
  assert.equal(good.risk.severeDirectMisses, 0);
  assert.equal(good.image.clearPartialReadabilityAgreed, true);
  assert.equal(good.staffQuestions.coverage, 1);
  assert.equal(good.references.allHttps, true);
  assert.equal(good.benign.overEscalationRate, 0);

  const failed = scoreBenchmarkCase(benchmarkCase, failingResult);
  assert.equal(failed.passed, false);
  assert.equal(failed.schemaStatus, "invalid");
  assert.deepEqual(failed.expectedDishes.missing, ["Side Salad"]);
  assert.equal(failed.expectedDishes.total, 5);
  assert.equal(failed.expectedDishes.matched, 4);
  assert.equal(failed.expectedDishes.recall, 0.8, "A missing benign dish must reduce expected-dish recall.");
  assert.equal(failed.risk.minimumViolations, 2);
  assert.equal(failed.risk.maximumViolations, 1);
  assert.equal(failed.risk.allowedViolations, 1);
  assert.equal(failed.risk.severeDirectChecks, 1);
  assert.equal(failed.risk.severeDirectPasses, 0);
  assert.equal(failed.risk.severeDirectMisses, 1);
  assert.equal(failed.image.clearPartialReadabilityAgreed, false);
  assert.equal(failed.safety.count, 1);
  assert.equal(failed.safety.source, "result");
  assert.equal(failed.staffQuestions.coverage, 0.75);
  assert.deepEqual(failed.staffQuestions.missingDishes, ["Mystery Soup"]);
  assert.equal(failed.references.coverage, 0.5);
  assert.deepEqual(failed.references.invalid, ["http://example.test/insecure"]);
  assert.equal(failed.benign.expected, 2);
  assert.equal(failed.benign.matched, 1);
  assert.equal(failed.benign.overEscalated, 1);
  assert.equal(failed.benign.overEscalationRate, 1);
  assert.ok(failed.failures.includes("expected_dish_missing"));
  assert.ok(failed.failures.includes("minimum_risk_not_met"));
  assert.ok(failed.failures.includes("maximum_risk_exceeded"));
  assert.ok(failed.failures.includes("risk_not_allowed"));

  const nonOrdinalUnclear = scoreBenchmarkCase({
    id: "UNCLEAR-MINIMUM",
    expected: {
      minimumRisks: [{ dishName: "Mystery Soup", minimumRisk: "ask_staff" }]
    }
  }, {
    caseId: "UNCLEAR-MINIMUM",
    schemaStatus: "valid",
    availability: "available",
    forbiddenSafetyClaims: 0,
    output: outputWith({ dishes: [dish("Mystery Soup", "unclear")] })
  });
  assert.equal(nonOrdinalUnclear.risk.minimumViolations, 1);
  assert.equal(nonOrdinalUnclear.risk.minimumChecks[0].reason, "unknown_risk");

  const mildCase = structuredClone(benchmarkCase);
  mildCase.profile.allergies[0].severity = "mild";
  const mild = scoreBenchmarkCase(mildCase, { ...failingResult, schemaStatus: true });
  assert.equal(mild.risk.severeDirectChecks, 0);
  assert.equal(mild.risk.severeDirectPasses, 0);
  assert.equal(mild.risk.severeDirectMisses, 0, "A direct mild-allergen miss is not a severe-direct miss.");

  const explicitSevereCase = structuredClone(mildCase);
  explicitSevereCase.expected.minimumRisks[0].directSevere = true;
  const explicitSevere = scoreBenchmarkCase(explicitSevereCase, { ...failingResult, schemaStatus: true });
  assert.equal(explicitSevere.risk.severeDirectChecks, 1);
  assert.equal(explicitSevere.risk.severeDirectPasses, 0);
  assert.equal(explicitSevere.risk.severeDirectMisses, 1);

  const poor = scoreBenchmarkCase(poorImageCase, poorImageResult);
  assert.equal(poor.passed, true);
  assert.equal(poor.image.isPoorImageCase, true);
  assert.equal(poor.image.poorImageRetakePassed, true);
  assert.equal(poor.image.readabilityMatched, true);

  const badPoor = scoreBenchmarkCase(poorImageCase, {
    ...poorImageResult,
    output: outputWith({
      dishes: [dish("Unreadable item", "unclear")],
      readability: "poor",
      needsRetake: false,
      overallRisk: "unclear",
      references: []
    })
  });
  assert.equal(badPoor.image.poorImageRetakePassed, false);
  assert.ok(badPoor.failures.includes("poor_image_retake_not_met"));
}

function testFallbackAndSafetyHook() {
  const fallback = scoreBenchmarkCase(poorImageCase, fallbackResult);
  assert.equal(fallback.availabilityStatus, "fallback");
  assert.equal(fallback.modelChecksSkipped, true);
  assert.equal(fallback.image.isPoorImageCase, false);
  assert.equal(fallback.image.poorImageRetakePassed, null);
  assert.equal(fallback.expectedDishes.recall, null);
  assert.equal(fallback.passed, true, "A valid fallback is an availability outcome, not a model-quality miss.");

  const clearFallback = scoreBenchmarkCase(benchmarkCase, {
    ...goodResult,
    availability: "fallback",
    fallback: true
  });
  assert.equal(clearFallback.image.isClearOrPartialCase, false);
  assert.equal(clearFallback.image.isClearOrPartialExpectedCase, true);
  assert.equal(clearFallback.image.clearPartialSuccessfulResult, false);

  const clearInvalid = scoreBenchmarkCase(benchmarkCase, {
    ...goodResult,
    schemaStatus: "invalid"
  });
  assert.equal(clearInvalid.availabilityStatus, "available");
  assert.equal(clearInvalid.image.clearPartialReadabilityAgreed, true);
  assert.equal(clearInvalid.image.clearPartialSuccessfulResult, false);

  const clearCaseFailure = scoreBenchmarkCase(benchmarkCase, {
    ...failingResult,
    schemaStatus: "valid"
  });
  assert.equal(clearCaseFailure.availabilityStatus, "available");
  assert.equal(clearCaseFailure.schemaStatus, "valid");
  assert.equal(clearCaseFailure.image.clearPartialSuccessfulResult, false);
  const clearSummary = summarizeScores([
    scoreBenchmarkCase(benchmarkCase, goodResult),
    clearFallback,
    clearInvalid,
    clearCaseFailure
  ]);
  assert.equal(clearSummary.clearPartialResultAttempts, 4);
  assert.equal(clearSummary.clearPartialSuccessfulResults, 1);

  let hookCalls = 0;
  const hookScore = scoreBenchmarkCase(benchmarkCase, {
    ...goodResult,
    forbiddenSafetyClaims: undefined
  }, {
    detectForbiddenSafetyClaims: ({ output }) => {
      hookCalls += 1;
      assert.equal(output.dishes.length, 5);
      return { matches: ["safe to eat", "risk-free"] };
    }
  });
  assert.equal(hookCalls, 1);
  assert.equal(hookScore.safety.source, "hook");
  assert.equal(hookScore.safety.count, 2);
  assert.equal(hookScore.passed, false);

  const unknownSchema = scoreBenchmarkCase(benchmarkCase, {
    caseId: "C-001",
    availability: true,
    forbiddenSafetyClaims: 0,
    output: goodResult.output
  });
  assert.equal(unknownSchema.schemaStatus, "unknown");
  assert.ok(unknownSchema.failures.includes("schema_unknown"));

  const legacySchemaMetric = scoreBenchmarkCase(benchmarkCase, {
    ...goodResult,
    schemaStatus: undefined,
    validation: { metrics: { invalidSchema: 0 } }
  });
  assert.equal(legacySchemaMetric.schemaStatus, "valid");
}

function testVersionedManifestShape() {
  const versionedCase = {
    id: "V1-001",
    language: "English",
    profile: { allergies: [{ name: "Sesame", severity: "severe" }] },
    expectations: {
      readability: {
        allowedValues: ["clear", "partially_clear"],
        needsRetake: false
      },
      overallRisk: {
        status: "not_annotated",
        allowedRiskRange: null
      },
      dishes: [
        {
          dishName: "Sesame Curry",
          role: "risk_target",
          evidenceLabel: "confirmed_visible",
          allowedRiskRange: {
            kind: "ordinal",
            minimum: "high_risk",
            maximum: "avoid_unless_confirmed",
            levels: ["high_risk", "avoid_unless_confirmed"]
          }
        },
        {
          dishName: "Plain Rice",
          role: "benign_control",
          evidenceLabel: "unknown_unobservable",
          allowedRiskRange: {
            kind: "ordinal",
            minimum: "low_risk",
            maximum: "ask_staff",
            levels: ["low_risk", "ask_staff"]
          }
        }
      ],
      requiredQuestions: []
    }
  };
  const versionedResult = {
    caseId: "V1-001",
    schemaStatus: "valid",
    availability: "available",
    forbiddenSafetyClaims: 0,
    output: outputWith({
      dishes: [
        dish("Sesame Curry", "high_risk"),
        dish("Plain Rice", "ask_staff")
      ],
      readability: "partially_clear",
      references: []
    })
  };
  const score = scoreBenchmarkCase(versionedCase, versionedResult);
  assert.equal(score.passed, true);
  assert.equal(score.image.expectedReadability, null);
  assert.deepEqual(score.image.allowedReadabilityValues, ["clear", "partially_clear"]);
  assert.equal(score.image.clearPartialReadabilityAgreed, true);
  assert.equal(score.expectedDishes.total, 2);
  assert.equal(score.expectedDishes.recall, 1);
  assert.equal(score.risk.minimumChecks.length, 2);
  assert.equal(score.risk.maximumChecks.length, 2);
  assert.equal(score.risk.allowedChecks.length, 2);
  assert.equal(score.risk.severeDirectMisses, 0);
  assert.equal(score.benign.expected, 1);
  assert.equal(score.benign.matched, 1);
  assert.equal(score.benign.overEscalated, 0);

  const missingRiskAndBenign = scoreBenchmarkCase(versionedCase, {
    ...versionedResult,
    output: outputWith({
      dishes: [dish("Other Dish", "low_risk")],
      readability: "clear",
      references: []
    })
  });
  assert.equal(missingRiskAndBenign.expectedDishes.total, 2);
  assert.equal(missingRiskAndBenign.expectedDishes.matched, 0);
  assert.deepEqual(missingRiskAndBenign.expectedDishes.missing, ["Sesame Curry", "Plain Rice"]);
  assert.equal(missingRiskAndBenign.risk.severeDirectMisses, 1);

  const versionedPoorCase = {
    id: "V1-POOR",
    expectations: {
      readability: { allowedValues: ["poor"], needsRetake: true },
      overallRisk: {
        status: "annotated",
        allowedRiskRange: {
          kind: "non_ordinal",
          minimum: null,
          maximum: null,
          levels: ["unclear"]
        }
      },
      dishes: []
    }
  };
  const versionedPoor = scoreBenchmarkCase(versionedPoorCase, {
    ...poorImageResult,
    caseId: "V1-POOR"
  });
  assert.equal(versionedPoor.image.isPoorImageCase, true);
  assert.equal(versionedPoor.image.poorImageRetakePassed, true);
  assert.deepEqual(versionedPoor.image.allowedOverallRisks, ["unclear"]);
}

function testMultiPageScoring() {
  const multiPageCase = {
    id: "MULTI-001",
    profile: { allergies: [{ name: "Peanut", severity: "severe" }] },
    expectations: {
      readability: { allowedValues: ["partially_clear"], needsRetake: false },
      pages: [
        { allowedReadability: ["clear"], needsRetake: false },
        { allowedReadability: ["partially_clear"], needsRetake: false },
        { allowedReadability: ["clear"], needsRetake: false }
      ],
      dishes: [
        {
          dishName: "Plain Rice",
          role: "benign_control",
          sourcePageNumbers: [1],
          allowedRiskRange: {
            kind: "ordinal",
            minimum: "low_risk",
            maximum: "ask_staff",
            levels: ["low_risk", "ask_staff"]
          }
        },
        {
          dishName: "Peanut Satay",
          role: "risk_target",
          evidenceLabel: "confirmed_visible",
          sourcePageNumbers: [2, 3],
          allowedRiskRange: {
            kind: "ordinal",
            minimum: "high_risk",
            maximum: "avoid_unless_confirmed",
            levels: ["high_risk", "avoid_unless_confirmed"]
          }
        }
      ],
      requiredQuestions: []
    }
  };
  const rice = dish("Plain Rice", "low_risk");
  rice.sourcePageNumbers = [1];
  const satay = dish("Peanut Satay", "avoid_unless_confirmed");
  satay.sourcePageNumbers = [2, 3];
  const good = scoreBenchmarkCase(multiPageCase, {
    caseId: multiPageCase.id,
    schemaStatus: "valid",
    availability: "available",
    forbiddenSafetyClaims: 0,
    output: outputWith({
      dishes: [rice, satay],
      readability: "partially_clear",
      references: [],
      pageAssessments: [
        { pageNumber: 1, readability: "clear", issues: [] },
        { pageNumber: 2, readability: "partially_clear", issues: ["glare"] },
        { pageNumber: 3, readability: "clear", issues: [] }
      ]
    })
  });
  assert.equal(good.passed, true);
  assert.equal(good.pages.applicable, true);
  assert.equal(good.pages.expectedPageCount, 3);
  assert.equal(good.pages.actualPageCount, 3);
  assert.equal(good.pages.assessmentPasses, 3);
  assert.equal(good.pages.dishAttributionPasses, 2);
  assert.deepEqual(good.pages.failures, []);

  const reordered = structuredClone(good.result);
  reordered.output.pageAssessments = [
    { pageNumber: 2, readability: "partially_clear", issues: [] },
    { pageNumber: 1, readability: "clear", issues: [] },
    { pageNumber: 3, readability: "clear", issues: [] }
  ];
  const reorderedScore = scoreBenchmarkCase(multiPageCase, reordered);
  assert.equal(reorderedScore.passed, false);
  assert.ok(reorderedScore.failures.includes("page_assessment_mismatch"));

  const wrongAttribution = structuredClone(good.result);
  wrongAttribution.output.dishes[1].sourcePageNumbers = [1];
  const wrongAttributionScore = scoreBenchmarkCase(multiPageCase, wrongAttribution);
  assert.equal(wrongAttributionScore.passed, false);
  assert.ok(wrongAttributionScore.failures.includes("dish_source_page_mismatch"));

  const invalidReference = structuredClone(good.result);
  invalidReference.output.dishes[1].sourcePageNumbers = [2, 4];
  const invalidReferenceScore = scoreBenchmarkCase(multiPageCase, invalidReference);
  assert.equal(invalidReferenceScore.passed, false);
  assert.ok(invalidReferenceScore.failures.includes("invalid_source_page_reference"));

  const summary = summarizeScores([good, wrongAttributionScore, invalidReferenceScore]);
  assert.equal(summary.pageAssessmentChecks, 9);
  assert.equal(summary.rates.pageAssessmentAccuracy, 1);
  assert.equal(summary.dishPageAttributionChecks, 6);
  assert.equal(summary.dishPageAttributionPasses, 4);
  assert.equal(summary.invalidSourcePageReferences, 1);
}

function testAutomatedQuestionIntentCoverage() {
  const multilingualCase = {
    id: "Q-001",
    profile: {
      preferredLanguage: "Japanese",
      restaurantLanguage: "Spanish",
      allergies: [{ name: "Sesame", severity: "severe" }]
    },
    expectations: {
      readability: { allowedValues: ["clear"], needsRetake: false },
      dishes: [],
      requiredQuestions: [
        {
          id: "readable-menu",
          scope: "scan",
          dishNames: [],
          intent: "request_readable_menu",
          allergens: [],
          requiredLanguages: ["Spanish"]
        },
        {
          id: "ingredients-each-dish",
          scope: "each_returned_dish",
          dishNames: [],
          intent: "confirm_ingredients",
          allergens: ["Sesame"],
          requiredLanguages: ["Spanish"]
        },
        {
          id: "preparation-named-dish",
          scope: "named_dishes",
          dishNames: ["Tōfu Bowl"],
          intent: "confirm_preparation",
          allergens: ["Sesame"],
          requiredLanguages: ["Japanese"]
        },
        {
          id: "cross-contact-each-dish",
          scope: "each_returned_dish",
          dishNames: [],
          intent: "confirm_cross_contact",
          allergens: ["Sesame"],
          requiredLanguages: ["Japanese"]
        }
      ]
    }
  };
  const matchingResult = {
    caseId: "Q-001",
    schemaStatus: "valid",
    availability: "available",
    forbiddenSafetyClaims: 0,
    output: outputWith({
      dishes: [dish(
        "Ｔōfu Bowl",
        "ask_staff",
        [
          "¿Puede traer un menú más legible?",
          "¿Contiene se\u0301samo entre los ingredientes?"
        ],
        [
          "ごまをどのように調理しますか？",
          "ごまとの交差接触を防ぐため、共用設備を使いますか？"
        ]
      )],
      readability: "clear",
      references: []
    })
  };
  const matching = scoreBenchmarkCase(multilingualCase, matchingResult);
  const coverage = matching.automatedQuestionIntentCoverage;
  assert.equal(coverage.automatedProxy, true);
  assert.equal(coverage.humanTranslationFidelityAssessed, false);
  assert.equal(coverage.total, 4);
  assert.equal(coverage.covered, 4);
  assert.equal(coverage.coverage, 1);
  assert.deepEqual(coverage.failedRequirementIds, []);
  assert.ok(coverage.checks.some((check) => (
    check.requirementId === "ingredients-each-dish"
      && check.questionChannel === "restaurant"
      && check.passed
  )));
  assert.ok(coverage.checks.some((check) => (
    check.requirementId === "preparation-named-dish"
      && check.questionChannel === "user"
      && check.passed
  )));

  const wrongChannelResult = {
    ...matchingResult,
    output: outputWith({
      dishes: [dish(
        "Tōfu Bowl",
        "ask_staff",
        ["How is this prepared with sesame, and is there cross contact?"],
        ["Can I see a readable menu, and does it contain sesame ingredients?"]
      )],
      readability: "clear",
      references: []
    })
  };
  const wrongChannel = scoreBenchmarkCase(multilingualCase, wrongChannelResult);
  assert.equal(wrongChannel.automatedQuestionIntentCoverage.covered, 0);
  assert.equal(wrongChannel.automatedQuestionIntentCoverage.total, 4);
  assert.ok(wrongChannel.automatedQuestionIntentCoverage.checks.every((check) => !check.passed));

  const missingIntentResult = {
    ...matchingResult,
    output: outputWith({
      dishes: [dish("Ｔōfu Bowl", "ask_staff", ["¿Cuánto cuesta?"], ["いくらですか？"])],
      readability: "clear",
      references: []
    })
  };
  const missing = scoreBenchmarkCase(multilingualCase, missingIntentResult);
  assert.equal(missing.automatedQuestionIntentCoverage.total, 4);
  assert.equal(missing.automatedQuestionIntentCoverage.covered, 0);
  assert.deepEqual(missing.automatedQuestionIntentCoverage.failedRequirementIds, [
    "readable-menu",
    "ingredients-each-dish",
    "preparation-named-dish",
    "cross-contact-each-dish"
  ]);

  const summary = summarizeScores([matching, missing]);
  assert.equal(summary.automatedQuestionIntentRequirements, 8);
  assert.equal(summary.automatedQuestionIntentPasses, 4);
  assert.equal(summary.rates.automatedQuestionIntentCoverage, 0.5);
  assert.equal(summary.wilson95.automatedQuestionIntentCoverage.successes, 4);
  assert.equal(summary.wilson95.automatedQuestionIntentCoverage.total, 8);
}

function testHoldoutLanguageQuestionIntentCoverage() {
  const samples = [
    {
      language: "English",
      allergen: "Sesame",
      questions: [
        "Does this dish contain sesame?",
        "Can you use clean utensils for sesame?"
      ]
    },
    {
      language: "Japanese",
      allergen: "Sesame",
      questions: [
        "この料理にごまが含まれていますか？",
        "ごまとの交差接触はありますか？"
      ]
    },
    {
      language: "Korean",
      allergen: "Sesame",
      questions: [
        "이 음식에 참깨가 들어 있나요?",
        "참깨와 교차 접촉 위험이 있나요?"
      ]
    },
    {
      language: "Simplified Chinese",
      allergen: "Sesame",
      questions: [
        "这道菜含有芝麻吗？",
        "可以用干净、未接触过芝麻的锅具单独制作吗？"
      ]
    },
    {
      language: "Traditional Chinese",
      allergen: "Sesame",
      questions: [
        "這道菜含有芝麻嗎？",
        "這道菜有與芝麻交叉接觸的風險嗎？"
      ]
    },
    {
      language: "Thai",
      allergen: "Sesame",
      questions: [
        "อาหารจานนี้มีส่วนผสมของงาหรือไม่?",
        "มีความเสี่ยงจากการสัมผัสข้ามกับงาหรือไม่?"
      ]
    },
    {
      language: "Vietnamese",
      allergen: "Dairy",
      questions: [
        "Món này có chứa sữa không?",
        "Có tiếp xúc chéo với sữa không?"
      ]
    },
    {
      language: "Turkish",
      allergen: "Dairy",
      questions: [
        "Bu yemek süt ürünleri içerir mi?",
        "Süt ürünleriyle çapraz temas var mı?"
      ]
    },
    {
      language: "Polish",
      allergen: "Dairy",
      questions: [
        "Czy danie zawiera mleko?",
        "Czy jest kontakt krzyżowy z mlekiem?"
      ]
    },
    {
      language: "Indonesian",
      allergen: "Dairy",
      questions: [
        "Apakah hidangan ini mengandung produk susu?",
        "Apakah ada kontak silang dengan produk susu?"
      ]
    },
    {
      language: "Dutch",
      allergen: "Dairy",
      questions: [
        "Bevat dit gerecht zuivel?",
        "Is er kruiscontact met zuivel?"
      ]
    }
  ];

  for (const sample of samples) {
    const benchmark = {
      id: `HOLDOUT-${sample.language}`,
      profile: {
        preferredLanguage: sample.language,
        restaurantLanguage: sample.language,
        allergies: [{ name: sample.allergen, severity: "severe" }]
      },
      expectations: {
        readability: { allowedValues: ["clear"], needsRetake: false },
        dishes: [],
        requiredQuestions: [
          {
            id: "ingredients",
            scope: "each_returned_dish",
            dishNames: [],
            intent: "confirm_ingredients",
            allergens: [sample.allergen],
            requiredLanguages: [sample.language]
          },
          {
            id: "cross-contact",
            scope: "each_returned_dish",
            dishNames: [],
            intent: "confirm_cross_contact",
            allergens: [sample.allergen],
            requiredLanguages: [sample.language]
          }
        ]
      }
    };
    const result = {
      caseId: benchmark.id,
      schemaStatus: "valid",
      availability: "available",
      forbiddenSafetyClaims: 0,
      output: outputWith({
        dishes: [dish("Test dish", "ask_staff", sample.questions, sample.questions)],
        readability: "clear",
        references: []
      })
    };
    const coverage = scoreBenchmarkCase(benchmark, result).automatedQuestionIntentCoverage;
    assert.equal(coverage.total, 4, `${sample.language} should score both requirements in both channels.`);
    assert.equal(coverage.covered, 4, `${sample.language} should pass every channel-specific intent proxy.`);
    assert.deepEqual(coverage.failedRequirementIds, []);
    assert.deepEqual(
      [...new Set(coverage.checks.map((check) => check.questionChannel))].sort(),
      ["restaurant", "user"]
    );
    assert.equal(coverage.humanTranslationFidelityAssessed, false);
  }
}

function testAggregateAndSliceScoring() {
  const scores = [
    scoreBenchmarkCase(benchmarkCase, goodResult),
    scoreBenchmarkCase(benchmarkCase, failingResult),
    scoreBenchmarkCase(poorImageCase, poorImageResult),
    scoreBenchmarkCase(poorImageCase, fallbackResult)
  ];
  const summary = summarizeScores(scores);
  assert.equal(summary.results, 4);
  assert.equal(summary.passedResults, 3);
  assert.equal(summary.availableResults, 3);
  assert.equal(summary.fallbackResults, 1);
  assert.equal(summary.validSchemaResults, 3);
  assert.equal(summary.invalidSchemaResults, 1);
  assert.equal(summary.expectedDishes, 10);
  assert.equal(summary.matchedExpectedDishes, 9);
  assert.equal(summary.rates.expectedDishRecall, 0.9);
  assert.equal(summary.minimumRiskChecks, 4);
  assert.equal(summary.rates.minimumRiskPassRate, 0.5);
  assert.equal(summary.rates.maximumRiskPassRate, 0.5);
  assert.equal(summary.rates.allowedRiskPassRate, 0.5);
  assert.equal(summary.severeDirectChecks, 2);
  assert.equal(summary.severeDirectPasses, 1);
  assert.equal(summary.severeDirectMisses, 1);
  assert.equal(summary.rates.severeDirectPassRate, 0.5);
  assert.equal(summary.rates.poorImageRetakeRate, 1);
  assert.equal(summary.rates.clearPartialReadabilityAgreement, 0.5);
  assert.equal(summary.clearPartialResultAttempts, 2);
  assert.equal(summary.clearPartialSuccessfulResults, 1);
  assert.equal(summary.rates.clearPartialSuccessfulResultRate, 0.5);
  assert.equal(summary.rates.staffQuestionCoverage, 10 / 11);
  assert.equal(summary.rates.httpsReferenceCoverage, 2 / 3);
  assert.equal(summary.rates.benignOverEscalationRate, 1 / 3);
  assert.equal(summary.rates.availabilityRate, 0.75);
  assert.equal(summary.rates.fallbackRate, 0.25);
  assert.equal(summary.latencyMs.p50, 200);
  assert.equal(summary.latencyMs.p95, 400);
  assert.equal(summary.latencyMs.p99, 400);
  assert.equal(summary.wilson95.expectedDishRecall.successes, 9);
  assert.equal(summary.wilson95.expectedDishRecall.total, 10);
  assert.equal(summary.wilson95.severeDirectPassRate.successes, 1);
  assert.equal(summary.wilson95.severeDirectPassRate.total, 2);
  assert.equal(summary.wilson95.clearPartialSuccessfulResultRate.successes, 1);
  assert.equal(summary.wilson95.clearPartialSuccessfulResultRate.total, 2);
  assert.equal(summary.wilson95.fallbackRate.successes, 1);
  assert.equal(summary.wilson95.forbiddenSafetyClaimFreeRate.successes, 3);
  assert.equal(summary.wilson95.benignOverEscalationRate.total, 3);

  const slices = summarizeSlices(scores, {
    language: "case.language",
    critical: ({ case: item }) => item.critical,
    labels: ({ case: item }) => [item.sourceType, item.critical ? "critical" : "noncritical"]
  });
  assert.equal(slices.language.English.results, 2);
  assert.equal(slices.language.French.results, 2);
  assert.equal(slices.critical.true.results, 2);
  assert.equal(slices.critical.false.results, 2);
  assert.equal(slices.labels.controlled.results, 2);
  assert.equal(slices.labels.licensed.results, 2);
  assert.equal(slices.labels.critical.results, 2);
  assert.equal(slices.labels.noncritical.results, 2);

  const benchmark = scoreBenchmark({
    cases: [benchmarkCase, poorImageCase],
    results: [goodResult, poorImageResult, fallbackResult]
  }, {
    slices: ["language", "sourceType"]
  });
  assert.equal(benchmark.scores.length, 3);
  assert.equal(benchmark.summary.availableResults, 2);
  assert.equal(benchmark.slices.language.English.results, 1);
  assert.equal(benchmark.slices.sourceType.licensed.results, 2);

  assert.throws(() => scoreBenchmark({
    cases: [benchmarkCase],
    results: [{ ...goodResult, caseId: "UNKNOWN" }]
  }), /unknown benchmark case/);
  assert.throws(() => scoreBenchmark({
    cases: [benchmarkCase, structuredClone(benchmarkCase)],
    results: []
  }), /Duplicate benchmark case ID/);
}

function testExactRiskConfusionMatrix() {
  const exactRiskCase = {
    id: "CONFUSION-001",
    profile: { allergies: [{ name: "Sesame", severity: "severe" }] },
    expectations: {
      readability: { allowedValues: ["clear"], needsRetake: false },
      dishes: [
        exactRiskExpectation("Exact Match", ["avoid_unless_confirmed"]),
        exactRiskExpectation("Off Diagonal", ["ask_staff"]),
        exactRiskExpectation("Range Excluded", ["low_risk", "ask_staff"]),
        exactRiskExpectation("Missing Dish", ["high_risk"]),
        exactRiskExpectation("Invalid Actual", ["low_risk"])
      ]
    }
  };
  const score = scoreBenchmarkCase(exactRiskCase, {
    caseId: exactRiskCase.id,
    availability: "available",
    schemaStatus: "valid",
    forbiddenSafetyClaims: 0,
    output: outputWith({
      dishes: [
        dish("Exact Match", "avoid_unless_confirmed"),
        dish("Off Diagonal", "high_risk"),
        dish("Range Excluded", "low_risk"),
        dish("Invalid Actual", "not_a_risk")
      ],
      readability: "clear",
      references: []
    })
  });
  const confusion = summarizeExactRiskConfusion([score]);

  assert.equal(confusion.eligibleChecks, 4);
  assert.equal(confusion.countedChecks, 2);
  assert.equal(confusion.exactMatches, 1);
  assert.equal(confusion.excludedRangeChecks, 1);
  assert.equal(confusion.excludedInvalidExpectedChecks, 0);
  assert.equal(confusion.missingActuals, 1);
  assert.equal(confusion.invalidActuals, 1);
  assert.equal(confusion.accuracy, 0.5);
  assert.equal(confusion.matrix.avoid_unless_confirmed.avoid_unless_confirmed, 1);
  assert.equal(confusion.matrix.ask_staff.high_risk, 1);
  assert.equal(summarizeScores([score]).exactRiskConfusion.countedChecks, 2);

  const explicitUnclear = scoreBenchmarkCase({
    id: "CONFUSION-UNCLEAR",
    expected: { dishes: [exactRiskExpectation("Unreadable item", ["unclear"])] }
  }, {
    caseId: "CONFUSION-UNCLEAR",
    availability: "available",
    schemaStatus: "valid",
    forbiddenSafetyClaims: 0,
    output: outputWith({ dishes: [dish("Unreadable item", "unclear")] })
  });
  const unclearConfusion = summarizeExactRiskConfusion([explicitUnclear]);
  assert.equal(unclearConfusion.countedChecks, 1);
  assert.equal(unclearConfusion.matrix.unclear.unclear, 1);
}

function exactRiskExpectation(dishName, levels) {
  return {
    dishName,
    role: "risk_target",
    allowedRiskRange: {
      kind: "ordinal",
      minimum: levels.length === 1 ? levels[0] : levels[0],
      maximum: levels.length === 1 ? levels[0] : levels.at(-1),
      levels
    }
  };
}

function testStabilityScoring() {
  const runs = [
    stabilityResult("S-001", 1, [dish("A", "low_risk"), dish("B", "high_risk")], "clear"),
    stabilityResult("S-001", 2, [dish("A", "low_risk"), dish("B", "ask_staff"), dish("C", "low_risk")], "clear"),
    stabilityResult("S-001", 3, [dish("A", "high_risk"), dish("B", "ask_staff"), dish("C", "low_risk")], "partially_clear"),
    {
      ...stabilityResult("S-001", 4, [dish("A", "avoid_unless_confirmed")], "clear"),
      fallback: true
    }
  ];
  const caseSummary = summarizeCaseStability(runs);
  assert.equal(caseSummary.caseId, "S-001");
  assert.equal(caseSummary.runCount, 4);
  assert.equal(caseSummary.evaluatedRunCount, 3);
  assert.equal(caseSummary.excludedRunCount, 1);
  assert.equal(caseSummary.pairCount, 3);
  assert.equal(caseSummary.riskLabelComparisons, 7);
  assert.equal(caseSummary.riskLabelFlips, 4);
  assert.equal(caseSummary.riskLabelFlipRate, 4 / 7);
  approximately(caseSummary.dishSetStability, 7 / 9);
  assert.equal(caseSummary.readabilityAgreement, 1 / 3);
  assert.equal(caseSummary.riskLabelFlipRateWilson95.total, 7);

  const reversed = summarizeCaseStability([...runs].reverse());
  assert.equal(reversed.riskLabelFlipRate, caseSummary.riskLabelFlipRate);
  assert.equal(reversed.dishSetStability, caseSummary.dishSetStability);
  assert.equal(reversed.readabilityAgreement, caseSummary.readabilityAgreement);

  const includeFallback = summarizeCaseStability(runs, { includeFallback: true });
  assert.equal(includeFallback.evaluatedRunCount, 4);
  assert.equal(includeFallback.pairCount, 6);

  const secondCaseRuns = [
    stabilityResult("S-002", 1, [], "poor"),
    stabilityResult("S-002", 2, [], "poor")
  ];
  const emptyDishSets = summarizeCaseStability(secondCaseRuns);
  assert.equal(emptyDishSets.dishSetStability, 1);
  assert.equal(emptyDishSets.riskLabelFlipRate, null);
  assert.equal(emptyDishSets.readabilityAgreement, 1);

  const combined = summarizeStability([...runs, ...secondCaseRuns]);
  assert.equal(combined.caseCount, 2);
  assert.equal(combined.pairCount, 4);
  assert.equal(combined.riskLabelFlipRate, 4 / 7);
  approximately(combined.dishSetStability, 5 / 6);
  assert.equal(combined.readabilityAgreement, 0.5);
  assert.deepEqual(combined.perCase.map((item) => item.caseId), ["S-001", "S-002"]);

  const oneRun = summarizeCaseStability([runs[0]]);
  assert.equal(oneRun.pairCount, 0);
  assert.equal(oneRun.riskLabelFlipRate, null);
  assert.equal(oneRun.dishSetStability, null);
  assert.equal(oneRun.readabilityAgreement, null);
  assert.equal(oneRun.criticalRiskDowngradeComparisons, 0);
  assert.equal(oneRun.criticalRiskDowngrades, 0);
  assert.equal(oneRun.criticalRiskDowngradeRate, null);
  assert.equal(oneRun.criticalRiskDowngradeRateWilson95.total, 0);
  assert.throws(() => summarizeCaseStability([runs[0], secondCaseRuns[0]]), /one case/);
  assert.throws(() => summarizeStability([{ output: { dishes: [] } }]), /caseId/);
}

function testCriticalRiskDowngradeScoring() {
  const criticalCase = {
    id: "S-CRITICAL",
    critical: true,
    expectations: {
      dishes: [
        {
          dishName: "Critical Curry",
          role: "risk_target",
          allowedRiskRange: { minimum: "high_risk" }
        },
        {
          dishName: "Plain Rice",
          role: "benign_control",
          allowedRiskRange: { minimum: "low_risk" }
        }
      ]
    }
  };
  const runs = [
    stabilityResult("S-CRITICAL", 1, [
      dish("Critical Curry", "avoid_unless_confirmed"),
      dish("Plain Rice", "low_risk")
    ], "clear"),
    stabilityResult("S-CRITICAL", 2, [
      dish("Critical Curry", "ask_staff"),
      dish("Plain Rice", "high_risk")
    ], "clear")
  ];
  const caseSummary = summarizeCaseStability(runs, { caseMetadata: criticalCase });
  assert.equal(caseSummary.criticalRiskDowngradeComparisons, 1);
  assert.equal(caseSummary.criticalRiskNonOrdinalComparisons, 0);
  assert.equal(caseSummary.criticalRiskDowngrades, 1);
  assert.equal(caseSummary.criticalRiskDowngradeRate, 1);
  assert.equal(caseSummary.criticalRiskDowngradeRateWilson95.successes, 1);
  assert.equal(caseSummary.criticalRiskDowngradeRateWilson95.total, 1);
  assert.deepEqual(caseSummary.criticalRiskDowngradeDetails, [{
    caseId: "S-CRITICAL",
    dishName: "Critical Curry",
    expectedMinimumRisk: "high_risk",
    higherRisk: "avoid_unless_confirmed",
    higherRiskRunId: 1,
    lowerRisk: "ask_staff",
    lowerRiskRunId: 2
  }]);

  const reversed = summarizeCaseStability([...runs].reverse(), { caseMetadata: criticalCase });
  assert.deepEqual(reversed.criticalRiskDowngradeDetails, caseSummary.criticalRiskDowngradeDetails);

  const aggregate = summarizeStability(runs, { cases: [criticalCase] });
  assert.equal(aggregate.criticalRiskDowngradeComparisons, 1);
  assert.equal(aggregate.criticalRiskDowngrades, 1);
  assert.equal(aggregate.criticalRiskDowngradeRate, 1);
  assert.deepEqual(aggregate.perCase[0].criticalRiskDowngradeDetails, caseSummary.criticalRiskDowngradeDetails);

  const unclearRun = stabilityResult(
    "S-CRITICAL",
    3,
    [dish("Critical Curry", "unclear")],
    "poor"
  );
  const nonOrdinal = summarizeCaseStability([runs[0], unclearRun], { caseMetadata: criticalCase });
  assert.equal(nonOrdinal.riskLabelComparisons, 1);
  assert.equal(nonOrdinal.riskLabelFlips, 1);
  assert.equal(nonOrdinal.criticalRiskDowngradeComparisons, 0);
  assert.equal(nonOrdinal.criticalRiskNonOrdinalComparisons, 1);
  assert.equal(nonOrdinal.criticalRiskDowngrades, 0);
  assert.equal(nonOrdinal.criticalRiskDowngradeRate, null);
}

function testNewMetricZeroDenominators() {
  const score = scoreBenchmarkCase(poorImageCase, poorImageResult);
  const summary = summarizeScores([score]);

  assert.equal(score.automatedQuestionIntentCoverage.total, 0);
  assert.equal(score.automatedQuestionIntentCoverage.covered, 0);
  assert.equal(score.automatedQuestionIntentCoverage.coverage, null);
  assert.equal(summary.severeDirectChecks, 0);
  assert.equal(summary.severeDirectPasses, 0);
  assert.equal(summary.rates.severeDirectPassRate, null);
  assert.equal(summary.wilson95.severeDirectPassRate.total, 0);
  assert.equal(summary.clearPartialResultAttempts, 0);
  assert.equal(summary.clearPartialSuccessfulResults, 0);
  assert.equal(summary.rates.clearPartialSuccessfulResultRate, null);
  assert.equal(summary.wilson95.clearPartialSuccessfulResultRate.total, 0);
  assert.equal(summary.automatedQuestionIntentRequirements, 0);
  assert.equal(summary.automatedQuestionIntentPasses, 0);
  assert.equal(summary.rates.automatedQuestionIntentCoverage, null);
  assert.equal(summary.wilson95.automatedQuestionIntentCoverage.total, 0);

  const stability = summarizeCaseStability([
    stabilityResult("S-ZERO", 1, [dish("A", "high_risk")], "clear"),
    stabilityResult("S-ZERO", 2, [dish("A", "low_risk")], "clear")
  ]);
  assert.equal(stability.criticalRiskDowngradeComparisons, 0);
  assert.equal(stability.criticalRiskDowngrades, 0);
  assert.equal(stability.criticalRiskDowngradeRate, null);
  assert.equal(stability.criticalRiskDowngradeRateWilson95.total, 0);
}

function testStatistics() {
  const values = [400, 100, 300, 200];
  assert.equal(nearestRankPercentile(values, 0), 100);
  assert.equal(nearestRankPercentile(values, 0.5), 200);
  assert.equal(nearestRankPercentile(values, 0.95), 400);
  assert.equal(nearestRankPercentile(values, 1), 400);
  assert.equal(nearestRankPercentile([], 0.5), null);
  assert.deepEqual(values, [400, 100, 300, 200], "Percentiles must not mutate their input.");
  assert.throws(() => nearestRankPercentile([1, Number.NaN], 0.5), /finite/);
  assert.throws(() => nearestRankPercentile([1], 1.1), /between 0 and 1/);

  const latencies = latencyPercentiles([10, { latencyMs: 30 }, {}, -1]);
  assert.equal(latencies.count, 2);
  assert.equal(latencies.excludedCount, 2);
  assert.equal(latencies.p50, 10);
  assert.equal(latencies.p95, 30);

  const none = wilsonInterval(0, 0);
  assert.equal(none.rate, null);
  assert.equal(none.lower, null);
  assert.equal(none.upper, null);
  const zeroOfTen = wilsonInterval(0, 10);
  approximately(zeroOfTen.lower, 0);
  approximately(zeroOfTen.upper, 0.2775327998628892);
  const fiveOfTen = wilsonInterval(5, 10);
  approximately(fiveOfTen.lower, 0.236593090512564);
  approximately(fiveOfTen.upper, 0.7634069094874361);
  const tenOfTen = wilsonInterval(10, 10);
  approximately(tenOfTen.lower, 0.7224672001371107);
  approximately(tenOfTen.upper, 1);
  assert.throws(() => wilsonInterval(11, 10), /between 0 and total/);
  assert.throws(() => wilsonInterval(0.5, 1), /integers/);
}

function outputWith({
  dishes,
  readability,
  needsRetake = false,
  overallRisk = "ask_staff",
  references,
  pageAssessments
}) {
  return {
    dishes,
    scanSummary: { overallRisk },
    imageQuality: { readability, needsRetake },
    ...(Array.isArray(pageAssessments) ? { pageAssessments } : {}),
    transparency: { sourceReferences: references }
  };
}

function dish(
  dishName,
  riskLevel,
  questionsToAsk = ["What ingredients are used?"],
  questionsToAskUserLanguage = questionsToAsk
) {
  return { dishName, riskLevel, questionsToAsk, questionsToAskUserLanguage };
}

function stabilityResult(caseId, pass, dishes, readability) {
  return {
    caseId,
    pass,
    availability: "available",
    output: {
      dishes,
      imageQuality: { readability }
    }
  };
}

function approximately(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} was not within ${epsilon} of ${expected}`);
}
