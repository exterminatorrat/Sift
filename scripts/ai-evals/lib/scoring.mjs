import {
  latencyPercentiles,
  ratio,
  wilsonInterval
} from "./statistics.mjs";

export const RISK_RANK = Object.freeze({
  low_risk: 0,
  ask_staff: 1,
  high_risk: 2,
  avoid_unless_confirmed: 3
});

export const RISK_LEVELS = Object.freeze([
  "low_risk",
  "ask_staff",
  "high_risk",
  "avoid_unless_confirmed",
  "unclear"
]);

const VALID_SCHEMA_STATUSES = new Set(["valid", "invalid", "unknown"]);
const VALID_AVAILABILITY_STATUSES = new Set(["available", "fallback", "unavailable", "unknown"]);
const DEFAULT_OVER_ESCALATED_RISKS = new Set(["high_risk", "avoid_unless_confirmed"]);
const QUESTION_LANGUAGE_ALIASES = new Map([
  ["english", "en"],
  ["spanish", "es"],
  ["french", "fr"],
  ["german", "de"],
  ["italian", "it"],
  ["portuguese", "pt"],
  ["japanese", "ja"],
  ["korean", "ko"],
  ["chinese", "zh"],
  ["simplified chinese", "zh-hans"],
  ["traditional chinese", "zh-hant"],
  ["thai", "th"],
  ["vietnamese", "vi"],
  ["turkish", "tr"],
  ["polish", "pl"],
  ["indonesian", "id"],
  ["dutch", "nl"]
]);

const AUTOMATED_QUESTION_INTENT_MARKERS = Object.freeze({
  request_readable_menu: [
    "readable menu", "clearer menu", "clearer photo", "clearer image", "another photo", "retake*",
    "menú más legible", "carta más legible", "menu lisible", "photo plus nette",
    "lesbare speisekarte", "schärferes foto", "menu più leggibile", "foto più chiara",
    "menu mais legível", "foto mais nítida", "読みやすいメニュー", "鮮明な写真",
    "선명한 메뉴", "선명한 사진", "清晰的菜单", "清晰的菜單", "清楚的照片",
    "เมนูที่อ่านได้", "รูปที่ชัดเจน", "thực đơn rõ hơn", "ảnh rõ hơn", "chụp lại",
    "daha okunaklı menü", "daha net fotoğraf", "yeniden çek", "czytelniejsze menu",
    "wyraźniejsze zdjęcie", "zrób zdjęcie ponownie", "menu yang lebih jelas",
    "foto yang lebih jelas", "ambil ulang", "leesbaarder menu", "duidelijkere foto",
    "maak opnieuw een foto"
  ],
  confirm_ingredients: [
    "ingredient*", "contain*", "made with", "contien*", "contient", "composé de",
    "zutat*", "enthält", "contem", "原材料", "含ま", "入って", "성분", "들어",
    "成分", "含有", "ส่วนผสม", "มีส่วนผสม", "thành phần", "có chứa", "içerik", "içerir",
    "składnik*", "zawiera", "bahan", "mengandung", "ingrediënt*", "bevat"
  ],
  confirm_preparation: [
    "prepar*", "cook*", "cooking method", "fried", "fryer", "oil used",
    "cómo se cocina", "mode de cuisson", "zubereit*", "gekocht", "come viene preparato",
    "como é preparado", "調理", "作り方", "조리", "준비", "烹饪", "烹飪", "做法", "ปรุง", "เตรียม",
    "chế biến", "nấu", "chiên", "hazırlan*", "pişir*", "kızart*", "przygot*", "gotow*",
    "smaż*", "disiapkan", "dimasak", "digoreng", "bereid", "gekookt", "gefrituurd"
  ],
  confirm_cross_contact: [
    "cross contact", "cross contamination", "shared equipment", "shared fryer", "same fryer",
    "contaminación cruzada", "equipo compartido", "contamination croisée", "matériel partagé",
    "kreuzkontakt", "kreuzkontamination", "gemeinsame geräte", "contaminazione incrociata",
    "attrezzatura condivisa", "contaminação cruzada", "equipamento compartilhado",
    "交差接触", "交差汚染", "共用設備", "共用设备", "교차 접촉", "교차오염", "공용 장비",
    "交叉接触", "交叉污染", "共用设备", "交叉接觸", "交叉污染", "共用設備",
    "การปนเปื้อนข้าม", "การสัมผัสข้าม", "อุปกรณ์ร่วม",
    "tiếp xúc chéo", "nhiễm chéo", "thiết bị dùng chung", "nồi chiên dùng chung",
    "çapraz temas", "çapraz bulaşma", "ortak ekipman", "ortak fritöz",
    "kontakt krzyżowy", "zanieczyszczenie krzyżowe", "wspólny sprzęt", "wspólna frytkownica",
    "kontak silang", "kontaminasi silang", "peralatan bersama", "penggorengan bersama",
    "kruiscontact", "kruisbesmetting", "gedeelde apparatuur", "gedeelde friteuse"
  ]
});

const ALLERGEN_NAME_MARKERS = Object.freeze({
  dairy: ["dairy", "milk", "leche", "lait", "milch", "latte", "leite", "乳製品", "乳制品", "우유", "牛奶", "นม", "sữa", "süt ürünleri", "nabiał", "mleko", "produk susu", "zuivel"],
  egg: ["egg*", "huevo*", "oeuf*", "eier", "uov*", "ovo*", "卵", "鶏卵", "鸡蛋", "계란", "ไข่", "trứng", "yumurta", "jajk*", "telur", "ei", "eieren"],
  fish: ["fish", "pescado", "poisson", "fisch", "pesce", "peixe", "魚", "鱼", "생선", "ปลา", "cá", "balık", "ryba", "ikan", "vis"],
  mango: ["mango*", "マンゴー", "망고", "芒果", "มะม่วง"],
  mustard: ["mustard", "mostaza", "moutarde", "senf", "senape", "mostarda", "からし", "マスタード", "겨자", "芥末", "มัสตาร์ด", "mù tạt", "hardal", "musztarda", "moster", "mosterd"],
  peanut: ["peanut*", "cacahuete*", "maní", "arachide*", "erdnuss*", "arachid*", "amendoim", "ピーナッツ", "落花生", "땅콩", "花生", "ถั่วลิสง", "đậu phộng", "lạc", "yer fıstığı", "orzeszki ziemne", "kacang tanah", "pinda*"],
  sesame: ["sesame", "sésamo", "sésame", "sesam", "gergelim", "ごま", "ゴマ", "참깨", "芝麻", "งา"],
  shellfish: ["shellfish", "marisco*", "crustacé*", "schalentier*", "frutti di mare", "frutos do mar", "甲殻類", "甲壳类", "갑각류", "貝類", "贝类", "สัตว์น้ำมีเปลือก", "động vật có vỏ", "kabuklu deniz ürünü", "skorupiak*", "kerang-kerangan", "schaaldier*"],
  soy: ["soy*", "soja", "soia", "大豆", "대두", "ถั่วเหลือง", "đậu nành", "soya", "soja", "kedelai"],
  sulfites: ["sulfite*", "sulfito*", "sulfit*", "亜硫酸塩", "亞硫酸鹽", "亚硫酸盐", "아황산염", "ซัลไฟต์", "sulfitler", "siarczyn*", "sulfit", "sulfiet*"],
  "tree nuts": ["tree nut*", "frutos secos", "noix", "nüsse", "frutta a guscio", "木の実", "堅果", "坚果", "견과류", "ถั่วเปลือกแข็ง", "hạt cây", "sert kabuklu yemiş*", "orzechy drzewne", "kacang pohon", "boomnoot*"],
  "wheat gluten": ["wheat", "gluten", "trigo", "blé", "weizen", "grano", "小麦", "小麥", "麩質", "밀", "ข้าวสาลี", "lúa mì", "buğday", "pszenica", "gandum", "tarwe"]
});

