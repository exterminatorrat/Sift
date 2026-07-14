import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = "scripts/ai-evals/build-holdout-manifest.mjs";
const GENERATOR_PATH = "scripts/generate-ai-holdout-fixtures.py";
const SOURCE_PATH = "docs/ai-evals/images/holdout/source-cases.json";
const DEVELOPMENT_PATH = "docs/ai-evals/benchmark-v1/development-v1.json";
const SCHEMA_PATH = "docs/ai-evals/benchmark-v1/benchmark-manifest.schema.json";
const HOLDOUT_SCHEMA_PATH = "docs/ai-evals/images/holdout/benchmark-holdout.schema.json";
const OUTPUT_PATH = "docs/ai-evals/benchmark-v1/holdout-v1.json";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_FILE = path.join(REPO_ROOT, ...SOURCE_PATH.split("/"));
const DEVELOPMENT_FILE = path.join(REPO_ROOT, ...DEVELOPMENT_PATH.split("/"));
const SCHEMA_FILE = path.join(REPO_ROOT, ...SCHEMA_PATH.split("/"));
const HOLDOUT_SCHEMA_FILE = path.join(REPO_ROOT, ...HOLDOUT_SCHEMA_PATH.split("/"));
const OUTPUT_FILE = path.join(REPO_ROOT, ...OUTPUT_PATH.split("/"));

