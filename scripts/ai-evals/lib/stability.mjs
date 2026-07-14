import {
  getResultAvailabilityStatus,
  getResultCaseId,
  getResultDishes,
  getResultReadability,
  normalizeDishName,
  riskRank
} from "./scoring.mjs";
import { ratio, wilsonInterval } from "./statistics.mjs";

/**
 * Compares all unordered pairs. Missing dishes affect Jaccard dish-set
 * stability; risk flips only use dishes present with labels in both runs.
 */
export function summarizeCaseStability(results, options = {}) {
  if (!Array.isArray(results)) throw new TypeError("results must be an array.");
  const includeResult = options.includeResult ?? ((result) => (
    options.includeFallback === true || getResultAvailabilityStatus(result, options) === "available"
  ));
  const evaluated = results.filter((result, index) => includeResult(result, index));
  const caseIds = new Set(results.map((result) => getResultCaseId(result, options)).filter(Boolean));
  if (caseIds.size > 1) throw new Error("summarizeCaseStability requires results from one case.");
  const caseId = caseIds.size === 1 ? [...caseIds][0] : null;
  const caseMetadata = resolveCaseMetadata(caseId, options);
  const criticalMinimumRiskTargets = collectCriticalMinimumRiskTargets(
    caseMetadata,
    options.riskRanking
  );

  let pairCount = 0;
  let riskLabelComparisons = 0;
  let riskLabelFlips = 0;
  let dishSetSimilarityTotal = 0;
  let readabilityComparisons = 0;
  let readabilityAgreements = 0;
  let criticalRiskDowngradeComparisons = 0;
  let criticalRiskNonOrdinalComparisons = 0;
  let criticalRiskDowngrades = 0;
  const criticalRiskDowngradeDetails = [];

  // Every unordered run pair contributes once, so input order cannot change the rates.
  for (let leftIndex = 0; leftIndex < evaluated.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < evaluated.length; rightIndex += 1) {
      const left = evaluated[leftIndex];
      const right = evaluated[rightIndex];
      const leftDishes = dishRiskMap(left, options);
      const rightDishes = dishRiskMap(right, options);
      const leftNames = new Set(leftDishes.keys());
      const rightNames = new Set(rightDishes.keys());
      const union = new Set([...leftNames, ...rightNames]);
      const shared = [...leftNames].filter((name) => rightNames.has(name));

      pairCount += 1;
      dishSetSimilarityTotal += union.size === 0 ? 1 : shared.length / union.size;
      for (const name of shared) {
        const leftRisk = leftDishes.get(name);
        const rightRisk = rightDishes.get(name);
        if (leftRisk === null || rightRisk === null) continue;
        riskLabelComparisons += 1;
        if (leftRisk !== rightRisk) riskLabelFlips += 1;
      }

      for (const target of criticalMinimumRiskTargets) {
        if (!leftDishes.has(target.normalizedDishName) || !rightDishes.has(target.normalizedDishName)) continue;
        const leftRisk = leftDishes.get(target.normalizedDishName);
        const rightRisk = rightDishes.get(target.normalizedDishName);
        const leftRank = riskRank(leftRisk, options.riskRanking);
        const rightRank = riskRank(rightRisk, options.riskRanking);
        if (leftRank === null || rightRank === null) {
          criticalRiskNonOrdinalComparisons += 1;
          continue;
        }

        criticalRiskDowngradeComparisons += 1;
        if (leftRank === rightRank) continue;

        criticalRiskDowngrades += 1;
        const higher = leftRank > rightRank
          ? { result: left, risk: leftRisk }
          : { result: right, risk: rightRisk };
        const lower = leftRank > rightRank
          ? { result: right, risk: rightRisk }
          : { result: left, risk: leftRisk };
        criticalRiskDowngradeDetails.push({
          caseId,
          dishName: target.dishName,
          expectedMinimumRisk: target.minimumRisk,
          higherRisk: higher.risk,
          higherRiskRunId: resultRunId(higher.result),
          lowerRisk: lower.risk,
          lowerRiskRunId: resultRunId(lower.result)
        });
      }

      const leftReadability = getResultReadability(left, options);
      const rightReadability = getResultReadability(right, options);
      if (leftReadability !== null && rightReadability !== null) {
        readabilityComparisons += 1;
        if (leftReadability === rightReadability) readabilityAgreements += 1;
      }
    }
  }

  criticalRiskDowngradeDetails.sort(compareCriticalRiskDowngradeDetails);

  return {
    caseId,
    runCount: results.length,
    evaluatedRunCount: evaluated.length,
    excludedRunCount: results.length - evaluated.length,
    pairCount,
    riskLabelComparisons,
    riskLabelFlips,
    riskLabelFlipRate: ratio(riskLabelFlips, riskLabelComparisons),
    riskLabelFlipRateWilson95: wilsonInterval(riskLabelFlips, riskLabelComparisons),
    dishSetPairComparisons: pairCount,
    dishSetSimilarityTotal,
    dishSetStability: ratio(dishSetSimilarityTotal, pairCount),
    readabilityComparisons,
    readabilityAgreements,
    readabilityAgreement: ratio(readabilityAgreements, readabilityComparisons),
    readabilityAgreementWilson95: wilsonInterval(readabilityAgreements, readabilityComparisons),
    criticalRiskDowngradeComparisons,
    criticalRiskNonOrdinalComparisons,
    criticalRiskDowngrades,
    criticalRiskDowngradeRate: ratio(criticalRiskDowngrades, criticalRiskDowngradeComparisons),
    criticalRiskDowngradeRateWilson95: wilsonInterval(
      criticalRiskDowngrades,
      criticalRiskDowngradeComparisons
    ),
    criticalRiskDowngradeDetails
  };
}