export function riskRank(value, ranking = RISK_RANK) {
  return Object.prototype.hasOwnProperty.call(ranking, value) ? ranking[value] : null;
}

export function compareRiskLevels(left, right, ranking = RISK_RANK) {
  const leftRank = riskRank(left, ranking);
  const rightRank = riskRank(right, ranking);
  return leftRank === null || rightRank === null ? null : Math.sign(leftRank - rightRank);
}

export function normalizeSchemaStatus(value) {
  if (typeof value === "boolean") return value ? "valid" : "invalid";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["valid", "ok", "pass", "passed", "success", "successful"].includes(normalized)) return "valid";
    if (["invalid", "error", "fail", "failed", "rejected"].includes(normalized)) return "invalid";
    if (["unknown", "not_run", "skipped", "unavailable", "missing"].includes(normalized)) return "unknown";
    return "unknown";
  }
  if (isRecord(value)) {
    if (value.status !== undefined) return normalizeSchemaStatus(value.status);
    if (value.ok !== undefined) return normalizeSchemaStatus(value.ok);
    if (value.valid !== undefined) return normalizeSchemaStatus(value.valid);
    if (value.passed !== undefined) return normalizeSchemaStatus(value.passed);
  }
  return "unknown";
}

export function normalizeAvailabilityStatus(value) {
  if (typeof value === "boolean") return value ? "available" : "unavailable";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["available", "success", "successful", "model", "primary"].includes(normalized)) return "available";
    if (["fallback", "degraded"].includes(normalized)) return "fallback";
    if (["unavailable", "failed", "failure", "error", "timeout"].includes(normalized)) return "unavailable";
    if (["unknown", "not_run", "skipped", "missing"].includes(normalized)) return "unknown";
    return "unknown";
  }
  if (isRecord(value)) {
    if (value.status !== undefined) return normalizeAvailabilityStatus(value.status);
    if (value.available !== undefined) return normalizeAvailabilityStatus(value.available);
    if (value.ok !== undefined) return normalizeAvailabilityStatus(value.ok);
  }
  return "unknown";
}

export function normalizeDishName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function getResultOutput(resultEnvelope) {
  if (!isRecord(resultEnvelope)) return null;
  if (isRecord(resultEnvelope.output)) return resultEnvelope.output;
  if (isRecord(resultEnvelope.result?.output)) return resultEnvelope.result.output;
  if (isRecord(resultEnvelope.result)) return resultEnvelope.result;
  return resultEnvelope;
}

export function getResultDishes(resultEnvelope, options = {}) {
  const output = getResultOutput(resultEnvelope);
  const dishes = options.getDishes?.(output, resultEnvelope) ?? output?.dishes;
  return Array.isArray(dishes) ? dishes : [];
}