const EVIDENCE_LABELS = [
  "confirmed_visible",
  "confirmed_external",
  "plausible_pattern",
  "unknown_unobservable"
];
const ORDINAL_RISK_LEVELS = ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed"];
const ALL_RISK_LEVELS = [...ORDINAL_RISK_LEVELS, "unclear"];
const READABILITY_VALUES = ["clear", "partially_clear", "poor"];
const QUESTION_INTENTS = [
  "request_readable_menu",
  "confirm_ingredients",
  "confirm_preparation",
  "confirm_cross_contact"
];
const QUESTION_SCOPES = ["scan", "each_returned_dish", "named_dishes"];
const QUALITY_VARIANTS = ["clear_counter", "angled_photo", "glare_fold", "blurred_crop"];
const EXPECTED_LANGUAGES = [
  "Dutch",
  "Indonesian",
  "Polish",
  "Traditional Chinese",
  "Turkish",
  "Vietnamese"
];
const EXPECTED_CASE_COUNT = 48;
const EXPECTED_GROUP_COUNT = 24;
const CASES_PER_GROUP = 2;
const CASES_PER_LANGUAGE = 8;
const GROUPS_PER_LANGUAGE = 4;
const CASES_PER_QUALITY_VARIANT = 12;
const POOR_RETAKE_CASE_COUNT = 12;
const EXPECTED_TRANSLATION_CASE_COUNT = 12;
const TRANSLATION_CASES_PER_LANGUAGE = 2;
const EXPECTED_CRITICAL_CASE_COUNT = 24;
const EXPECTED_ALLERGEN_COUNTS = {
  Dairy: 18,
  Egg: 12,
  Fish: 12,
  Mustard: 4,
  Peanut: 10,
  Sesame: 6,
  Shellfish: 10,
  Soy: 8,
  Sulfites: 2,
  "Tree nuts": 12,
  "Wheat/gluten": 12
};
const LEAKAGE_RULE =
  "Both visual and profile cases derived from one underlying holdout menu remain together in the test split. Exact cross-split checks reject development overlap in group ID, normalized group name, case ID, image path, or image SHA-256.";

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeGroupName(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function stableStringify(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  invariant(isRecord(value), "Cannot hash a non-JSON value.");
  return `{${Object.keys(value)
    .sort(compareStrings)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertString(value, context) {
  invariant(typeof value === "string" && value.length > 0, `${context} must be a non-empty string.`);
}

function isHttpsUrl(value) {
  return typeof value === "string" && /^https:\/\//u.test(value);
}

function assertStringArray(value, context, { allowEmpty = true } = {}) {
  invariant(Array.isArray(value), `${context} must be an array.`);
  if (!allowEmpty) {
    invariant(value.length > 0, `${context} must not be empty.`);
  }
  for (const item of value) {
    assertString(item, `${context} item`);
  }
  invariant(new Set(value).size === value.length, `${context} must not contain duplicates.`);
}

function assertSha256(value, context) {
  invariant(typeof value === "string" && /^[0-9a-f]{64}$/.test(value), `${context} must be a SHA-256 digest.`);
}

function assertExactCounts(actual, expected, context) {
  const actualObject = Object.fromEntries([...actual.entries()].sort(([left], [right]) => compareStrings(left, right)));
  const expectedObject = Object.fromEntries(Object.entries(expected).sort(([left], [right]) => compareStrings(left, right)));
  invariant(
    stableStringify(actualObject) === stableStringify(expectedObject),
    `${context} distribution drifted. Expected ${JSON.stringify(expectedObject)}, received ${JSON.stringify(actualObject)}.`
  );
}

function validateRiskRange(range, context) {
  invariant(isRecord(range), `${context} must be an object.`);
  assertStringArray(range.levels, `${context}.levels`, { allowEmpty: false });
  if (range.kind === "non_ordinal") {
    invariant(range.minimum === null && range.maximum === null, `${context} non-ordinal bounds must be null.`);
    invariant(stableStringify(range.levels) === stableStringify(["unclear"]), `${context} must contain only unclear.`);
    return;
  }
  invariant(range.kind === "ordinal", `${context}.kind must be ordinal or non_ordinal.`);
  const minimumIndex = ORDINAL_RISK_LEVELS.indexOf(range.minimum);
  const maximumIndex = ORDINAL_RISK_LEVELS.indexOf(range.maximum);
  invariant(minimumIndex >= 0 && maximumIndex >= minimumIndex, `${context} has invalid ordinal bounds.`);
  invariant(
    stableStringify(range.levels) === stableStringify(ORDINAL_RISK_LEVELS.slice(minimumIndex, maximumIndex + 1)),
    `${context}.levels must be the contiguous inclusive ordinal range.`
  );
}

function validateProfile(profile, context) {
  invariant(isRecord(profile), `${context} must be an object.`);
  assertString(profile.id, `${context}.id`);
  assertString(profile.name, `${context}.name`);
  assertString(profile.preferredLanguage, `${context}.preferredLanguage`);
  assertString(profile.restaurantLanguage, `${context}.restaurantLanguage`);
  invariant(Array.isArray(profile.allergies) && profile.allergies.length > 0, `${context}.allergies must not be empty.`);
  const allergyIds = [];
  for (const allergy of profile.allergies) {
    invariant(isRecord(allergy), `${context} allergy must be an object.`);
    assertString(allergy.id, `${context} allergy.id`);
    assertString(allergy.name, `${context} allergy.name`);
    invariant(["mild", "moderate", "severe"].includes(allergy.severity), `${context} allergy severity is invalid.`);
    invariant(typeof allergy.avoidCrossContact === "boolean", `${context} allergy avoidCrossContact must be boolean.`);
    allergyIds.push(allergy.id);
  }
  invariant(new Set(allergyIds).size === allergyIds.length, `${context} allergy IDs must be unique.`);
}

function validateExpectations(expectations, context) {
  invariant(isRecord(expectations), `${context} must be an object.`);
  invariant(isRecord(expectations.readability), `${context}.readability must be an object.`);
  assertStringArray(expectations.readability.allowedValues, `${context}.readability.allowedValues`, { allowEmpty: false });
  invariant(
    expectations.readability.allowedValues.every((value) => READABILITY_VALUES.includes(value)),
    `${context}.readability contains an invalid value.`
  );
  invariant(typeof expectations.readability.needsRetake === "boolean", `${context}.needsRetake must be boolean.`);

  const overallRisk = expectations.overallRisk;
  invariant(isRecord(overallRisk), `${context}.overallRisk must be an object.`);
  invariant(["annotated", "not_annotated"].includes(overallRisk.status), `${context}.overallRisk status is invalid.`);
  invariant(EVIDENCE_LABELS.includes(overallRisk.evidenceLabel), `${context}.overallRisk evidence label is invalid.`);
  assertStringArray(overallRisk.evidenceSourceUrls, `${context}.overallRisk evidenceSourceUrls`);
  invariant(
    overallRisk.evidenceSourceUrls.every((url) => /^https:\/\//.test(url)),
    `${context}.overallRisk evidence URLs must use HTTPS.`
  );
  invariant(
    overallRisk.evidenceLabel !== "confirmed_external" || overallRisk.evidenceSourceUrls.length > 0,
    `${context}.overallRisk confirmed_external needs a source.`
  );
  assertString(overallRisk.note, `${context}.overallRisk note`);
  if (overallRisk.status === "annotated") {
    validateRiskRange(overallRisk.allowedRiskRange, `${context}.overallRisk.allowedRiskRange`);
  } else {
    invariant(overallRisk.allowedRiskRange === null, `${context}.overallRisk unannotated range must be null.`);
  }

  invariant(Array.isArray(expectations.dishes), `${context}.dishes must be an array.`);
  const dishNames = [];
  for (const dish of expectations.dishes) {
    invariant(isRecord(dish), `${context} dish must be an object.`);
    assertString(dish.dishName, `${context} dishName`);
    dishNames.push(dish.dishName);
    invariant(["risk_target", "benign_control"].includes(dish.role), `${context} dish role is invalid.`);
    invariant(EVIDENCE_LABELS.includes(dish.evidenceLabel), `${context} dish evidence label is invalid.`);
    assertString(dish.evidenceNote, `${context} dish evidenceNote`);
    assertStringArray(dish.evidenceSourceUrls, `${context} dish evidenceSourceUrls`);
    invariant(
      dish.evidenceSourceUrls.every((url) => /^https:\/\//.test(url)),
      `${context} dish evidence URLs must use HTTPS.`
    );
    invariant(
      dish.evidenceLabel !== "confirmed_external" || dish.evidenceSourceUrls.length > 0,
      `${context} confirmed_external dish needs a source.`
    );
    validateRiskRange(dish.allowedRiskRange, `${context} ${dish.dishName} allowedRiskRange`);
  }
  invariant(new Set(dishNames).size === dishNames.length, `${context} repeats a dish expectation.`);
  invariant(
    stableStringify(dishNames) === stableStringify([...dishNames].sort(compareStrings)),
    `${context} dish expectations must be sorted.`
  );

  invariant(Array.isArray(expectations.requiredQuestions) && expectations.requiredQuestions.length > 0, `${context}.requiredQuestions must not be empty.`);
  const questionIds = [];
  for (const question of expectations.requiredQuestions) {
    invariant(isRecord(question), `${context} question must be an object.`);
    assertString(question.id, `${context} question.id`);
    questionIds.push(question.id);
    invariant(QUESTION_SCOPES.includes(question.scope), `${context} question scope is invalid.`);
    invariant(QUESTION_INTENTS.includes(question.intent), `${context} question intent is invalid.`);
    assertStringArray(question.dishNames, `${context} question.dishNames`);
    assertStringArray(question.allergens, `${context} question.allergens`);
    assertStringArray(question.requiredLanguages, `${context} question.requiredLanguages`, { allowEmpty: false });
    invariant(
      (question.scope === "named_dishes") === (question.dishNames.length > 0),
      `${context} named-dish question scope and dishNames disagree.`
    );
  }
  invariant(new Set(questionIds).size === questionIds.length, `${context} repeats a question requirement.`);

  const readability = expectations.readability.allowedValues;
  if (expectations.readability.needsRetake) {
    invariant(stableStringify(readability) === stableStringify(["poor"]), `${context} retake case must be poor.`);
    invariant(expectations.dishes.length === 0, `${context} poor case must not assert dish labels.`);
    invariant(
      stableStringify(overallRisk.allowedRiskRange?.levels) === stableStringify(["unclear"]),
      `${context} poor case must expect unclear overall risk.`
    );
    invariant(
      expectations.requiredQuestions.some((question) => question.intent === "request_readable_menu"),
      `${context} poor case must request a readable menu.`
    );
  } else {
    invariant(!readability.includes("poor"), `${context} readable case must not allow poor.`);
    invariant(expectations.dishes.length > 0, `${context} readable case must include dish labels.`);
  }
}

async function validateSchemaDefinition() {
  const schema = JSON.parse(await readFile(SCHEMA_FILE, "utf8"));
  const holdoutSchema = JSON.parse(await readFile(HOLDOUT_SCHEMA_FILE, "utf8"));
  invariant(schema.$schema === "https://json-schema.org/draft/2020-12/schema", `${SCHEMA_PATH} must use JSON Schema 2020-12.`);
  invariant(schema.properties?.schemaVersion?.const === "1.0.0", `${SCHEMA_PATH} must lock schemaVersion 1.0.0.`);
  invariant(
    stableStringify(schema.$defs?.evidenceLabel?.enum) === stableStringify(EVIDENCE_LABELS),
    `${SCHEMA_PATH} evidence labels disagree with the holdout builder.`
  );
  invariant(
    stableStringify(schema.$defs?.riskLevel?.enum) === stableStringify(ALL_RISK_LEVELS),
    `${SCHEMA_PATH} risk levels disagree with the holdout builder.`
  );
  invariant(
    schema.$defs?.image?.properties?.path?.pattern === "^docs/ai-evals/images/(controlled|licensed)/[IL]-[0-9]{3}\\.jpg$",
    `${SCHEMA_PATH} image path contract changed; review the candidate holdout path extension.`
  );
  invariant(
    holdoutSchema.$schema === "https://json-schema.org/draft/2020-12/schema" &&
      holdoutSchema.$id === "benchmark-holdout.schema.json",
    `${HOLDOUT_SCHEMA_PATH} must be the JSON Schema 2020-12 holdout sidecar.`
  );
  invariant(
    holdoutSchema.properties?.$schema?.const === "../images/holdout/benchmark-holdout.schema.json",
    `${HOLDOUT_SCHEMA_PATH} manifest reference drifted.`
  );
  invariant(
    holdoutSchema.properties?.cases?.minItems === EXPECTED_CASE_COUNT &&
      holdoutSchema.properties?.cases?.maxItems === EXPECTED_CASE_COUNT,
    `${HOLDOUT_SCHEMA_PATH} must require exactly 48 cases.`
  );
  invariant(
    holdoutSchema.$defs?.holdoutImage?.properties?.path?.pattern ===
      "^docs/ai-evals/images/holdout/I-1(?:0[1-9]|[1-3][0-9]|4[0-8])\\.jpg$",
    `${HOLDOUT_SCHEMA_PATH} image membership contract drifted.`
  );
  invariant(
    holdoutSchema.$defs?.holdoutCase?.properties?.id?.pattern === "^I-1(?:0[1-9]|[1-3][0-9]|4[0-8])$",
    `${HOLDOUT_SCHEMA_PATH} case ID membership contract drifted.`
  );
  invariant(
    holdoutSchema.$defs?.holdoutCase?.required?.includes("cuisine") &&
      holdoutSchema.$defs?.holdoutCase?.properties?.cuisine?.type === "string" &&
      holdoutSchema.$defs?.holdoutCase?.properties?.cuisine?.minLength === 1,
    `${HOLDOUT_SCHEMA_PATH} must require a reviewed cuisine string for every case.`
  );
  invariant(
    stableStringify(holdoutSchema.$defs?.holdoutCase?.properties?.sourceType?.enum) ===
      stableStringify(["controlled", "licensed"]),
    `${HOLDOUT_SCHEMA_PATH} must support controlled and licensed holdout cases.`
  );
}

function validateSourceManifest(sourceManifest) {
  invariant(isRecord(sourceManifest), `${SOURCE_PATH} must contain an object.`);
  invariant(sourceManifest.schemaVersion === "1.0.0-candidate", `${SOURCE_PATH} schemaVersion is invalid.`);
  invariant(sourceManifest.corpusId === "sift-menu-analysis-holdout-candidate-v1", `${SOURCE_PATH} corpusId is invalid.`);
  invariant(sourceManifest.status === "candidate_pending_human_review", `${SOURCE_PATH} must remain a candidate.`);
  invariant(sourceManifest.generatorPath === GENERATOR_PATH, `${SOURCE_PATH} generatorPath drifted.`);
  invariant(sourceManifest.generation?.casesPerGroup === CASES_PER_GROUP, `${SOURCE_PATH} must declare two cases per group.`);
  invariant(
    stableStringify(sourceManifest.generation?.qualityVariants) === stableStringify(QUALITY_VARIANTS),
    `${SOURCE_PATH} quality variant declaration drifted.`
  );
  invariant(
    Array.isArray(sourceManifest.groups) && sourceManifest.groups.length === EXPECTED_GROUP_COUNT,
    `${SOURCE_PATH} must contain 24 independent menu groups.`
  );
  invariant(
    Array.isArray(sourceManifest.cases) && sourceManifest.cases.length === EXPECTED_CASE_COUNT,
    `${SOURCE_PATH} must contain 48 cases.`
  );

  const expectedIds = Array.from({ length: EXPECTED_CASE_COUNT }, (_, index) => `I-${String(101 + index).padStart(3, "0")}`);
  const sourceIds = sourceManifest.cases.map((sourceCase) => sourceCase.id);
  invariant(stableStringify(sourceIds) === stableStringify(expectedIds), `${SOURCE_PATH} membership must remain I-101..I-148.`);
  invariant(new Set(sourceIds).size === sourceIds.length, `${SOURCE_PATH} contains duplicate IDs.`);

  const groupsById = new Map();
  const groupNames = new Set();
  const caseToGroup = new Map();
  for (const group of sourceManifest.groups) {
    invariant(isRecord(group), "Every source group must be an object.");
    assertString(group.id, "Source group id");
    invariant(group.id.startsWith("holdout/"), `Source group ${group.id} must use the holdout namespace.`);
    invariant(
      ["controlled_template", "licensed_menu"].includes(group.kind),
      `Source group ${group.id} kind is invalid.`
    );
    assertString(group.name, `Source group ${group.id} name`);
    assertStringArray(group.caseIds, `Source group ${group.id} caseIds`, { allowEmpty: false });
    invariant(group.caseIds.length === CASES_PER_GROUP, `Source group ${group.id} must contain two cases.`);
    invariant(!groupsById.has(group.id), `Duplicate source group ${group.id}.`);
    invariant(!groupNames.has(group.name), `Source group ${group.id} must use a distinct menu name.`);
    groupsById.set(group.id, group);
    groupNames.add(group.name);
    for (const caseId of group.caseIds) {
      invariant(!caseToGroup.has(caseId), `Source case ${caseId} appears in multiple groups.`);
      caseToGroup.set(caseId, group.id);
    }
  }
  invariant(caseToGroup.size === EXPECTED_CASE_COUNT, "Source groups must cover exactly 48 cases.");

  const casesByGroup = new Map();
  const languages = new Set();
  const cuisines = new Set();
  const translationCasesByLanguage = new Map();
  const allergenCounts = new Map();
  const imageHashes = new Set();
  let criticalCaseCount = 0;
  for (const sourceCase of sourceManifest.cases) {
    invariant(isRecord(sourceCase), "Every source case must be an object.");
    assertString(sourceCase.id, "Source case id");
    invariant(sourceCase.groupId === caseToGroup.get(sourceCase.id), `Source case ${sourceCase.id} groupId drifted.`);
    invariant(
      ["controlled", "licensed"].includes(sourceCase.sourceType),
      `Source case ${sourceCase.id} sourceType is invalid.`
    );
    invariant(typeof sourceCase.critical === "boolean", `Source case ${sourceCase.id} critical must be boolean.`);
    assertString(sourceCase.language, `Source case ${sourceCase.id} language`);
    languages.add(sourceCase.language);
    assertString(sourceCase.cuisine, `Source case ${sourceCase.id} cuisine`);
    cuisines.add(sourceCase.cuisine);
    invariant(QUALITY_VARIANTS.includes(sourceCase.qualityVariant), `Source case ${sourceCase.id} qualityVariant is invalid.`);
    invariant(
      sourceCase.imagePath === `docs/ai-evals/images/holdout/${sourceCase.id}.jpg`,
      `Source case ${sourceCase.id} has an invalid holdout image path.`
    );
    assertSha256(sourceCase.imageSha256, `Source case ${sourceCase.id} imageSha256`);
    invariant(!imageHashes.has(sourceCase.imageSha256), `Source case ${sourceCase.id} repeats an exact holdout image hash.`);
    imageHashes.add(sourceCase.imageSha256);
    validateProfile(sourceCase.profile, `Source case ${sourceCase.id} profile`);
    if (sourceCase.critical) criticalCaseCount += 1;
    for (const allergy of sourceCase.profile.allergies) {
      allergenCounts.set(allergy.name, (allergenCounts.get(allergy.name) ?? 0) + 1);
    }
    invariant(
      sourceCase.profile.restaurantLanguage === sourceCase.language,
      `Source case ${sourceCase.id} restaurant language must match its visible menu language.`
    );
    if (sourceCase.profile.preferredLanguage !== sourceCase.profile.restaurantLanguage) {
      translationCasesByLanguage.set(
        sourceCase.language,
        (translationCasesByLanguage.get(sourceCase.language) ?? 0) + 1
      );
    }
    const severityValues = new Set(sourceCase.profile.allergies.map((allergy) => allergy.severity));
    const crossContactValues = new Set(sourceCase.profile.allergies.map((allergy) => allergy.avoidCrossContact));
    invariant(severityValues.size === 1, `Source case ${sourceCase.id} must use one profile severity.`);
    invariant(crossContactValues.size === 1, `Source case ${sourceCase.id} must use one cross-contact setting.`);
    validateExpectations(sourceCase.expectations, `Source case ${sourceCase.id} expectations`);
    validateSourceCaseRights(sourceCase);
    const questionIntents = new Set(sourceCase.expectations.requiredQuestions.map((question) => question.intent));
    const avoidCrossContact = sourceCase.profile.allergies[0].avoidCrossContact;
    invariant(
      questionIntents.has("confirm_cross_contact") === avoidCrossContact,
      `Source case ${sourceCase.id} cross-contact question must match its profile.`
    );
    if (sourceCase.expectations.readability.needsRetake) {
      invariant(
        questionIntents.has("request_readable_menu"),
        `Source case ${sourceCase.id} poor image must request a readable menu.`
      );
    } else {
      const roles = new Set(sourceCase.expectations.dishes.map((dish) => dish.role));
      const evidenceLabels = new Set(sourceCase.expectations.dishes.map((dish) => dish.evidenceLabel));
      invariant(
        roles.size === 2 && roles.has("risk_target") && roles.has("benign_control"),
        `Source case ${sourceCase.id} readable evidence must include risk and benign controls.`
      );
      invariant(
        evidenceLabels.has("confirmed_visible") && evidenceLabels.has("plausible_pattern"),
        `Source case ${sourceCase.id} readable evidence must include direct and preparation-pattern labels.`
      );
      invariant(
        questionIntents.has("confirm_preparation"),
        `Source case ${sourceCase.id} readable evidence must require recipe or preparation confirmation.`
      );
    }
    invariant(sourceCase.reviewStatus === "pending", `Source case ${sourceCase.id} review must remain pending.`);
    const groupCases = casesByGroup.get(sourceCase.groupId) ?? [];
    groupCases.push(sourceCase);
    casesByGroup.set(sourceCase.groupId, groupCases);
  }
  invariant(
    stableStringify([...languages].sort(compareStrings)) === stableStringify(EXPECTED_LANGUAGES),
    "The holdout must preserve the six fixed underrepresented user languages."
  );
  for (const language of EXPECTED_LANGUAGES) {
    invariant(
      sourceManifest.cases.filter((sourceCase) => sourceCase.language === language).length === CASES_PER_LANGUAGE,
      `Language ${language} must contain exactly eight cases.`
    );
    invariant(
      translationCasesByLanguage.get(language) === TRANSLATION_CASES_PER_LANGUAGE,
      `Language ${language} must include one two-case cross-language menu group.`
    );
  }
  invariant(
    [...translationCasesByLanguage.values()].reduce((total, count) => total + count, 0) ===
      EXPECTED_TRANSLATION_CASE_COUNT,
    `The holdout must include exactly ${EXPECTED_TRANSLATION_CASE_COUNT} cross-language cases.`
  );

  const groupCountsByLanguage = new Map();
  for (const [groupId, groupCases] of casesByGroup) {
    invariant(groupCases.length === CASES_PER_GROUP, `Group ${groupId} must contain two cases.`);
    invariant(
      new Set(groupCases.map((item) => item.qualityVariant)).size === CASES_PER_GROUP,
      `Group ${groupId} must contain two distinct quality variants.`
    );
    const groupLanguages = new Set(groupCases.map((item) => item.language));
    invariant(groupLanguages.size === 1, `Group ${groupId} must remain within one language.`);
    const groupCuisines = new Set(groupCases.map((item) => item.cuisine));
    invariant(groupCuisines.size === 1, `Group ${groupId} must preserve one reviewed cuisine label.`);
    const crossContact = new Set(
      groupCases.flatMap((item) => item.profile.allergies.map((allergy) => allergy.avoidCrossContact))
    );
    invariant(crossContact.has(false) && crossContact.has(true), `Group ${groupId} must vary cross-contact sensitivity.`);
    const [language] = groupLanguages;
    groupCountsByLanguage.set(language, (groupCountsByLanguage.get(language) ?? 0) + 1);
    const sourceTypes = new Set(groupCases.map((item) => item.sourceType));
    invariant(sourceTypes.size === 1, `Group ${groupId} cannot mix controlled and licensed cases.`);
    const group = groupsById.get(groupId);
    const [sourceType] = sourceTypes;
    invariant(
      group.kind === (sourceType === "licensed" ? "licensed_menu" : "controlled_template"),
      `Group ${groupId} kind does not match its case source type.`
    );
  }
  invariant(casesByGroup.size === EXPECTED_GROUP_COUNT, "The source cases must resolve to exactly 24 groups.");
  invariant(cuisines.size === EXPECTED_GROUP_COUNT, "The holdout must preserve 24 distinct reviewed cuisine labels.");
  for (const language of EXPECTED_LANGUAGES) {
    invariant(
      groupCountsByLanguage.get(language) === GROUPS_PER_LANGUAGE,
      `Language ${language} must contain exactly four independent menu groups.`
    );
  }

  for (const qualityVariant of QUALITY_VARIANTS) {
    invariant(
      sourceManifest.cases.filter((sourceCase) => sourceCase.qualityVariant === qualityVariant).length ===
        CASES_PER_QUALITY_VARIANT,
      `Quality variant ${qualityVariant} must appear exactly 12 times.`
    );
  }
  const mildCases = sourceManifest.cases.filter((sourceCase) => sourceCase.profile.allergies[0].severity === "mild");
  const severeCases = sourceManifest.cases.filter((sourceCase) => sourceCase.profile.allergies[0].severity === "severe");
  invariant(mildCases.length === 24 && severeCases.length === 24, "The holdout must contain 24 mild and 24 severe profiles.");
  const crossContactCases = sourceManifest.cases.filter(
    (sourceCase) => sourceCase.profile.allergies[0].avoidCrossContact
  );
  invariant(
    crossContactCases.length === 24,
    "The holdout must contain 24 cross-contact true and 24 cross-contact false profiles."
  );
  const retakeCases = sourceManifest.cases.filter((sourceCase) => sourceCase.expectations.readability.needsRetake);
  invariant(retakeCases.length === POOR_RETAKE_CASE_COUNT, "The holdout must contain exactly 12 poor-image retake cases.");
  invariant(criticalCaseCount === EXPECTED_CRITICAL_CASE_COUNT, "The holdout must contain exactly 24 critical cases.");
  assertExactCounts(allergenCounts, EXPECTED_ALLERGEN_COUNTS, "Holdout allergen");
}

function validateSourceCaseRights(sourceCase) {
  if (sourceCase.sourceType === "controlled") {
    invariant(sourceCase.provenance === undefined, `Controlled source case ${sourceCase.id} must not declare external provenance.`);
    invariant(sourceCase.license === undefined, `Controlled source case ${sourceCase.id} must not declare external rights.`);
    return;
  }

  const provenance = sourceCase.provenance;
  invariant(isRecord(provenance), `Licensed source case ${sourceCase.id} needs provenance.`);
  assertString(provenance.sourceTitle, `Licensed source case ${sourceCase.id} sourceTitle`);
  assertString(provenance.sourceCreator, `Licensed source case ${sourceCase.id} sourceCreator`);
  invariant(isHttpsUrl(provenance.sourcePageUrl), `Licensed source case ${sourceCase.id} needs an HTTPS sourcePageUrl.`);
  invariant(
    provenance.generatorPath === null || typeof provenance.generatorPath === "string",
    `Licensed source case ${sourceCase.id} generatorPath must be a string or null.`
  );

  const license = sourceCase.license;
  invariant(isRecord(license), `Licensed source case ${sourceCase.id} needs rights metadata.`);
  invariant(license.status === "declared", `Licensed source case ${sourceCase.id} rights status must be declared.`);
  assertString(license.identifier, `Licensed source case ${sourceCase.id} license identifier`);
  assertString(license.creator, `Licensed source case ${sourceCase.id} license creator`);
  invariant(typeof license.attributionRequired === "boolean", `Licensed source case ${sourceCase.id} attributionRequired is missing.`);
  invariant(
    license.licenseUrl === null || isHttpsUrl(license.licenseUrl),
    `Licensed source case ${sourceCase.id} licenseUrl must be HTTPS or null.`
  );
  invariant(isHttpsUrl(license.sourcePageUrl), `Licensed source case ${sourceCase.id} rights record needs an HTTPS sourcePageUrl.`);
  assertString(license.notes, `Licensed source case ${sourceCase.id} rights notes`);
}

async function validateDevelopmentSeparation(sourceManifest) {
  // This builder can prove exact separation only. Frozen promotion separately requires a
  // hash-bound external perceptual-hash and visual-review audit covering both splits.
  const developmentManifest = JSON.parse(await readFile(DEVELOPMENT_FILE, "utf8"));
  const developmentGroups = developmentManifest.grouping?.groups;
  const developmentCases = developmentManifest.cases;
  invariant(
    Array.isArray(developmentGroups) && Array.isArray(developmentCases),
    `${DEVELOPMENT_PATH} must contain grouping.groups and cases arrays.`
  );

  for (const group of developmentGroups) {
    invariant(isRecord(group), "Every authoritative development group must be an object.");
    assertString(group.id, "Development group id");
    assertString(group.name, `Development group ${group.id} name`);
  }
  for (const developmentCase of developmentCases) {
    invariant(isRecord(developmentCase), "Every authoritative development case must be an object.");
    assertString(developmentCase.id, "Development case id");
    invariant(isRecord(developmentCase.image), `Development case ${developmentCase.id} image must be an object.`);
    assertString(developmentCase.image.path, `Development case ${developmentCase.id} image.path`);
    assertSha256(developmentCase.image.sha256, `Development case ${developmentCase.id} image.sha256`);
  }

  const holdoutGroupNames = new Set(sourceManifest.groups.map((group) => normalizeGroupName(group.name)));
  const developmentGroupNames = new Set(developmentGroups.map((group) => normalizeGroupName(group.name)));
  invariant(
    !holdoutGroupNames.has("") && !developmentGroupNames.has(""),
    "Normalized development and holdout group names must not be empty."
  );

  const exactSurfaces = [
    ["group ID", sourceManifest.groups.map((group) => group.id), developmentGroups.map((group) => group.id)],
    ["normalized group name", holdoutGroupNames, developmentGroupNames],
    ["case ID", sourceManifest.cases.map((sourceCase) => sourceCase.id), developmentCases.map((item) => item.id)],
    [
      "image path",
      sourceManifest.cases.map((sourceCase) => sourceCase.imagePath),
      developmentCases.map((item) => item.image.path)
    ],
    [
      "image SHA-256",
      sourceManifest.cases.map((sourceCase) => sourceCase.imageSha256.toLowerCase()),
      developmentCases.map((item) => item.image.sha256.toLowerCase())
    ]
  ];

  for (const [surface, holdoutInput, developmentInput] of exactSurfaces) {
    const holdoutValues = holdoutInput instanceof Set ? holdoutInput : new Set(holdoutInput);
    const developmentValues = developmentInput instanceof Set ? developmentInput : new Set(developmentInput);
    const overlaps = [...holdoutValues].filter((value) => developmentValues.has(value)).sort(compareStrings);
    invariant(
      overlaps.length === 0,
      `Cross-split leakage guard rejected overlapping ${surface}: ${overlaps.join(", ")}`
    );
  }
}

async function readImageHash(imagePath) {
  const absolutePath = path.resolve(REPO_ROOT, ...imagePath.split("/"));
  const relativePath = path.relative(REPO_ROOT, absolutePath);
  invariant(
    relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath),
    `Image path escapes the repository: ${imagePath}`
  );
  invariant(imagePath.startsWith("docs/ai-evals/images/holdout/"), `Image path escapes the holdout sidecar: ${imagePath}`);
  return sha256(await readFile(absolutePath));
}

function copyJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildProvenance(sourceCase) {
  const common = {
    sourceManifestPath: SOURCE_PATH,
    sourceCaseId: sourceCase.id,
    sourceRecordSha256: sha256(Buffer.from(stableStringify(sourceCase), "utf8"))
  };
  if (sourceCase.sourceType === "licensed") {
    return {
      origin: "licensed_external",
      ...common,
      generatorPath: sourceCase.provenance.generatorPath ?? null,
      sourceTitle: sourceCase.provenance.sourceTitle,
      sourceCreator: sourceCase.provenance.sourceCreator,
      sourcePageUrl: sourceCase.provenance.sourcePageUrl
    };
  }
  return {
    origin: "controlled_fixture",
    ...common,
    generatorPath: GENERATOR_PATH,
    sourceTitle: null,
    sourceCreator: null,
    sourcePageUrl: null
  };
}

function buildLicense(sourceCase) {
  if (sourceCase.sourceType === "licensed") return copyJson(sourceCase.license);
  return {
    status: "internal_fixture",
    identifier: null,
    creator: null,
    attributionRequired: null,
    licenseUrl: null,
    sourcePageUrl: null,
    notes: "Repository-internal synthetic fixture; not licensed external menu content."
  };
}

async function buildManifest(sourceBytes, sourceManifest) {
  const sortedSourceCases = [...sourceManifest.cases].sort((left, right) => compareStrings(left.id, right.id));
  const imageHashes = new Map(
    await Promise.all(
      sortedSourceCases.map(async (sourceCase) => [sourceCase.id, await readImageHash(sourceCase.imagePath)])
    )
  );
  for (const sourceCase of sortedSourceCases) {
    invariant(
      imageHashes.get(sourceCase.id) === sourceCase.imageSha256,
      `Source case ${sourceCase.id} image SHA-256 does not match its generated JPEG.`
    );
  }

  const groups = [...sourceManifest.groups]
    .map((group) => ({
      id: group.id,
      kind: group.kind,
      name: group.name,
      caseIds: [...group.caseIds].sort(compareStrings)
    }))
    .sort((left, right) => compareStrings(left.id, right.id));

  const cases = sortedSourceCases.map((sourceCase) => ({
    id: sourceCase.id,
    name: sourceCase.name,
    split: "test",
    groupId: sourceCase.groupId,
    sourceType: sourceCase.sourceType,
    critical: sourceCase.critical,
    language: sourceCase.language,
    cuisine: sourceCase.cuisine,
    qualityVariant: sourceCase.qualityVariant,
    image: {
      path: sourceCase.imagePath,
      sha256: imageHashes.get(sourceCase.id)
    },
    profile: copyJson(sourceCase.profile),
    expectations: copyJson(sourceCase.expectations),
    provenance: buildProvenance(sourceCase),
    license: buildLicense(sourceCase),
    review: {
      status: "pending",
      primaryReviewerId: null,
      secondaryReviewerId: null,
      reviewedAt: null,
      notes: "Candidate holdout label; blinded human review is required before this split may be frozen or reported."
    }
  }));

  const sourceManifestSha256 = sha256(sourceBytes);
  const corpusFingerprint = {
    sourceManifestSha256,
    cases: cases.map((benchmarkCase) => ({
      id: benchmarkCase.id,
      groupId: benchmarkCase.groupId,
      imagePath: benchmarkCase.image.path,
      imageSha256: benchmarkCase.image.sha256
    }))
  };

  return {
    $schema: "../images/holdout/benchmark-holdout.schema.json",
    schemaVersion: "1.0.0",
    benchmarkId: "sift-menu-analysis-holdout-candidate",
    version: "test-v1",
    split: "test",
    status: "development",
    generatedBy: SCRIPT_PATH,
    corpus: {
      sourceManifest: {
        path: SOURCE_PATH,
        sha256: sourceManifestSha256
      },
      sha256: sha256(Buffer.from(stableStringify(corpusFingerprint), "utf8")),
      caseCount: cases.length,
      groupCount: groups.length
    },
    grouping: {
      unit: "underlying_menu_or_template",
      leakageRule: LEAKAGE_RULE,
      groups
    },
    taxonomies: {
      evidenceLabels: EVIDENCE_LABELS,
      ordinalRiskLevels: ORDINAL_RISK_LEVELS,
      nonOrdinalRiskLevels: ["unclear"]
    },
    cases
  };
}

function validateManifest(manifest, sourceManifest) {
  invariant(isRecord(manifest), "Generated holdout manifest must be an object.");
  invariant(
    manifest.$schema === "../images/holdout/benchmark-holdout.schema.json",
    "Generated holdout manifest has an unexpected $schema."
  );
  invariant(manifest.schemaVersion === "1.0.0", "Generated holdout manifest has an unexpected schemaVersion.");
  invariant(manifest.benchmarkId === "sift-menu-analysis-holdout-candidate", "Generated holdout benchmarkId drifted.");
  invariant(manifest.version === "test-v1", "Generated holdout version must be test-v1.");
  invariant(manifest.split === "test", "Generated holdout split must be test.");
  invariant(manifest.status === "development", "Candidate holdout must not be marked frozen.");
  invariant(manifest.generatedBy === SCRIPT_PATH, "Generated holdout builder path drifted.");
  invariant(manifest.corpus?.caseCount === EXPECTED_CASE_COUNT, "Generated holdout must contain 48 cases.");
  invariant(manifest.corpus?.groupCount === EXPECTED_GROUP_COUNT, "Generated holdout must contain 24 groups.");
  assertSha256(manifest.corpus?.sourceManifest?.sha256, "corpus.sourceManifest.sha256");
  assertSha256(manifest.corpus?.sha256, "corpus.sha256");
  invariant(manifest.corpus.sourceManifest.path === SOURCE_PATH, "Generated holdout source path drifted.");

  invariant(manifest.grouping?.leakageRule === LEAKAGE_RULE, "Generated holdout leakage rule drifted.");
  invariant(
    Array.isArray(manifest.grouping?.groups) && manifest.grouping.groups.length === EXPECTED_GROUP_COUNT,
    "Generated holdout must contain exactly 24 groups."
  );
  const groupIds = manifest.grouping.groups.map((group) => group.id);
  invariant(new Set(groupIds).size === groupIds.length, "Generated holdout repeats a group ID.");
  invariant(stableStringify(groupIds) === stableStringify([...groupIds].sort(compareStrings)), "Generated groups must be sorted.");
  const groupByCase = new Map();
  for (const group of manifest.grouping.groups) {
    const sourceGroup = sourceManifest.groups.find((item) => item.id === group.id);
    invariant(sourceGroup, `Generated group ${group.id} is not in the source manifest.`);
    invariant(group.kind === sourceGroup.kind, `Generated group ${group.id} kind drifted.`);
    assertString(group.name, `Generated group ${group.id} name`);
    assertStringArray(group.caseIds, `Generated group ${group.id} caseIds`, { allowEmpty: false });
    invariant(group.caseIds.length === CASES_PER_GROUP, `Generated group ${group.id} must have two cases.`);
    for (const caseId of group.caseIds) {
      invariant(!groupByCase.has(caseId), `Generated case ${caseId} appears in multiple groups.`);
      groupByCase.set(caseId, group.id);
    }
  }

  invariant(
    Array.isArray(manifest.cases) && manifest.cases.length === EXPECTED_CASE_COUNT,
    "Generated holdout must contain exactly 48 cases."
  );
  const sourceById = new Map(sourceManifest.cases.map((sourceCase) => [sourceCase.id, sourceCase]));
  const caseIds = manifest.cases.map((benchmarkCase) => benchmarkCase.id);
  invariant(new Set(caseIds).size === caseIds.length, "Generated holdout repeats a case ID.");
  invariant(stableStringify(caseIds) === stableStringify([...caseIds].sort(compareStrings)), "Generated cases must be sorted.");
  invariant(
    groupByCase.size === EXPECTED_CASE_COUNT,
    "Generated groups must cover all 48 holdout cases exactly once."
  );

  for (const benchmarkCase of manifest.cases) {
    const sourceCase = sourceById.get(benchmarkCase.id);
    invariant(sourceCase, `Generated case ${benchmarkCase.id} is not in the source manifest.`);
    invariant(benchmarkCase.split === "test", `Generated case ${benchmarkCase.id} split drifted.`);
    invariant(benchmarkCase.groupId === groupByCase.get(benchmarkCase.id), `Generated case ${benchmarkCase.id} group drifted.`);
    invariant(benchmarkCase.sourceType === sourceCase.sourceType, `Generated case ${benchmarkCase.id} sourceType drifted.`);
    assertString(benchmarkCase.cuisine, `Generated case ${benchmarkCase.id} cuisine`);
    invariant(
      benchmarkCase.cuisine === sourceCase.cuisine,
      `Generated case ${benchmarkCase.id} reviewed cuisine drifted.`
    );
    invariant(benchmarkCase.image?.path === sourceCase.imagePath, `Generated case ${benchmarkCase.id} image path drifted.`);
    assertSha256(benchmarkCase.image?.sha256, `Generated case ${benchmarkCase.id} image.sha256`);
    invariant(benchmarkCase.image.sha256 === sourceCase.imageSha256, `Generated case ${benchmarkCase.id} image hash drifted.`);
    validateProfile(benchmarkCase.profile, `Generated case ${benchmarkCase.id} profile`);
    validateExpectations(benchmarkCase.expectations, `Generated case ${benchmarkCase.id} expectations`);
    invariant(benchmarkCase.provenance?.sourceManifestPath === SOURCE_PATH, `Generated case ${benchmarkCase.id} provenance path drifted.`);
    invariant(benchmarkCase.provenance?.sourceCaseId === benchmarkCase.id, `Generated case ${benchmarkCase.id} provenance ID drifted.`);
    invariant(
      benchmarkCase.provenance?.sourceRecordSha256 === sha256(Buffer.from(stableStringify(sourceCase), "utf8")),
      `Generated case ${benchmarkCase.id} source record hash drifted.`
    );
    invariant(
      stableStringify(benchmarkCase.provenance) === stableStringify(buildProvenance(sourceCase)),
      `Generated case ${benchmarkCase.id} provenance drifted.`
    );
    invariant(
      stableStringify(benchmarkCase.license) === stableStringify(buildLicense(sourceCase)),
      `Generated case ${benchmarkCase.id} license drifted.`
    );
    invariant(benchmarkCase.review?.status === "pending", `Generated case ${benchmarkCase.id} review must remain pending.`);
    invariant(
      benchmarkCase.review.primaryReviewerId === null &&
        benchmarkCase.review.secondaryReviewerId === null &&
        benchmarkCase.review.reviewedAt === null,
      `Generated case ${benchmarkCase.id} pending reviewer fields must be null.`
    );
  }

  const corpusFingerprint = {
    sourceManifestSha256: manifest.corpus.sourceManifest.sha256,
    cases: manifest.cases.map((benchmarkCase) => ({
      id: benchmarkCase.id,
      groupId: benchmarkCase.groupId,
      imagePath: benchmarkCase.image.path,
      imageSha256: benchmarkCase.image.sha256
    }))
  };
  invariant(
    manifest.corpus.sha256 === sha256(Buffer.from(stableStringify(corpusFingerprint), "utf8")),
    "Generated holdout corpus SHA-256 does not match its source and image records."
  );
}

function serialize(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function createMixedSourceSelfTest(sourceManifest) {
  const mixed = copyJson(sourceManifest);
  const licensedGroupIds = new Set(
    [...mixed.groups]
      .sort((left, right) => compareStrings(left.id, right.id))
      .slice(0, 6)
      .map((group) => group.id)
  );
  for (const group of mixed.groups) {
    if (licensedGroupIds.has(group.id)) group.kind = "licensed_menu";
  }
  for (const sourceCase of mixed.cases) {
    if (!licensedGroupIds.has(sourceCase.groupId)) continue;
    const sourcePageUrl = `https://example.invalid/sift-holdout/${sourceCase.id}`;
    sourceCase.sourceType = "licensed";
    sourceCase.provenance = {
      generatorPath: null,
      sourceTitle: `Builder self-test menu ${sourceCase.id}`,
      sourceCreator: "Sift benchmark self-test",
      sourcePageUrl
    };
    sourceCase.license = {
      status: "declared",
      identifier: "CC0-1.0",
      creator: "Sift benchmark self-test",
      attributionRequired: false,
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      sourcePageUrl,
      notes: "Synthetic metadata used only to verify mixed-source builder behavior."
    };
  }
  return mixed;
}