export function summarizeStability(results, options = {}) {
  if (!Array.isArray(results)) throw new TypeError("results must be an array.");
  const groups = new Map();
  for (const result of results) {
    const caseId = getResultCaseId(result, options);
    if (caseId === null) throw new Error("Every stability result must have a caseId.");
    if (!groups.has(caseId)) groups.set(caseId, []);
    groups.get(caseId).push(result);
  }

  const perCase = [...groups.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([, caseResults]) => summarizeCaseStability(caseResults, options));
  const aggregate = perCase.reduce((total, item) => {
    total.runCount += item.runCount;
    total.evaluatedRunCount += item.evaluatedRunCount;
    total.excludedRunCount += item.excludedRunCount;
    total.pairCount += item.pairCount;
    total.riskLabelComparisons += item.riskLabelComparisons;
    total.riskLabelFlips += item.riskLabelFlips;
    total.dishSetSimilarityTotal += item.dishSetSimilarityTotal;
    total.readabilityComparisons += item.readabilityComparisons;
    total.readabilityAgreements += item.readabilityAgreements;
    total.criticalRiskDowngradeComparisons += item.criticalRiskDowngradeComparisons;
    total.criticalRiskNonOrdinalComparisons += item.criticalRiskNonOrdinalComparisons;
    total.criticalRiskDowngrades += item.criticalRiskDowngrades;
    total.criticalRiskDowngradeDetails.push(...item.criticalRiskDowngradeDetails);
    return total;
  }, {
    runCount: 0,
    evaluatedRunCount: 0,
    excludedRunCount: 0,
    pairCount: 0,
    riskLabelComparisons: 0,
    riskLabelFlips: 0,
    dishSetSimilarityTotal: 0,
    readabilityComparisons: 0,
    readabilityAgreements: 0,
    criticalRiskDowngradeComparisons: 0,
    criticalRiskNonOrdinalComparisons: 0,
    criticalRiskDowngrades: 0,
    criticalRiskDowngradeDetails: []
  });

  return {
    caseCount: perCase.length,
    ...aggregate,
    riskLabelFlipRate: ratio(aggregate.riskLabelFlips, aggregate.riskLabelComparisons),
    riskLabelFlipRateWilson95: wilsonInterval(aggregate.riskLabelFlips, aggregate.riskLabelComparisons),
    dishSetStability: ratio(aggregate.dishSetSimilarityTotal, aggregate.pairCount),
    readabilityAgreement: ratio(aggregate.readabilityAgreements, aggregate.readabilityComparisons),
    readabilityAgreementWilson95: wilsonInterval(
      aggregate.readabilityAgreements,
      aggregate.readabilityComparisons
    ),
    criticalRiskDowngradeRate: ratio(
      aggregate.criticalRiskDowngrades,
      aggregate.criticalRiskDowngradeComparisons
    ),
    criticalRiskDowngradeRateWilson95: wilsonInterval(
      aggregate.criticalRiskDowngrades,
      aggregate.criticalRiskDowngradeComparisons
    ),
    perCase
  };
}