export function getResultReadability(resultEnvelope, options = {}) {
  const output = getResultOutput(resultEnvelope);
  const value = options.getReadability?.(output, resultEnvelope)
    ?? resultEnvelope?.readability
    ?? output?.imageQuality?.readability
    ?? output?.readability;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function getResultCaseId(resultEnvelope, options = {}) {
  const value = options.getCaseId?.(resultEnvelope)
    ?? resultEnvelope?.caseId
    ?? resultEnvelope?.benchmarkCaseId
    ?? resultEnvelope?.testCaseId;
  return value === undefined || value === null || value === "" ? null : String(value);
}

export function getResultAvailabilityStatus(resultEnvelope, options = {}) {
  const output = getResultOutput(resultEnvelope);
  if (
    resultEnvelope?.fallback === true
    || resultEnvelope?.analysisSource === "fallback"
    || output?.fallback === true
    || output?.analysisSource === "fallback"
  ) return "fallback";

  const explicit = options.getAvailability?.(resultEnvelope, output)
    ?? resultEnvelope?.availabilityStatus
    ?? resultEnvelope?.availability
    ?? resultEnvelope?.available;
  if (explicit !== undefined) return normalizeAvailabilityStatus(explicit);
  if (resultEnvelope?.fallback === false) return "available";
  if (output === null) return "unavailable";
  if (Array.isArray(output.dishes) || isRecord(output.scanSummary) || isRecord(output.imageQuality)) {
    return "available";
  }
  return "unknown";
}

export function findDishByName(dishes, expectedName, options = {}) {
  const getDishName = options.getDishName ?? ((dish) => dish?.dishName ?? dish?.name);
  const expected = normalizeDishName(expectedName);
  if (!expected || !Array.isArray(dishes)) return null;

  const named = dishes
    .map((dish) => ({ dish, name: normalizeDishName(getDishName(dish)) }))
    .filter((entry) => entry.name !== "");
  const exact = named.find((entry) => entry.name === expected);
  if (exact) return exact.dish;

  const fuzzy = named.filter((entry) => entry.name.includes(expected) || expected.includes(entry.name));
  return fuzzy.length === 1 ? fuzzy[0].dish : null;
}

/**
 * Scores one case/result pair without performing I/O. Schema validity and any
 * external safety detector outcome enter through the result envelope or hooks.
 */
export function scoreBenchmarkCase(caseEnvelope, resultEnvelope, options = {}) {
  if (!isRecord(caseEnvelope)) throw new TypeError("caseEnvelope must be an object.");
  if (!isRecord(resultEnvelope)) throw new TypeError("resultEnvelope must be an object.");

  const output = getResultOutput(resultEnvelope);
  const dishes = getResultDishes(resultEnvelope, options);
  const expected = isRecord(caseEnvelope.expected)
    ? caseEnvelope.expected
    : isRecord(caseEnvelope.expectations)
      ? caseEnvelope.expectations
      : {};
  const riskExpectations = collectRiskExpectations(caseEnvelope, expected);
  const versionedDishExpectations = Array.isArray(expected.dishes) ? expected.dishes : [];
  const benignDishNames = uniqueNames([
    ...(expected.benignDishes ?? []),
    ...(versionedDishExpectations
      .filter((item) => isRecord(item) && item.role === "benign_control")
      .map((item) => item.dishName ?? item.name))
  ]);
  const expectedDishNames = uniqueNames([
    ...riskExpectations.map((item) => item.dishName),
    ...extractExpectedDishNames(expected),
    ...benignDishNames
  ]);
  const dishMatches = matchExpectedDishes(expectedDishNames, dishes, options);
  const availabilityStatus = getResultAvailabilityStatus(resultEnvelope, options);
  const modelChecksSkipped = availabilityStatus !== "available";
  const schemaStatus = extractSchemaStatus(resultEnvelope, options);
  const minimumChecks = [];
  const maximumChecks = [];
  const allowedChecks = [];
  let severeDirectChecks = 0;
  let severeDirectPasses = 0;
  let severeDirectMisses = 0;

  if (!modelChecksSkipped) {
    for (const expectation of riskExpectations) {
      const dish = dishMatches.get(normalizeDishName(expectation.dishName)) ?? null;
      const actualRisk = getDishRisk(dish, options);
      if (expectation.minimumRisk !== null) {
        const check = evaluateOrderedRiskCheck("minimum", expectation, dish, actualRisk, options.riskRanking ?? RISK_RANK);
        minimumChecks.push(check);
        if (isSevereDirectExpectation(expectation, caseEnvelope)) {
          severeDirectChecks += 1;
          if (check.passed) severeDirectPasses += 1;
          else severeDirectMisses += 1;
        }
      }
      if (expectation.maximumRisk !== null) {
        maximumChecks.push(evaluateOrderedRiskCheck("maximum", expectation, dish, actualRisk, options.riskRanking ?? RISK_RANK));
      }
      if (expectation.allowedRisks !== null) {
        allowedChecks.push(evaluateAllowedRiskCheck(expectation, dish, actualRisk));
      }
    }
  }

  const matchedExpectedDishes = modelChecksSkipped
    ? []
    : expectedDishNames.filter((name) => dishMatches.has(normalizeDishName(name)));
  const missingExpectedDishes = modelChecksSkipped
    ? []
    : expectedDishNames.filter((name) => !dishMatches.has(normalizeDishName(name)));
  const matchedBenignDishes = modelChecksSkipped
    ? []
    : benignDishNames
      .map((dishName) => ({
        dishName,
        dish: dishMatches.get(normalizeDishName(dishName)) ?? null
      }))
      .filter((entry) => entry.dish !== null);
  const configuredOverEscalatedRisks = options.benignOverEscalatedRisks ?? DEFAULT_OVER_ESCALATED_RISKS;
  const overEscalatedRisks = configuredOverEscalatedRisks instanceof Set
    ? configuredOverEscalatedRisks
    : new Set(Array.isArray(configuredOverEscalatedRisks)
      ? configuredOverEscalatedRisks
      : [configuredOverEscalatedRisks]);
  const benignOverEscalations = matchedBenignDishes.filter(({ dish }) => (
    overEscalatedRisks.has(getDishRisk(dish, options))
  ));
  const readabilityExpectation = extractReadabilityExpectation(expected);
  const expectedReadability = readabilityExpectation.allowedValues.length === 1
    ? readabilityExpectation.allowedValues[0]
    : null;
  const actualReadability = getResultReadability(resultEnvelope, options);
  const actualNeedsRetake = options.getNeedsRetake?.(output, resultEnvelope)
    ?? output?.imageQuality?.needsRetake
    ?? output?.needsRetake;
  const expectedOverallRisks = extractOverallRiskValues(expected);
  const expectedOverallRisk = expectedOverallRisks.length === 1 ? expectedOverallRisks[0] : null;
  const actualOverallRisk = options.getOverallRisk?.(output, resultEnvelope)
    ?? output?.scanSummary?.overallRisk
    ?? output?.overallRisk
    ?? null;
  const isPoorImageCase = readabilityExpectation.allowedValues.includes("poor");
  const isClearOrPartialCase = readabilityExpectation.allowedValues.length > 0
    && readabilityExpectation.allowedValues.every((value) => value === "clear" || value === "partially_clear");
  const poorImageRetakePassed = !isPoorImageCase || modelChecksSkipped
    ? null
    : actualNeedsRetake === true
      && (expectedOverallRisks.length === 0 || expectedOverallRisks.includes(actualOverallRisk));
  const clearPartialReadabilityAgreed = !isClearOrPartialCase || modelChecksSkipped
    ? null
    : readabilityExpectation.allowedValues.includes(actualReadability);
  const readabilityMatched = readabilityExpectation.allowedValues.length === 0 || modelChecksSkipped
    ? null
    : readabilityExpectation.allowedValues.includes(actualReadability);
  const forbiddenSafetyClaims = resolveForbiddenSafetyClaims(caseEnvelope, resultEnvelope, output, options);
  const staffQuestions = scoreStaffQuestions(dishes, options);
  const automatedQuestionIntentCoverage = scoreAutomatedQuestionIntentCoverage(
    expected.requiredQuestions,
    dishes,
    caseEnvelope,
    resultEnvelope,
    output,
    options
  );
  const references = scoreReferences(output, resultEnvelope, options);
  const pages = scorePageCoverage({
    expected,
    output,
    dishes,
    dishMatches,
    versionedDishExpectations,
    modelChecksSkipped
  });
  const failures = [];

  if (schemaStatus !== "valid") failures.push(`schema_${schemaStatus}`);
  if (forbiddenSafetyClaims.count > 0) failures.push("forbidden_safety_claim");
  if (staffQuestions.total > 0 && staffQuestions.covered !== staffQuestions.total) failures.push("missing_staff_question");
  if (references.invalid.length > 0) failures.push("non_https_reference");
  if (!modelChecksSkipped) {
    if (missingExpectedDishes.length > 0) failures.push("expected_dish_missing");
    if (minimumChecks.some((check) => !check.passed)) failures.push("minimum_risk_not_met");
    if (maximumChecks.some((check) => !check.passed)) failures.push("maximum_risk_exceeded");
    if (allowedChecks.some((check) => !check.passed)) failures.push("risk_not_allowed");
    if (poorImageRetakePassed === false) failures.push("poor_image_retake_not_met");
    if (clearPartialReadabilityAgreed === false) failures.push("readability_disagreed");
    failures.push(...pages.failures);
  }

  const clearPartialSuccessfulResult = !isClearOrPartialCase
    ? null
    : availabilityStatus === "available" && schemaStatus === "valid" && failures.length === 0;

  return {
    caseId: String(caseEnvelope.id ?? caseEnvelope.caseId ?? getResultCaseId(resultEnvelope, options) ?? ""),
    runId: resultEnvelope.runId ?? resultEnvelope.pass ?? null,
    case: caseEnvelope,
    result: resultEnvelope,
    passed: failures.length === 0,
    failures: [...new Set(failures)],
    schemaStatus,
    availabilityStatus,
    modelChecksSkipped,
    latencyMs: finiteNonNegative(resultEnvelope.latencyMs) ? resultEnvelope.latencyMs : null,
    expectedDishes: {
      total: modelChecksSkipped ? 0 : expectedDishNames.length,
      matched: matchedExpectedDishes.length,
      missing: missingExpectedDishes,
      recall: modelChecksSkipped ? null : ratio(matchedExpectedDishes.length, expectedDishNames.length)
    },
    risk: {
      minimumChecks,
      maximumChecks,
      allowedChecks,
      minimumViolations: minimumChecks.filter((check) => !check.passed).length,
      maximumViolations: maximumChecks.filter((check) => !check.passed).length,
      allowedViolations: allowedChecks.filter((check) => !check.passed).length,
      severeDirectChecks,
      severeDirectPasses,
      severeDirectMisses
    },
    image: {
      expectedReadability,
      allowedReadabilityValues: readabilityExpectation.allowedValues,
      actualReadability,
      readabilityMatched,
      isPoorImageCase: !modelChecksSkipped && isPoorImageCase,
      poorImageRetakePassed,
      isClearOrPartialCase: !modelChecksSkipped && isClearOrPartialCase,
      clearPartialReadabilityAgreed,
      isClearOrPartialExpectedCase: isClearOrPartialCase,
      clearPartialSuccessfulResult,
      expectedOverallRisk,
      allowedOverallRisks: expectedOverallRisks,
      actualOverallRisk,
      actualNeedsRetake: typeof actualNeedsRetake === "boolean" ? actualNeedsRetake : null
    },
    safety: forbiddenSafetyClaims,
    staffQuestions,
    automatedQuestionIntentCoverage,
    references,
    pages,
    benign: {
      expected: modelChecksSkipped ? 0 : benignDishNames.length,
      matched: matchedBenignDishes.length,
      overEscalated: benignOverEscalations.length,
      overEscalatedDishes: benignOverEscalations.map(({ dishName }) => dishName),
      overEscalationRate: ratio(benignOverEscalations.length, matchedBenignDishes.length)
    }
  };
}

export function summarizeScores(scores) {
  if (!Array.isArray(scores)) throw new TypeError("scores must be an array.");

  const totals = {
    results: scores.length,
    passedResults: 0,
    availableResults: 0,
    fallbackResults: 0,
    unavailableResults: 0,
    unknownAvailabilityResults: 0,
    validSchemaResults: 0,
    invalidSchemaResults: 0,
    unknownSchemaResults: 0,
    expectedDishes: 0,
    matchedExpectedDishes: 0,
    minimumRiskChecks: 0,
    minimumRiskPasses: 0,
    maximumRiskChecks: 0,
    maximumRiskPasses: 0,
    allowedRiskChecks: 0,
    allowedRiskPasses: 0,
    severeDirectChecks: 0,
    severeDirectPasses: 0,
    severeDirectMisses: 0,
    poorImageCases: 0,
    poorImageRetakePasses: 0,
    clearPartialReadabilityCases: 0,
    clearPartialReadabilityAgreements: 0,
    clearPartialResultAttempts: 0,
    clearPartialSuccessfulResults: 0,
    forbiddenSafetyClaimResults: 0,
    forbiddenSafetyClaims: 0,
    staffQuestionDishes: 0,
    staffQuestionCoveredDishes: 0,
    automatedQuestionIntentRequirements: 0,
    automatedQuestionIntentPasses: 0,
    sourceReferences: 0,
    httpsSourceReferences: 0,
    pageAssessmentChecks: 0,
    pageAssessmentPasses: 0,
    dishPageAttributionChecks: 0,
    dishPageAttributionPasses: 0,
    invalidSourcePageReferences: 0,
    matchedBenignDishes: 0,
    benignOverEscalations: 0
  };

  for (const score of scores) {
    if (score.passed) totals.passedResults += 1;
    const availabilityKey = {
      available: "availableResults",
      fallback: "fallbackResults",
      unavailable: "unavailableResults",
      unknown: "unknownAvailabilityResults"
    }[VALID_AVAILABILITY_STATUSES.has(score.availabilityStatus) ? score.availabilityStatus : "unknown"];
    totals[availabilityKey] += 1;
    const schemaKey = {
      valid: "validSchemaResults",
      invalid: "invalidSchemaResults",
      unknown: "unknownSchemaResults"
    }[VALID_SCHEMA_STATUSES.has(score.schemaStatus) ? score.schemaStatus : "unknown"];
    totals[schemaKey] += 1;
    totals.forbiddenSafetyClaimResults += score.safety.count === 0 ? 0 : 1;
    totals.forbiddenSafetyClaims += score.safety.count;
    totals.staffQuestionDishes += score.staffQuestions.total;
    totals.staffQuestionCoveredDishes += score.staffQuestions.covered;
    totals.automatedQuestionIntentRequirements += score.automatedQuestionIntentCoverage.total;
    totals.automatedQuestionIntentPasses += score.automatedQuestionIntentCoverage.covered;
    totals.sourceReferences += score.references.total;
    totals.httpsSourceReferences += score.references.https;
    totals.pageAssessmentChecks += score.pages?.assessmentChecks ?? 0;
    totals.pageAssessmentPasses += score.pages?.assessmentPasses ?? 0;
    totals.dishPageAttributionChecks += score.pages?.dishAttributionChecks ?? 0;
    totals.dishPageAttributionPasses += score.pages?.dishAttributionPasses ?? 0;
    totals.invalidSourcePageReferences += score.pages?.invalidSourcePageReferences?.length ?? 0;
    if (score.image.isClearOrPartialExpectedCase) {
      totals.clearPartialResultAttempts += 1;
      if (score.image.clearPartialSuccessfulResult) totals.clearPartialSuccessfulResults += 1;
    }

    if (score.modelChecksSkipped) continue;
    totals.expectedDishes += score.expectedDishes.total;
    totals.matchedExpectedDishes += score.expectedDishes.matched;
    totals.minimumRiskChecks += score.risk.minimumChecks.length;
    totals.minimumRiskPasses += score.risk.minimumChecks.filter((check) => check.passed).length;
    totals.maximumRiskChecks += score.risk.maximumChecks.length;
    totals.maximumRiskPasses += score.risk.maximumChecks.filter((check) => check.passed).length;
    totals.allowedRiskChecks += score.risk.allowedChecks.length;
    totals.allowedRiskPasses += score.risk.allowedChecks.filter((check) => check.passed).length;
    totals.severeDirectChecks += score.risk.severeDirectChecks;
    totals.severeDirectPasses += score.risk.severeDirectPasses;
    totals.severeDirectMisses += score.risk.severeDirectMisses;
    if (score.image.isPoorImageCase) {
      totals.poorImageCases += 1;
      if (score.image.poorImageRetakePassed) totals.poorImageRetakePasses += 1;
    }
    if (score.image.isClearOrPartialCase) {
      totals.clearPartialReadabilityCases += 1;
      if (score.image.clearPartialReadabilityAgreed) totals.clearPartialReadabilityAgreements += 1;
    }
    totals.matchedBenignDishes += score.benign.matched;
    totals.benignOverEscalations += score.benign.overEscalated;
  }

  const rates = {
    passRate: ratio(totals.passedResults, totals.results),
    availabilityRate: ratio(totals.availableResults, totals.results),
    fallbackRate: ratio(totals.fallbackResults, totals.results),
    schemaValidRate: ratio(totals.validSchemaResults, totals.results),
    expectedDishRecall: ratio(totals.matchedExpectedDishes, totals.expectedDishes),
    minimumRiskPassRate: ratio(totals.minimumRiskPasses, totals.minimumRiskChecks),
    maximumRiskPassRate: ratio(totals.maximumRiskPasses, totals.maximumRiskChecks),
    allowedRiskPassRate: ratio(totals.allowedRiskPasses, totals.allowedRiskChecks),
    severeDirectPassRate: ratio(totals.severeDirectPasses, totals.severeDirectChecks),
    poorImageRetakeRate: ratio(totals.poorImageRetakePasses, totals.poorImageCases),
    clearPartialReadabilityAgreement: ratio(
      totals.clearPartialReadabilityAgreements,
      totals.clearPartialReadabilityCases
    ),
    clearPartialSuccessfulResultRate: ratio(
      totals.clearPartialSuccessfulResults,
      totals.clearPartialResultAttempts
    ),
    forbiddenSafetyClaimFreeRate: ratio(
      totals.results - totals.forbiddenSafetyClaimResults,
      totals.results
    ),
    staffQuestionCoverage: ratio(totals.staffQuestionCoveredDishes, totals.staffQuestionDishes),
    automatedQuestionIntentCoverage: ratio(
      totals.automatedQuestionIntentPasses,
      totals.automatedQuestionIntentRequirements
    ),
    httpsReferenceCoverage: ratio(totals.httpsSourceReferences, totals.sourceReferences),
    pageAssessmentAccuracy: ratio(totals.pageAssessmentPasses, totals.pageAssessmentChecks),
    dishPageAttributionAccuracy: ratio(
      totals.dishPageAttributionPasses,
      totals.dishPageAttributionChecks
    ),
    benignOverEscalationRate: ratio(totals.benignOverEscalations, totals.matchedBenignDishes)
  };

  return {
    ...totals,
    failedResults: totals.results - totals.passedResults,
    rates,
    exactRiskConfusion: summarizeExactRiskConfusion(scores),
    latencyMs: latencyPercentiles(scores),
    wilson95: {
      passRate: wilsonInterval(totals.passedResults, totals.results),
      availabilityRate: wilsonInterval(totals.availableResults, totals.results),
      fallbackRate: wilsonInterval(totals.fallbackResults, totals.results),
      schemaValidRate: wilsonInterval(totals.validSchemaResults, totals.results),
      expectedDishRecall: wilsonInterval(totals.matchedExpectedDishes, totals.expectedDishes),
      minimumRiskPassRate: wilsonInterval(totals.minimumRiskPasses, totals.minimumRiskChecks),
      maximumRiskPassRate: wilsonInterval(totals.maximumRiskPasses, totals.maximumRiskChecks),
      allowedRiskPassRate: wilsonInterval(totals.allowedRiskPasses, totals.allowedRiskChecks),
      severeDirectPassRate: wilsonInterval(totals.severeDirectPasses, totals.severeDirectChecks),
      poorImageRetakeRate: wilsonInterval(totals.poorImageRetakePasses, totals.poorImageCases),
      clearPartialReadabilityAgreement: wilsonInterval(
        totals.clearPartialReadabilityAgreements,
        totals.clearPartialReadabilityCases
      ),
      clearPartialSuccessfulResultRate: wilsonInterval(
        totals.clearPartialSuccessfulResults,
        totals.clearPartialResultAttempts
      ),
      forbiddenSafetyClaimFreeRate: wilsonInterval(
        totals.results - totals.forbiddenSafetyClaimResults,
        totals.results
      ),
      staffQuestionCoverage: wilsonInterval(totals.staffQuestionCoveredDishes, totals.staffQuestionDishes),
      automatedQuestionIntentCoverage: wilsonInterval(
        totals.automatedQuestionIntentPasses,
        totals.automatedQuestionIntentRequirements
      ),
      httpsReferenceCoverage: wilsonInterval(totals.httpsSourceReferences, totals.sourceReferences),
      pageAssessmentAccuracy: wilsonInterval(totals.pageAssessmentPasses, totals.pageAssessmentChecks),
      dishPageAttributionAccuracy: wilsonInterval(
        totals.dishPageAttributionPasses,
        totals.dishPageAttributionChecks
      ),
      benignOverEscalationRate: wilsonInterval(
        totals.benignOverEscalations,
        totals.matchedBenignDishes
      )
    }
  };
}

export function summarizeExactRiskConfusion(scores) {
  if (!Array.isArray(scores)) throw new TypeError("scores must be an array.");

  const levels = [...RISK_LEVELS];
  const validLevels = new Set(levels);
  const matrix = Object.fromEntries(levels.map((expected) => [
    expected,
    Object.fromEntries(levels.map((actual) => [actual, 0]))
  ]));
  const summary = {
    eligibleChecks: 0,
    countedChecks: 0,
    exactMatches: 0,
    excludedRangeChecks: 0,
    excludedInvalidExpectedChecks: 0,
    missingActuals: 0,
    invalidActuals: 0,
    accuracy: null,
    levels,
    matrix
  };

  for (const score of scores) {
    for (const check of score?.risk?.allowedChecks ?? []) {
      if (!Array.isArray(check?.expected) || check.expected.length !== 1) {
        summary.excludedRangeChecks += 1;
        continue;
      }

      const expected = check.expected[0];
      if (!validLevels.has(expected)) {
        summary.excludedInvalidExpectedChecks += 1;
        continue;
      }

      summary.eligibleChecks += 1;
      if (check.actual === null || check.actual === undefined || check.actual === "") {
        summary.missingActuals += 1;
        continue;
      }
      if (!validLevels.has(check.actual)) {
        summary.invalidActuals += 1;
        continue;
      }

      summary.countedChecks += 1;
      summary.matrix[expected][check.actual] += 1;
      if (expected === check.actual) summary.exactMatches += 1;
    }
  }

  summary.accuracy = ratio(summary.exactMatches, summary.countedChecks);
  return summary;
}

export function summarizeSlices(scores, sliceDefinitions) {
  if (!Array.isArray(scores)) throw new TypeError("scores must be an array.");
  const definitions = normalizeSliceDefinitions(sliceDefinitions);

  return Object.fromEntries(definitions.map(([sliceName, selector]) => {
    const groups = new Map();
    for (const score of scores) {
      const selected = selectSliceValues(score, selector);
      for (const value of selected) {
        const key = String(value);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(score);
      }
    }
    const summaries = Object.fromEntries(
      [...groups.entries()]
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([value, groupScores]) => [value, summarizeScores(groupScores)])
    );
    return [sliceName, summaries];
  }));
}