function assertSourceValidationFails(sourceManifest, expectedPattern) {
  let error = null;
  try {
    validateSourceManifest(sourceManifest);
  } catch (caught) {
    error = caught;
  }
  invariant(error instanceof Error, "Invalid mixed-source self-test input was accepted.");
  invariant(expectedPattern.test(error.message), `Unexpected mixed-source validation error: ${error.message}`);
}

async function runSelfTest(sourceManifest) {
  const mixed = createMixedSourceSelfTest(sourceManifest);
  validateSourceManifest(mixed);
  await validateDevelopmentSeparation(mixed);
  const mixedBytes = Buffer.from(serialize(mixed), "utf8");
  const manifest = await buildManifest(mixedBytes, mixed);
  validateManifest(manifest, mixed);
  invariant(manifest.cases.filter((item) => item.sourceType === "licensed").length === 12, "Mixed-source builder did not preserve 12 licensed cases.");
  invariant(manifest.grouping.groups.filter((item) => item.kind === "licensed_menu").length === 6, "Mixed-source builder did not preserve six licensed groups.");

  const missingRights = copyJson(mixed);
  delete missingRights.cases.find((item) => item.sourceType === "licensed").license;
  assertSourceValidationFails(missingRights, /rights metadata/u);

  const mixedGroup = copyJson(mixed);
  const firstLicensedGroup = mixedGroup.groups.find((group) => group.kind === "licensed_menu");
  const mismatchedCase = mixedGroup.cases.find((item) => item.id === firstLicensedGroup.caseIds[0]);
  mismatchedCase.sourceType = "controlled";
  delete mismatchedCase.provenance;
  delete mismatchedCase.license;
  assertSourceValidationFails(mixedGroup, /cannot mix controlled and licensed/u);

  console.log("Holdout builder self-test passed: mixed-source candidates preserve 12 licensed cases in six whole groups and reject incomplete rights or mixed group metadata.");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(`Usage: node ${SCRIPT_PATH} [--write|--check|--self-test]`);
    return;
  }
  invariant(args.length <= 1, `Usage: node ${SCRIPT_PATH} [--write|--check|--self-test]`);
  const mode = args[0] ?? "--write";
  invariant(["--write", "--check", "--self-test"].includes(mode), `Unknown option ${mode}.`);

  await validateSchemaDefinition();
  const sourceBytes = await readFile(SOURCE_FILE);
  const sourceManifest = JSON.parse(sourceBytes.toString("utf8"));
  if (mode === "--self-test") {
    await runSelfTest(sourceManifest);
    return;
  }
  validateSourceManifest(sourceManifest);
  await validateDevelopmentSeparation(sourceManifest);
  const manifest = await buildManifest(sourceBytes, sourceManifest);
  validateManifest(manifest, sourceManifest);
  const expectedOutput = serialize(manifest);

  if (mode === "--check") {
    const actualOutput = await readFile(OUTPUT_FILE, "utf8");
    const actualManifest = JSON.parse(actualOutput);
    validateManifest(actualManifest, sourceManifest);
    invariant(actualOutput === expectedOutput, `${OUTPUT_PATH} is not canonical or is out of date. Run --write.`);
    console.log(`Validated ${OUTPUT_PATH}: 48 cases in 24 candidate holdout groups.`);
  } else {
    await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await writeFile(OUTPUT_FILE, expectedOutput, "utf8");
    invariant((await readFile(OUTPUT_FILE, "utf8")) === expectedOutput, `Failed to persist canonical ${OUTPUT_PATH}.`);
    console.log(`Wrote ${OUTPUT_PATH}: 48 cases in 24 candidate holdout groups.`);
  }
  console.log(`Corpus SHA-256: ${manifest.corpus.sha256}`);
  const licensedCount = manifest.cases.filter((item) => item.sourceType === "licensed").length;
  console.log(
    licensedCount === 0
      ? "Status: candidate only; it is fully controlled/synthetic and cannot be frozen until 12 cases are replaced with reviewed real-world sources, label approvals are complete, and an external perceptual/visual duplicate audit is bound into lineage."
      : `Status: candidate only; ${licensedCount} real-world cases are present, but promotion still requires exactly 12 rights-reviewed cases across six groups, complete label approvals, and an external perceptual/visual duplicate audit.`
  );
}

main().catch((error) => {
  console.error(`Holdout manifest build failed: ${error.message}`);
  process.exitCode = 1;
});