function dishRiskMap(result, options) {
  const getDishName = options.getDishName ?? ((dish) => dish?.dishName ?? dish?.name);
  const getDishRisk = options.getDishRisk ?? ((dish) => dish?.riskLevel ?? dish?.risk);
  const map = new Map();
  for (const dish of getResultDishes(result, options)) {
    const name = normalizeDishName(getDishName(dish));
    if (!name || map.has(name)) continue;
    const risk = getDishRisk(dish);
    map.set(name, typeof risk === "string" && risk !== "" ? risk : null);
  }
  return map;
}

function resolveCaseMetadata(caseId, options) {
  const fromHook = options.getCaseMetadata?.(caseId);
  if (isRecord(fromHook)) return fromHook;

  const direct = options.caseMetadata ?? options.caseEnvelope ?? options.case;
  if (direct instanceof Map) return direct.get(caseId) ?? null;
  if (isRecord(direct)) {
    if (isRecord(direct[caseId])) return direct[caseId];
    if (direct.id !== undefined || direct.caseId !== undefined || direct.critical !== undefined) return direct;
  }

  const cases = options.cases;
  if (cases instanceof Map) return cases.get(caseId) ?? null;
  if (Array.isArray(cases)) {
    return cases.find((item) => String(item?.id ?? item?.caseId ?? "") === caseId) ?? null;
  }
  if (isRecord(cases) && isRecord(cases[caseId])) return cases[caseId];
  return null;
}

function collectCriticalMinimumRiskTargets(caseMetadata, ranking) {
  if (!isRecord(caseMetadata) || caseMetadata.critical !== true) return [];
  const expected = isRecord(caseMetadata.expectations)
    ? caseMetadata.expectations
    : isRecord(caseMetadata.expected)
      ? caseMetadata.expected
      : {};
  const targets = new Map();
  const add = (raw) => {
    if (!isRecord(raw) || raw.role === "benign_control") return;
    const dishName = raw.dishName ?? raw.name;
    const minimumRisk = raw.minimumRisk ?? raw.minRisk ?? raw.allowedRiskRange?.minimum;
    const normalizedDishName = normalizeDishName(dishName);
    const minimumRank = riskRank(minimumRisk, ranking);
    if (!normalizedDishName || minimumRank === null) return;

    const prior = targets.get(normalizedDishName);
    if (prior && riskRank(prior.minimumRisk, ranking) >= minimumRank) return;
    targets.set(normalizedDishName, {
      dishName: String(dishName),
      normalizedDishName,
      minimumRisk
    });
  };

  for (const field of ["minimumRisks", "minimumRiskTargets", "dishes", "dishExpectations", "riskExpectations"]) {
    if (Array.isArray(expected[field])) {
      for (const raw of expected[field]) add(raw);
    }
  }
  if (Array.isArray(caseMetadata.expectedMinimumRiskTargets)) {
    for (const raw of caseMetadata.expectedMinimumRiskTargets) add(raw);
  }

  return [...targets.values()].sort((left, right) => (
    compareStrings(left.normalizedDishName, right.normalizedDishName)
  ));
}

function resultRunId(result) {
  const value = result?.runId ?? result?.pass;
  return value === undefined || value === null || value === "" ? null : value;
}

function compareCriticalRiskDowngradeDetails(left, right) {
  return compareStrings(String(left.caseId ?? ""), String(right.caseId ?? ""))
    || compareStrings(normalizeDishName(left.dishName), normalizeDishName(right.dishName))
    || compareStrings(String(left.lowerRiskRunId ?? ""), String(right.lowerRiskRunId ?? ""))
    || compareStrings(String(left.higherRiskRunId ?? ""), String(right.higherRiskRunId ?? ""));
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