export function scoreBenchmark({ cases, results }, options = {}) {
  if (!Array.isArray(cases) || !Array.isArray(results)) {
    throw new TypeError("scoreBenchmark requires cases and results arrays.");
  }

  const getCaseId = options.getBenchmarkCaseId ?? ((item) => item?.id ?? item?.caseId);
  const casesById = new Map();
  for (const caseEnvelope of cases) {
    const caseId = getCaseId(caseEnvelope);
    if (caseId === undefined || caseId === null || caseId === "") {
      throw new Error("Every benchmark case must have an ID.");
    }
    const key = String(caseId);
    if (casesById.has(key)) throw new Error(`Duplicate benchmark case ID: ${key}`);
    casesById.set(key, caseEnvelope);
  }

  const scores = results.map((resultEnvelope) => {
    const caseId = getResultCaseId(resultEnvelope, options);
    const caseEnvelope = casesById.get(String(caseId));
    if (!caseEnvelope) throw new Error(`Result references unknown benchmark case: ${caseId ?? "missing"}`);
    return scoreBenchmarkCase(caseEnvelope, resultEnvelope, options);
  });

  return {
    scores,
    summary: summarizeScores(scores),
    slices: summarizeSlices(scores, options.slices)
  };
}

function extractSchemaStatus(resultEnvelope, options) {
  const explicit = options.getSchemaStatus?.(resultEnvelope)
    ?? options.schemaStatus
    ?? resultEnvelope.schemaStatus
    ?? resultEnvelope.schema
    ?? resultEnvelope.validation?.schemaStatus
    ?? resultEnvelope.validation?.schema;
  if (explicit !== undefined) return normalizeSchemaStatus(explicit);
  const invalidSchema = resultEnvelope.validation?.metrics?.invalidSchema;
  if (Number.isFinite(invalidSchema)) return invalidSchema === 0 ? "valid" : "invalid";
  return "unknown";
}

function collectRiskExpectations(caseEnvelope, expected) {
  const expectations = new Map();
  const merge = (raw, defaults = {}) => {
    if (!isRecord(raw)) return;
    const dishName = raw.dishName ?? raw.name;
    const key = normalizeDishName(dishName);
    if (!key) return;
    const prior = expectations.get(key) ?? {
      dishName: String(dishName),
      minimumRisk: null,
      maximumRisk: null,
      allowedRisks: null,
      directListed: false,
      directSevere: false,
      severity: null
    };
    const range = isRecord(raw.allowedRiskRange) ? raw.allowedRiskRange : null;
    const allowed = raw.allowedRisks
      ?? raw.allowedRiskLevels
      ?? raw.allowed
      ?? range?.levels
      ?? defaults.allowedRisks;
    expectations.set(key, {
      ...prior,
      dishName: prior.dishName || String(dishName),
      minimumRisk: raw.minimumRisk
        ?? raw.minRisk
        ?? range?.minimum
        ?? defaults.minimumRisk
        ?? prior.minimumRisk,
      maximumRisk: raw.maximumRisk
        ?? raw.maxRisk
        ?? range?.maximum
        ?? defaults.maximumRisk
        ?? prior.maximumRisk,
      allowedRisks: Array.isArray(allowed) ? [...new Set(allowed.map(String))] : prior.allowedRisks,
      directListed: raw.directListed
        ?? (raw.evidenceLabel === "confirmed_visible" ? true : undefined)
        ?? defaults.directListed
        ?? prior.directListed,
      directSevere: raw.directSevere ?? raw.severeDirect ?? defaults.directSevere ?? prior.directSevere,
      severity: raw.severity ?? defaults.severity ?? prior.severity,
      role: raw.role ?? prior.role ?? null
    });
  };

  for (const raw of expected.minimumRisks ?? []) merge(raw);
  for (const raw of expected.maximumRisks ?? []) merge(raw);
  if (Array.isArray(expected.allowedRisks)) {
    for (const raw of expected.allowedRisks) merge(raw);
  }
  for (const field of ["dishExpectations", "riskExpectations", "dishes"]) {
    if (Array.isArray(expected[field])) {
      for (const raw of expected[field]) merge(raw);
    }
  }
  if (Array.isArray(expected.mustFlagDishes) && Array.isArray(expected.allowedRiskLevels)) {
    for (const dishName of expected.mustFlagDishes) merge({ dishName }, { allowedRisks: expected.allowedRiskLevels });
  }
  for (const dishName of expected.directSevereDishes ?? []) {
    merge({ dishName, directListed: true, directSevere: true });
  }

  return [...expectations.values()];
}

function extractExpectedDishNames(expected) {
  const values = expected.expectedDishes ?? expected.dishNames ?? [];
  if (!Array.isArray(values)) return [];
  return values.map((value) => isRecord(value) ? value.dishName ?? value.name : value);
}

function extractReadabilityExpectation(expected) {
  const raw = expected.readability ?? expected.imageReadability;
  if (typeof raw === "string") {
    return {
      allowedValues: [raw],
      needsRetake: expected.needsRetake ?? null
    };
  }
  if (isRecord(raw)) {
    const allowed = raw.allowedValues ?? raw.values ?? raw.allowed;
    return {
      allowedValues: Array.isArray(allowed)
        ? [...new Set(allowed.filter((value) => typeof value === "string"))]
        : typeof raw.value === "string"
          ? [raw.value]
          : [],
      needsRetake: raw.needsRetake ?? expected.needsRetake ?? null
    };
  }
  return { allowedValues: [], needsRetake: expected.needsRetake ?? null };
}

function extractOverallRiskValues(expected) {
  const raw = expected.overallRisk;
  if (typeof raw === "string") return [raw];
  if (!isRecord(raw) || raw.status === "not_annotated") return [];
  const allowed = raw.allowedRiskRange?.levels ?? raw.allowedValues ?? raw.allowed;
  return Array.isArray(allowed)
    ? [...new Set(allowed.filter((value) => typeof value === "string"))]
    : typeof raw.value === "string"
      ? [raw.value]
      : [];
}

function matchExpectedDishes(expectedDishNames, dishes, options) {
  const getDishName = options.getDishName ?? ((dish) => dish?.dishName ?? dish?.name);
  const actual = dishes
    .map((dish, index) => ({ dish, index, name: normalizeDishName(getDishName(dish)) }))
    .filter((entry) => entry.name !== "");
  const matches = new Map();
  const used = new Set();

  for (const dishName of expectedDishNames) {
    const expected = normalizeDishName(dishName);
    const exact = actual.find((entry) => !used.has(entry.index) && entry.name === expected);
    if (exact) {
      matches.set(expected, exact.dish);
      used.add(exact.index);
    }
  }
  for (const dishName of expectedDishNames) {
    const expected = normalizeDishName(dishName);
    if (matches.has(expected)) continue;
    const fuzzy = actual.filter((entry) => (
      !used.has(entry.index) && (entry.name.includes(expected) || expected.includes(entry.name))
    ));
    if (fuzzy.length === 1) {
      matches.set(expected, fuzzy[0].dish);
      used.add(fuzzy[0].index);
    }
  }
  return matches;
}

function evaluateOrderedRiskCheck(kind, expectation, dish, actualRisk, ranking) {
  const expectedRisk = kind === "minimum" ? expectation.minimumRisk : expectation.maximumRisk;
  if (!dish) return riskCheckResult(kind, expectation.dishName, expectedRisk, actualRisk, false, "missing_dish");
  const comparison = compareRiskLevels(actualRisk, expectedRisk, ranking);
  if (comparison === null) return riskCheckResult(kind, expectation.dishName, expectedRisk, actualRisk, false, "unknown_risk");
  const passed = kind === "minimum" ? comparison >= 0 : comparison <= 0;
  return riskCheckResult(kind, expectation.dishName, expectedRisk, actualRisk, passed, passed ? null : `${kind}_not_met`);
}

function evaluateAllowedRiskCheck(expectation, dish, actualRisk) {
  if (!dish) {
    return {
      kind: "allowed",
      dishName: expectation.dishName,
      expected: expectation.allowedRisks,
      actual: null,
      passed: false,
      reason: "missing_dish"
    };
  }
  const passed = expectation.allowedRisks.includes(actualRisk);
  return {
    kind: "allowed",
    dishName: expectation.dishName,
    expected: expectation.allowedRisks,
    actual: actualRisk,
    passed,
    reason: passed ? null : "risk_not_allowed"
  };
}

function riskCheckResult(kind, dishName, expected, actual, passed, reason) {
  return { kind, dishName, expected, actual: actual ?? null, passed, reason };
}

function isSevereDirectExpectation(expectation, caseEnvelope) {
  if (expectation.directSevere === true) return true;
  if (expectation.directListed !== true) return false;
  if (expectation.severity !== null) return String(expectation.severity).toLowerCase() === "severe";
  return Array.isArray(caseEnvelope.profile?.allergies) && caseEnvelope.profile.allergies.some((allergy) => (
    String(allergy?.severity).toLowerCase() === "severe"
  ));
}

function getDishRisk(dish, options) {
  if (!dish) return null;
  const value = options.getDishRisk?.(dish) ?? dish.riskLevel ?? dish.risk;
  return typeof value === "string" ? value : null;
}

function scorePageCoverage({
  expected,
  output,
  dishes,
  dishMatches,
  versionedDishExpectations,
  modelChecksSkipped
}) {
  const expectedPages = extractPageExpectations(expected);
  if (expectedPages.length === 0 || modelChecksSkipped) {
    return {
      applicable: expectedPages.length > 0,
      expectedPageCount: expectedPages.length,
      actualPageCount: null,
      assessmentChecks: 0,
      assessmentPasses: 0,
      assessments: [],
      dishAttributionChecks: 0,
      dishAttributionPasses: 0,
      dishAttributions: [],
      invalidSourcePageReferences: [],
      failures: []
    };
  }

  const actualPages = Array.isArray(output?.pageAssessments) ? output.pageAssessments : [];
  const assessments = expectedPages.map((page, index) => {
    const actual = actualPages[index];
    const ordered = actual?.pageNumber === page.pageNumber;
    const actualReadability = typeof actual?.readability === "string" ? actual.readability : null;
    const readabilityMatched = page.allowedValues.length === 0
      || page.allowedValues.includes(actualReadability);
    return {
      pageNumber: page.pageNumber,
      allowedReadabilityValues: page.allowedValues,
      actualPageNumber: Number.isInteger(actual?.pageNumber) ? actual.pageNumber : null,
      actualReadability,
      passed: ordered && readabilityMatched
    };
  });
  const pageCountMatched = actualPages.length === expectedPages.length;

  const invalidSourcePageReferences = [];
  for (const dish of dishes) {
    const dishName = String(dish?.dishName ?? dish?.name ?? "");
    const pageNumbers = dish?.sourcePageNumbers;
    if (!isValidPageNumberSet(pageNumbers, expectedPages.length)) {
      invalidSourcePageReferences.push({
        dishName,
        actualSourcePageNumbers: Array.isArray(pageNumbers) ? pageNumbers : null
      });
    }
  }

  const dishAttributions = versionedDishExpectations
    .filter((item) => isRecord(item) && Array.isArray(item.sourcePageNumbers))
    .map((item) => {
      const dishName = item.dishName ?? item.name;
      const dish = dishMatches.get(normalizeDishName(dishName)) ?? null;
      const expectedSourcePageNumbers = normalizeExpectedPageNumbers(
        item.sourcePageNumbers,
        expectedPages.length
      );
      const actualSourcePageNumbers = Array.isArray(dish?.sourcePageNumbers)
        ? dish.sourcePageNumbers
        : null;
      return {
        dishName,
        expectedSourcePageNumbers,
        actualSourcePageNumbers,
        passed: dish !== null
          && expectedSourcePageNumbers !== null
          && isValidPageNumberSet(actualSourcePageNumbers, expectedPages.length)
          && sameNumberArray(expectedSourcePageNumbers, actualSourcePageNumbers)
      };
    });

  const failures = [];
  if (!pageCountMatched) failures.push("page_assessment_count_mismatch");
  if (assessments.some((item) => !item.passed)) failures.push("page_assessment_mismatch");
  if (dishAttributions.some((item) => !item.passed)) failures.push("dish_source_page_mismatch");
  if (invalidSourcePageReferences.length > 0) failures.push("invalid_source_page_reference");

  return {
    applicable: true,
    expectedPageCount: expectedPages.length,
    actualPageCount: actualPages.length,
    pageCountMatched,
    assessmentChecks: expectedPages.length,
    assessmentPasses: assessments.filter((item) => item.passed).length,
    assessments,
    dishAttributionChecks: dishAttributions.length,
    dishAttributionPasses: dishAttributions.filter((item) => item.passed).length,
    dishAttributions,
    invalidSourcePageReferences,
    failures
  };
}

function extractPageExpectations(expected) {
  if (!Array.isArray(expected?.pages)) return [];
  return expected.pages.map((raw, index) => {
    const item = isRecord(raw) ? raw : {};
    const allowed = item.allowedReadability ?? item.allowedValues ?? item.readability?.allowedValues;
    return {
      pageNumber: index + 1,
      allowedValues: Array.isArray(allowed)
        ? [...new Set(allowed.filter((value) => typeof value === "string"))]
        : typeof item.readability === "string"
          ? [item.readability]
          : []
    };
  });
}

function normalizeExpectedPageNumbers(value, pageCount) {
  if (!isValidPageNumberSet(value, pageCount)) return null;
  return [...value].sort((left, right) => left - right);
}

function isValidPageNumberSet(value, pageCount) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((pageNumber) => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= pageCount)
    && new Set(value).size === value.length;
}

function sameNumberArray(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const normalizedRight = [...right].sort((a, b) => a - b);
  return left.every((value, index) => value === normalizedRight[index]);
}

function resolveForbiddenSafetyClaims(caseEnvelope, resultEnvelope, output, options) {
  const explicit = resultEnvelope.forbiddenSafetyClaims
    ?? resultEnvelope.forbiddenSafetyClaimResult
    ?? resultEnvelope.validation?.forbiddenSafetyClaims
    ?? resultEnvelope.validation?.metrics?.forbiddenSafetyClaims;
  const raw = explicit !== undefined
    ? explicit
    : options.detectForbiddenSafetyClaims?.({ caseEnvelope, resultEnvelope, output });
  return normalizeForbiddenClaimResult(raw, explicit !== undefined ? "result" : raw === undefined ? "none" : "hook");
}

function normalizeForbiddenClaimResult(value, source) {
  if (value === undefined || value === null || value === false) return { count: 0, matches: [], source };
  if (value === true) return { count: 1, matches: [], source };
  if (Number.isFinite(value)) return { count: Math.max(0, Math.trunc(value)), matches: [], source };
  if (typeof value === "string") return { count: value === "" ? 0 : 1, matches: value === "" ? [] : [value], source };
  if (Array.isArray(value)) return { count: value.length, matches: value.map(String), source };
  if (isRecord(value)) {
    const matches = Array.isArray(value.matches) ? value.matches.map(String) : [];
    const count = Number.isFinite(value.count)
      ? Math.max(0, Math.trunc(value.count))
      : matches.length > 0
        ? matches.length
        : value.found === true || value.passed === false
          ? 1
          : 0;
    return { count, matches, source };
  }
  return { count: 0, matches: [], source };
}

function scoreStaffQuestions(dishes, options) {
  const getQuestions = options.getStaffQuestions ?? ((dish) => dish?.questionsToAsk);
  const missingDishes = [];
  let covered = 0;
  for (const dish of dishes) {
    const questions = getQuestions(dish);
    const hasQuestion = Array.isArray(questions) && questions.some((question) => (
      typeof question === "string" ? question.trim() !== "" : question !== null && question !== undefined
    ));
    if (hasQuestion) covered += 1;
    else missingDishes.push(String(dish?.dishName ?? dish?.name ?? "unnamed dish"));
  }
  return {
    total: dishes.length,
    covered,
    missingDishes,
    coverage: ratio(covered, dishes.length)
  };
}

function scoreAutomatedQuestionIntentCoverage(
  rawRequirements,
  dishes,
  caseEnvelope,
  resultEnvelope,
  output,
  options
) {
  // This remains a lexical proxy. Human semantic intent review is a separate,
  // fingerprint-bound release gate.
  const requirements = Array.isArray(rawRequirements) ? rawRequirements : [];
  const targets = buildQuestionIntentTargets(
    requirements,
    dishes,
    caseEnvelope,
    resultEnvelope,
    output,
    options
  );
  const checks = targets.map((target) => evaluateQuestionTarget(target));
  const covered = checks.filter((check) => check.passed).length;
  const failedRequirementIds = [...new Set(
    checks.filter((check) => !check.passed).map((check) => check.requirementId)
  )];

  return {
    automatedProxy: true,
    humanQuestionIntentAssessed: false,
    humanTranslationFidelityAssessed: false,
    requirements: requirements.length,
    total: checks.length,
    covered,
    failedRequirementIds,
    failedCheckIds: checks.filter((check) => !check.passed).map((check) => check.id),
    coverage: ratio(covered, checks.length),
    checks
  };
}

export function buildQuestionIntentTargets(
  rawRequirements,
  dishes,
  caseEnvelope = {},
  resultEnvelope = {},
  output = {},
  options = {}
) {
  const requirements = Array.isArray(rawRequirements) ? rawRequirements : [];
  const channels = questionLanguageChannels(caseEnvelope, resultEnvelope, output, options);
  return requirements.flatMap((rawRequirement, requirementIndex) => {
    const requirement = isRecord(rawRequirement) ? rawRequirement : {};
    const requirementId = String(requirement.id ?? `requirement-${requirementIndex + 1}`);
    const scope = typeof requirement.scope === "string" ? requirement.scope : null;
    const intent = typeof requirement.intent === "string" ? requirement.intent : null;
    const allergens = Array.isArray(requirement.allergens)
      ? requirement.allergens.filter((value) => typeof value === "string" && value.trim() !== "")
      : [];
    const requiredLanguages = uniqueQuestionLanguages(requirement.requiredLanguages);
    const channelTargets = requiredQuestionChannels(requiredLanguages, channels);
    const dishTargets = questionRequirementTargets(requirement, dishes, options);
    const effectiveDishTargets = dishTargets.length > 0
      ? dishTargets
      : [{ dishName: null, dishes: [], missingDish: true }];

    return channelTargets.flatMap((channel, channelIndex) => (
      effectiveDishTargets.map((target, targetIndex) => {
        const questions = target.dishes.flatMap((dish) => questionEntries(dish, channel, options));
        return {
          id: `${requirementId}:${channel.id}:${channel.requiredLanguageCode ?? "unspecified"}:${targetIndex + 1}`,
          requirementId,
          requirementIndex,
          scope,
          intent,
          allergens,
          requiredLanguages,
          requiredLanguage: channel.requiredLanguage,
          requiredLanguageCode: channel.requiredLanguageCode,
          questionChannel: channel.id,
          questionField: channel.field,
          actualLanguage: channel.language,
          missingChannel: channel.missing === true,
          channelIndex,
          targetIndex,
          dishName: target.dishName,
          missingDish: target.missingDish,
          questions
        };
      })
    ));
  });
}

function questionRequirementTargets(requirement, dishes, options) {
  if (requirement.scope === "scan") {
    return [{ dishName: null, dishes, missingDish: dishes.length === 0 }];
  }
  if (requirement.scope === "each_returned_dish") {
    return dishes.map((dish) => ({
      dishName: questionDishName(dish, options),
      dishes: [dish],
      missingDish: false
    }));
  }
  if (requirement.scope === "named_dishes") {
    const names = Array.isArray(requirement.dishNames) ? requirement.dishNames : [];
    return names.map((dishName) => {
      const dish = findDishByName(dishes, dishName, options);
      return {
        dishName: String(dishName),
        dishes: dish === null ? [] : [dish],
        missingDish: dish === null
      };
    });
  }
  return [];
}

function evaluateQuestionTarget(target) {
  const markers = AUTOMATED_QUESTION_INTENT_MARKERS[target.intent] ?? [];
  const intentMatches = target.questions.filter(({ normalized }) => (
    markers.some((marker) => containsSemanticMarker(normalized, marker))
  ));
  const missingAllergens = target.allergens.filter((allergen) => {
    const allergenMarkers = questionAllergenMarkers(allergen);
    return !target.questions.some(({ normalized }) => (
      allergenMarkers.some((marker) => containsSemanticMarker(normalized, marker))
    ));
  });
  const passed = !target.missingDish
    && !target.missingChannel
    && target.questions.length > 0
    && intentMatches.length > 0
    && missingAllergens.length === 0;

  return {
    id: target.id,
    requirementId: target.requirementId,
    scope: target.scope,
    intent: target.intent,
    allergens: target.allergens,
    requiredLanguage: target.requiredLanguage,
    requiredLanguageCode: target.requiredLanguageCode,
    questionChannel: target.questionChannel,
    questionField: target.questionField,
    actualLanguage: target.actualLanguage,
    dishName: target.dishName,
    questionCount: target.questions.length,
    intentMatched: intentMatches.length > 0,
    missingAllergens,
    missingChannel: target.missingChannel,
    missingDish: target.missingDish,
    passed
  };
}

function questionEntries(dish, channel, options) {
  if (channel.missing === true) return [];
  const questions = channel.id === "user"
    ? options.getUserLanguageStaffQuestions?.(dish) ?? dish?.questionsToAskUserLanguage
    : options.getStaffQuestions?.(dish) ?? dish?.questionsToAsk;
  return Array.isArray(questions)
    ? questions
      .filter((question) => typeof question === "string" && question.trim() !== "")
      .map((question) => ({
        text: question.trim(),
        field: channel.field,
        channel: channel.id,
        language: channel.language,
        normalized: normalizeSemanticText(question)
      }))
      .filter(({ normalized }) => normalized !== "")
    : [];
}

function questionLanguageChannels(caseEnvelope, resultEnvelope, output, options) {
  const restaurantLanguage = firstQuestionLanguage(
    options.getRestaurantLanguage?.(caseEnvelope, resultEnvelope, output),
    output?.restaurantMessage?.language,
    resultEnvelope?.restaurantLanguage,
    caseEnvelope?.profile?.restaurantLanguage,
    caseEnvelope?.restaurantLanguage,
    caseEnvelope?.language
  );
  const userLanguage = firstQuestionLanguage(
    options.getUserLanguage?.(caseEnvelope, resultEnvelope, output),
    output?.restaurantMessage?.userLanguage,
    resultEnvelope?.userLanguage,
    caseEnvelope?.profile?.preferredLanguage,
    caseEnvelope?.preferredLanguage
  );
  return [
    {
      id: "restaurant",
      field: "questionsToAsk",
      language: restaurantLanguage.display,
      languageCode: restaurantLanguage.code,
      missing: false
    },
    {
      id: "user",
      field: "questionsToAskUserLanguage",
      language: userLanguage.display,
      languageCode: userLanguage.code,
      missing: false
    }
  ];
}

function requiredQuestionChannels(requiredLanguages, channels) {
  if (requiredLanguages.length === 0) {
    const restaurant = channels.find((channel) => channel.id === "restaurant");
    return [{
      ...restaurant,
      requiredLanguage: restaurant?.language ?? null,
      requiredLanguageCode: restaurant?.languageCode ?? null
    }];
  }

  return requiredLanguages.flatMap(({ display, code }) => {
    const matches = channels.filter((channel) => questionLanguagesMatch(code, channel.languageCode));
    if (matches.length > 0) {
      return matches.map((channel) => ({
        ...channel,
        requiredLanguage: display,
        requiredLanguageCode: code
      }));
    }
    return [{
      id: "missing",
      field: null,
      language: null,
      languageCode: null,
      requiredLanguage: display,
      requiredLanguageCode: code,
      missing: true
    }];
  });
}

function uniqueQuestionLanguages(values) {
  const languages = Array.isArray(values) ? values : [];
  const unique = new Map();
  for (const value of languages) {
    if (typeof value !== "string" || value.trim() === "") continue;
    const display = value.trim();
    const code = normalizeQuestionLanguage(display);
    const key = code ?? `unknown:${display.toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, { display, code });
  }
  return [...unique.values()];
}

function firstQuestionLanguage(...values) {
  for (const value of values) {
    if (typeof value !== "string" || value.trim() === "") continue;
    return { display: value.trim(), code: normalizeQuestionLanguage(value) };
  }
  return { display: null, code: null };
}

export function normalizeQuestionLanguage(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");
  const alias = QUESTION_LANGUAGE_ALIASES.get(normalized);
  if (alias) return alias;
  if (/^zh-(?:hans|cn|sg)(?:-|$)/.test(normalized)) return "zh-hans";
  if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(normalized)) return "zh-hant";
  const base = normalized.split("-")[0];
  return /^[a-z]{2,3}$/.test(base) ? base : normalized;
}

function questionLanguagesMatch(required, actual) {
  if (required === null || actual === null) return false;
  if (required === actual) return true;
  return required === "zh" && (actual === "zh-hans" || actual === "zh-hant");
}

function questionAllergenMarkers(allergen) {
  const normalized = normalizeSemanticText(allergen);
  return [...new Set([normalized, ...(ALLERGEN_NAME_MARKERS[normalized] ?? [])])];
}

function containsSemanticMarker(normalizedText, rawMarker) {
  const markerValue = String(rawMarker);
  const prefix = markerValue.endsWith("*");
  const marker = normalizeSemanticText(prefix ? markerValue.slice(0, -1) : markerValue);
  if (!marker) return false;

  const spaceDelimited = /^[\p{Script=Latin}\p{N} ]+$/u.test(marker);
  if (!spaceDelimited) return normalizedText.includes(marker);
  if (prefix && !marker.includes(" ")) {
    return normalizedText.split(" ").some((token) => token.startsWith(marker));
  }
  return ` ${normalizedText} `.includes(` ${marker} `);
}

function normalizeSemanticText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function questionDishName(dish, options) {
  const value = options.getDishName?.(dish) ?? dish?.dishName ?? dish?.name;
  return value === undefined || value === null || value === "" ? null : String(value);
}

function scoreReferences(output, resultEnvelope, options) {
  const raw = options.getSourceReferences?.(output, resultEnvelope)
    ?? output?.transparency?.sourceReferences
    ?? output?.sourceReferences
    ?? [];
  const references = Array.isArray(raw) ? raw : [];
  const invalid = [];
  let https = 0;
  for (const reference of references) {
    const value = typeof reference === "string"
      ? reference
      : reference?.uri ?? reference?.url ?? reference?.href;
    if (isHttpsUrl(value)) https += 1;
    else invalid.push(value ?? null);
  }
  return {
    total: references.length,
    https,
    invalid,
    allHttps: invalid.length === 0,
    coverage: ratio(https, references.length)
  };
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value)).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeSliceDefinitions(definitions) {
  if (definitions === undefined || definitions === null) return [];
  if (Array.isArray(definitions)) {
    return definitions.map((path) => [String(path), String(path)]);
  }
  if (!isRecord(definitions)) throw new TypeError("sliceDefinitions must be an array or object.");
  return Object.entries(definitions);
}

function selectSliceValues(score, selector) {
  const selected = typeof selector === "function"
    ? selector(score)
    : readSlicePath(score, String(selector));
  const values = Array.isArray(selected) ? selected : [selected];
  return [...new Set(values.map((value) => value ?? "unknown"))];
}

function readSlicePath(score, path) {
  const read = (value) => path.split(".").reduce((current, part) => current?.[part], value);
  if (path.includes(".")) return read(score);
  return score.case?.[path] ?? score.result?.[path] ?? score[path];
}

function uniqueNames(values) {
  if (!Array.isArray(values)) return [];
  const names = new Map();
  for (const value of values) {
    const name = isRecord(value) ? value.dishName ?? value.name : value;
    const normalized = normalizeDishName(name);
    if (normalized && !names.has(normalized)) names.set(normalized, String(name));
  }
  return [...names.values()];
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
