import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = "scripts/ai-evals/build-benchmark-manifest.mjs";
const SOURCE_PATH = "docs/ai-evals/image-cases.json";
const SCHEMA_PATH = "docs/ai-evals/benchmark-v1/benchmark-manifest.schema.json";
const OUTPUT_PATH = "docs/ai-evals/benchmark-v1/development-v1.json";
const FIXTURE_GENERATOR_PATH = "scripts/generate-ai-image-fixtures.py";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_FILE = path.join(REPO_ROOT, ...SOURCE_PATH.split("/"));
const SCHEMA_FILE = path.join(REPO_ROOT, ...SCHEMA_PATH.split("/"));
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

function controlledIds(first) {
  return Array.from({ length: 4 }, (_, index) => `I-${String(first + index).padStart(3, "0")}`);
}

const GROUP_SPECS = [
  { id: "controlled/english-tahini", kind: "controlled_template", cuisine: "Eastern Mediterranean", caseIds: controlledIds(1) },
  { id: "controlled/spanish-mole", kind: "controlled_template", cuisine: "Mexican", caseIds: controlledIds(5) },
  { id: "controlled/french-dairy", kind: "controlled_template", cuisine: "French", caseIds: controlledIds(9) },
  { id: "controlled/german-mustard", kind: "controlled_template", cuisine: "German", caseIds: controlledIds(13) },
  { id: "controlled/italian-shellfish", kind: "controlled_template", cuisine: "Italian", caseIds: controlledIds(17) },
  { id: "controlled/portuguese-fish-egg", kind: "controlled_template", cuisine: "Portuguese", caseIds: controlledIds(21) },
  { id: "controlled/japanese-soy-sesame", kind: "controlled_template", cuisine: "Japanese", caseIds: controlledIds(25) },
  { id: "controlled/korean-shellfish-sesame", kind: "controlled_template", cuisine: "Korean", caseIds: controlledIds(29) },
  { id: "controlled/chinese-peanut-sesame", kind: "controlled_template", cuisine: "Chinese", caseIds: controlledIds(33) },
  { id: "controlled/thai-peanut-shellfish", kind: "controlled_template", cuisine: "Thai", caseIds: controlledIds(37) },
  { id: "controlled/english-nuts-mango", kind: "controlled_template", cuisine: "International dessert", caseIds: controlledIds(41) },
  { id: "controlled/english-cafe-fryer", kind: "controlled_template", cuisine: "American cafe", caseIds: controlledIds(45) },
  { id: "licensed/l-001", kind: "licensed_menu", cuisine: "Portuguese cafe", caseIds: ["L-001"] },
  { id: "licensed/l-002", kind: "licensed_menu", cuisine: "Hong Kong street food", caseIds: ["L-002"] },
  { id: "licensed/l-003", kind: "licensed_menu", cuisine: "Cafe", caseIds: ["L-003"] },
  { id: "licensed/l-004", kind: "licensed_menu", cuisine: "Spanish cafe", caseIds: ["L-004"] },
  { id: "licensed/l-005", kind: "licensed_menu", cuisine: "German", caseIds: ["L-005"] },
  { id: "licensed/l-006", kind: "licensed_menu", cuisine: "French-Asian fusion", caseIds: ["L-006"] },
  { id: "licensed/l-007", kind: "licensed_menu", cuisine: "French", caseIds: ["L-007"] },
  { id: "licensed/l-008", kind: "licensed_menu", cuisine: "French creperie", caseIds: ["L-008"] },
  {
    id: "licensed/sawadee-thai-restaurant",
    kind: "licensed_menu",
    cuisine: "Thai",
    name: "Sawadee Thai Restaurant menu",
    caseIds: ["L-009", "L-010"]
  },
  { id: "licensed/l-011", kind: "licensed_menu", cuisine: "Mexican-Filipino fusion", caseIds: ["L-011"] },
  { id: "licensed/l-012", kind: "licensed_menu", cuisine: "Italian", caseIds: ["L-012"] }
];
const GROUP_SPEC_BY_ID = new Map(GROUP_SPECS.map((group) => [group.id, group]));

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

function orderedUnique(values) {
  return [...new Set(values)];
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
  invariant(typeof value === "string" && /^[0-9a-f]{64}$/.test(value), `${context} must be a SHA-256 hex digest.`);
}

function validateSourceCases(sourceCases) {
  invariant(Array.isArray(sourceCases), `${SOURCE_PATH} must contain a JSON array.`);
  invariant(sourceCases.length === 60, `${SOURCE_PATH} must contain exactly 60 cases for development-v1.`);

  const expectedIds = GROUP_SPECS.flatMap((group) => group.caseIds).sort(compareStrings);
  invariant(expectedIds.length === 60, "The development-v1 group map must contain exactly 60 case IDs.");
  invariant(new Set(expectedIds).size === expectedIds.length, "A case ID appears in more than one development-v1 group.");

  const ids = [];
  const imagePaths = [];
  for (const sourceCase of sourceCases) {
    invariant(isRecord(sourceCase), "Every source case must be an object.");
    assertString(sourceCase.id, "Source case id");
    invariant(/^[IL]-\d{3}$/.test(sourceCase.id), `Source case ${sourceCase.id} has an invalid id.`);
    ids.push(sourceCase.id);

    assertString(sourceCase.name, `Source case ${sourceCase.id} name`);
    invariant(["controlled", "licensed"].includes(sourceCase.sourceType), `Source case ${sourceCase.id} has an invalid sourceType.`);
    invariant(
      (sourceCase.id.startsWith("I-") && sourceCase.sourceType === "controlled") ||
        (sourceCase.id.startsWith("L-") && sourceCase.sourceType === "licensed"),
      `Source case ${sourceCase.id} id and sourceType disagree.`
    );
    assertString(sourceCase.imagePath, `Source case ${sourceCase.id} imagePath`);
    invariant(
      sourceCase.imagePath === `docs/ai-evals/images/${sourceCase.sourceType}/${sourceCase.id}.jpg`,
      `Source case ${sourceCase.id} has an unexpected imagePath.`
    );
    imagePaths.push(sourceCase.imagePath);
    assertString(sourceCase.language, `Source case ${sourceCase.id} language`);
    assertString(sourceCase.qualityVariant, `Source case ${sourceCase.id} qualityVariant`);
    invariant(typeof sourceCase.critical === "boolean", `Source case ${sourceCase.id} critical must be boolean.`);

    invariant(isRecord(sourceCase.profile), `Source case ${sourceCase.id} profile must be an object.`);
    assertString(sourceCase.profile.id, `Source case ${sourceCase.id} profile.id`);
    assertString(sourceCase.profile.name, `Source case ${sourceCase.id} profile.name`);
    assertString(sourceCase.profile.preferredLanguage, `Source case ${sourceCase.id} profile.preferredLanguage`);
    assertString(sourceCase.profile.restaurantLanguage, `Source case ${sourceCase.id} profile.restaurantLanguage`);
    invariant(Array.isArray(sourceCase.profile.allergies) && sourceCase.profile.allergies.length > 0, `Source case ${sourceCase.id} must define allergies.`);
    for (const allergy of sourceCase.profile.allergies) {
      invariant(isRecord(allergy), `Source case ${sourceCase.id} allergy must be an object.`);
      assertString(allergy.id, `Source case ${sourceCase.id} allergy.id`);
      assertString(allergy.name, `Source case ${sourceCase.id} allergy.name`);
      invariant(["mild", "moderate", "severe"].includes(allergy.severity), `Source case ${sourceCase.id} allergy severity is invalid.`);
      invariant(typeof allergy.avoidCrossContact === "boolean", `Source case ${sourceCase.id} allergy avoidCrossContact must be boolean.`);
    }

    invariant(isRecord(sourceCase.expected), `Source case ${sourceCase.id} expected must be an object.`);
    invariant(READABILITY_VALUES.includes(sourceCase.expected.readability), `Source case ${sourceCase.id} readability is invalid.`);
    invariant(typeof sourceCase.expected.needsRetake === "boolean", `Source case ${sourceCase.id} needsRetake must be boolean.`);
    invariant(
      sourceCase.expected.overallRisk === null || ALL_RISK_LEVELS.includes(sourceCase.expected.overallRisk),
      `Source case ${sourceCase.id} overallRisk is invalid.`
    );
    invariant(Array.isArray(sourceCase.expected.minimumRisks), `Source case ${sourceCase.id} minimumRisks must be an array.`);
    invariant(Array.isArray(sourceCase.expected.benignDishes), `Source case ${sourceCase.id} benignDishes must be an array.`);

    for (const expectation of sourceCase.expected.minimumRisks) {
      invariant(isRecord(expectation), `Source case ${sourceCase.id} minimum risk must be an object.`);
      assertString(expectation.dishName, `Source case ${sourceCase.id} minimum risk dishName`);
      invariant(ORDINAL_RISK_LEVELS.includes(expectation.minimumRisk), `Source case ${sourceCase.id} minimum risk level is invalid.`);
      invariant(typeof expectation.directListed === "boolean", `Source case ${sourceCase.id} directListed must be boolean.`);
    }
    assertStringArray(sourceCase.expected.benignDishes, `Source case ${sourceCase.id} benignDishes`);

    const riskDishNames = sourceCase.expected.minimumRisks.map((item) => item.dishName);
    invariant(new Set(riskDishNames).size === riskDishNames.length, `Source case ${sourceCase.id} repeats a minimum-risk dish.`);
    invariant(
      riskDishNames.every((dishName) => !sourceCase.expected.benignDishes.includes(dishName)),
      `Source case ${sourceCase.id} has a dish in both risk and benign expectations.`
    );

    if (sourceCase.expected.readability === "poor") {
      invariant(sourceCase.expected.needsRetake, `Poor source case ${sourceCase.id} must require a retake.`);
      invariant(sourceCase.expected.overallRisk === "unclear", `Poor source case ${sourceCase.id} must expect unclear overall risk.`);
      invariant(riskDishNames.length === 0 && sourceCase.expected.benignDishes.length === 0, `Poor source case ${sourceCase.id} must not assert dish risks.`);
    } else {
      invariant(!sourceCase.expected.needsRetake, `Readable source case ${sourceCase.id} must not require a retake.`);
      invariant(sourceCase.expected.overallRisk === null, `Readable source case ${sourceCase.id} must not assert overall risk.`);
    }

    if (sourceCase.sourceType === "licensed") {
      invariant(isRecord(sourceCase.source), `Licensed source case ${sourceCase.id} must define source metadata.`);
      assertString(sourceCase.source.title, `Licensed source case ${sourceCase.id} source.title`);
      assertString(sourceCase.source.creator, `Licensed source case ${sourceCase.id} source.creator`);
      assertString(sourceCase.source.license, `Licensed source case ${sourceCase.id} source.license`);
      assertString(sourceCase.source.licenseUrl, `Licensed source case ${sourceCase.id} source.licenseUrl`);
      invariant(/^https:\/\//.test(sourceCase.source.licenseUrl), `Licensed source case ${sourceCase.id} source.licenseUrl must use HTTPS.`);
      assertString(sourceCase.source.pageUrl, `Licensed source case ${sourceCase.id} source.pageUrl`);
      invariant(/^https:\/\//.test(sourceCase.source.pageUrl), `Licensed source case ${sourceCase.id} pageUrl must use HTTPS.`);
    }
  }

  invariant(new Set(ids).size === ids.length, `${SOURCE_PATH} contains duplicate case IDs.`);
  invariant(new Set(imagePaths).size === imagePaths.length, `${SOURCE_PATH} contains duplicate image paths.`);
  invariant(
    stableStringify([...ids].sort(compareStrings)) === stableStringify(expectedIds),
    `${SOURCE_PATH} case IDs do not match the immutable development-v1 membership.`
  );
}

function groupName(groupSpec, sourceById) {
  if (groupSpec.name) {
    return groupSpec.name;
  }
  const firstCase = sourceById.get(groupSpec.caseIds[0]);
  invariant(firstCase, `Missing first case for group ${groupSpec.id}.`);
  if (groupSpec.kind === "licensed_menu") {
    return firstCase.name;
  }
  const variantSuffix = ` - ${firstCase.qualityVariant.replaceAll("_", " ")}`;
  invariant(firstCase.name.endsWith(variantSuffix), `Cannot derive template name for group ${groupSpec.id}.`);
  return firstCase.name.slice(0, -variantSuffix.length);
}

function buildGroups(sourceById) {
  return GROUP_SPECS.map((groupSpec) => {
    for (const caseId of groupSpec.caseIds) {
      const sourceCase = sourceById.get(caseId);
      invariant(sourceCase, `Group ${groupSpec.id} references missing case ${caseId}.`);
      const expectedSourceType = groupSpec.kind === "controlled_template" ? "controlled" : "licensed";
      invariant(sourceCase.sourceType === expectedSourceType, `Group ${groupSpec.id} has a mismatched source type.`);
    }
    return {
      id: groupSpec.id,
      kind: groupSpec.kind,
      name: groupName(groupSpec, sourceById),
      caseIds: [...groupSpec.caseIds].sort(compareStrings)
    };
  }).sort((left, right) => compareStrings(left.id, right.id));
}

function ordinalRiskRange(minimum, maximum = "avoid_unless_confirmed") {
  const minimumIndex = ORDINAL_RISK_LEVELS.indexOf(minimum);
  const maximumIndex = ORDINAL_RISK_LEVELS.indexOf(maximum);
  invariant(minimumIndex >= 0 && maximumIndex >= minimumIndex, `Invalid ordinal risk range ${minimum}..${maximum}.`);
  return {
    kind: "ordinal",
    minimum,
    maximum,
    levels: ORDINAL_RISK_LEVELS.slice(minimumIndex, maximumIndex + 1)
  };
}

function unclearRiskRange() {
  return {
    kind: "non_ordinal",
    minimum: null,
    maximum: null,
    levels: ["unclear"]
  };
}

function buildDishExpectations(sourceCase) {
  const riskTargets = sourceCase.expected.minimumRisks.map((expectation) => ({
    dishName: expectation.dishName,
    role: "risk_target",
    evidenceLabel: expectation.directListed ? "confirmed_visible" : "plausible_pattern",
    evidenceNote: expectation.directListed
      ? "The legacy fixture marks the relevant allergen or derivative as directly listed in visible menu text."
      : "The legacy fixture defines a minimum risk without direct-listed evidence; staff confirmation is required.",
    evidenceSourceUrls: [],
    allowedRiskRange: ordinalRiskRange(expectation.minimumRisk)
  }));
  const benignControls = sourceCase.expected.benignDishes.map((dishName) => ({
    dishName,
    role: "benign_control",
    evidenceLabel: "unknown_unobservable",
    evidenceNote: "Visible text may look simple, but ingredient completeness and cross-contact are not observable from the menu alone.",
    evidenceSourceUrls: [],
    allowedRiskRange: ordinalRiskRange("low_risk", "ask_staff")
  }));
  return [...riskTargets, ...benignControls].sort((left, right) => compareStrings(left.dishName, right.dishName));
}

function buildQuestionRequirements(sourceCase, dishExpectations) {
  const allergies = [...sourceCase.profile.allergies].sort((left, right) => compareStrings(left.id, right.id));
  const allergenNames = allergies.map((allergy) => allergy.name);
  const requiredLanguages = orderedUnique([
    sourceCase.profile.preferredLanguage,
    sourceCase.profile.restaurantLanguage
  ]);
  const requirements = [];

  if (sourceCase.expected.needsRetake) {
    requirements.push({
      id: "request-readable-menu",
      scope: "scan",
      dishNames: [],
      intent: "request_readable_menu",
      allergens: [],
      requiredLanguages
    });
  }

  requirements.push({
    id: "confirm-ingredients",
    scope: "each_returned_dish",
    dishNames: [],
    intent: "confirm_ingredients",
    allergens: allergenNames,
    requiredLanguages
  });

  const patternDishes = dishExpectations
    .filter((expectation) => expectation.evidenceLabel === "plausible_pattern")
    .map((expectation) => expectation.dishName)
    .sort(compareStrings);
  if (patternDishes.length > 0) {
    requirements.push({
      id: "confirm-preparation",
      scope: "named_dishes",
      dishNames: patternDishes,
      intent: "confirm_preparation",
      allergens: allergenNames,
      requiredLanguages
    });
  }

  const crossContactAllergens = allergies
    .filter((allergy) => allergy.avoidCrossContact)
    .map((allergy) => allergy.name);
  if (crossContactAllergens.length > 0) {
    requirements.push({
      id: "confirm-cross-contact",
      scope: "each_returned_dish",
      dishNames: [],
      intent: "confirm_cross_contact",
      allergens: crossContactAllergens,
      requiredLanguages
    });
  }

  return requirements;
}

function copyProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    preferredLanguage: profile.preferredLanguage,
    restaurantLanguage: profile.restaurantLanguage,
    allergies: [...profile.allergies]
      .sort((left, right) => compareStrings(left.id, right.id))
      .map((allergy) => ({
        id: allergy.id,
        name: allergy.name,
        severity: allergy.severity,
        avoidCrossContact: allergy.avoidCrossContact
      }))
  };
}

function buildProvenance(sourceCase) {
  const isLicensed = sourceCase.sourceType === "licensed";
  return {
    origin: isLicensed ? "licensed_external" : "controlled_fixture",
    sourceManifestPath: SOURCE_PATH,
    sourceCaseId: sourceCase.id,
    sourceRecordSha256: sha256(Buffer.from(stableStringify(sourceCase), "utf8")),
    generatorPath: isLicensed ? null : FIXTURE_GENERATOR_PATH,
    sourceTitle: isLicensed ? sourceCase.source.title : null,
    sourceCreator: isLicensed ? sourceCase.source.creator : null,
    sourcePageUrl: isLicensed ? sourceCase.source.pageUrl : null
  };
}

function buildLicense(sourceCase) {
  if (sourceCase.sourceType === "controlled") {
    return {
      status: "internal_fixture",
      identifier: null,
      creator: null,
      attributionRequired: null,
      licenseUrl: null,
      sourcePageUrl: null,
      notes: "Repository-internal generated fixture; this record does not assert external reuse rights."
    };
  }
  return {
    status: "declared",
    identifier: sourceCase.source.license,
    creator: sourceCase.source.creator,
    attributionRequired: sourceCase.source.license !== "CC0",
    licenseUrl: sourceCase.source.licenseUrl,
    sourcePageUrl: sourceCase.source.pageUrl,
    notes: "License identifier is copied from the source record; verify the source page before redistribution."
  };
}

function buildOverallRiskExpectation(sourceCase) {
  if (sourceCase.expected.overallRisk === "unclear") {
    return {
      status: "annotated",
      evidenceLabel: "unknown_unobservable",
      evidenceSourceUrls: [],
      allowedRiskRange: unclearRiskRange(),
      note: "The menu is too unreadable or incomplete for a reliable menu-level assessment."
    };
  }
  return {
    status: "not_annotated",
    evidenceLabel: "unknown_unobservable",
    evidenceSourceUrls: [],
    allowedRiskRange: null,
    note: "The legacy fixture does not define a menu-level risk expectation for this case."
  };
}

async function readImageHash(imagePath) {
  const absolutePath = path.resolve(REPO_ROOT, ...imagePath.split("/"));
  const relativePath = path.relative(REPO_ROOT, absolutePath);
  invariant(relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath), `Image path escapes the repository: ${imagePath}`);
  return sha256(await readFile(absolutePath));
}

async function buildManifest(sourceBytes, sourceCases) {
  const sortedSourceCases = [...sourceCases].sort((left, right) => compareStrings(left.id, right.id));
  const sourceById = new Map(sortedSourceCases.map((sourceCase) => [sourceCase.id, sourceCase]));
  const groups = buildGroups(sourceById);
  const groupByCaseId = new Map(groups.flatMap((group) => group.caseIds.map((caseId) => [caseId, group.id])));
  const imageHashes = new Map(
    await Promise.all(
      sortedSourceCases.map(async (sourceCase) => [sourceCase.id, await readImageHash(sourceCase.imagePath)])
    )
  );

  const cases = sortedSourceCases.map((sourceCase) => {
    const dishExpectations = buildDishExpectations(sourceCase);
    const groupId = groupByCaseId.get(sourceCase.id);
    const groupSpec = GROUP_SPEC_BY_ID.get(groupId);
    invariant(groupSpec, `Missing group metadata for ${sourceCase.id}.`);
    return {
      id: sourceCase.id,
      name: sourceCase.name,
      split: "development",
      groupId,
      sourceType: sourceCase.sourceType,
      critical: sourceCase.critical,
      language: sourceCase.language,
      cuisine: groupSpec.cuisine,
      qualityVariant: sourceCase.qualityVariant,
      image: {
        path: sourceCase.imagePath,
        sha256: imageHashes.get(sourceCase.id)
      },
      profile: copyProfile(sourceCase.profile),
      expectations: {
        readability: {
          allowedValues: [sourceCase.expected.readability],
          needsRetake: sourceCase.expected.needsRetake
        },
        overallRisk: buildOverallRiskExpectation(sourceCase),
        dishes: dishExpectations,
        requiredQuestions: buildQuestionRequirements(sourceCase, dishExpectations)
      },
      provenance: buildProvenance(sourceCase),
      license: buildLicense(sourceCase),
      review: {
        status: "pending",
        primaryReviewerId: null,
        secondaryReviewerId: null,
        reviewedAt: null,
        notes: "Generated from legacy expectations; human annotation review is pending."
      }
    };
  });

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
    $schema: "./benchmark-manifest.schema.json",
    schemaVersion: "1.0.0",
    benchmarkId: "sift-menu-analysis",
    version: "development-v1",
    split: "development",
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
      leakageRule: "Assign every case with the same groupId to the same split before sampling individual cases.",
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

function validateRiskRange(range, context) {
  invariant(isRecord(range), `${context} must be an object.`);
  assertStringArray(range.levels, `${context}.levels`, { allowEmpty: false });
  invariant(range.levels.every((level) => ALL_RISK_LEVELS.includes(level)), `${context}.levels contains an invalid risk level.`);
  if (range.kind === "non_ordinal") {
    invariant(range.minimum === null && range.maximum === null, `${context} non-ordinal bounds must be null.`);
    invariant(stableStringify(range.levels) === stableStringify(["unclear"]), `${context} non-ordinal levels must be exactly unclear.`);
    return;
  }
  invariant(range.kind === "ordinal", `${context}.kind is invalid.`);
  invariant(ORDINAL_RISK_LEVELS.includes(range.minimum), `${context}.minimum is invalid.`);
  invariant(ORDINAL_RISK_LEVELS.includes(range.maximum), `${context}.maximum is invalid.`);
  const expected = ordinalRiskRange(range.minimum, range.maximum);
  invariant(stableStringify(range.levels) === stableStringify(expected.levels), `${context}.levels must be a contiguous ordinal range.`);
}

function validateManifest(manifest, sourceCases) {
  invariant(isRecord(manifest), "Generated benchmark manifest must be an object.");
  invariant(manifest.$schema === "./benchmark-manifest.schema.json", "Generated manifest has an unexpected $schema.");
  invariant(manifest.schemaVersion === "1.0.0", "Generated manifest has an unexpected schemaVersion.");
  invariant(manifest.benchmarkId === "sift-menu-analysis", "Generated manifest has an unexpected benchmarkId.");
  invariant(manifest.version === "development-v1", "Generated manifest has an unexpected version.");
  invariant(manifest.split === "development" && manifest.status === "development", "Generated manifest must be a development split.");
  invariant(manifest.generatedBy === SCRIPT_PATH, "Generated manifest has an unexpected generatedBy path.");
  invariant(isRecord(manifest.corpus), "Generated manifest corpus must be an object.");
  invariant(isRecord(manifest.corpus.sourceManifest), "Generated manifest sourceManifest must be an object.");
  invariant(manifest.corpus.sourceManifest.path === SOURCE_PATH, "Generated manifest source path is invalid.");
  assertSha256(manifest.corpus.sourceManifest.sha256, "corpus.sourceManifest.sha256");
  assertSha256(manifest.corpus.sha256, "corpus.sha256");
  invariant(manifest.corpus.caseCount === 60, "Generated manifest must contain 60 cases.");
  invariant(manifest.corpus.groupCount === 23, "Generated manifest must contain 23 groups.");

  invariant(isRecord(manifest.grouping) && Array.isArray(manifest.grouping.groups), "Generated manifest grouping is invalid.");
  invariant(manifest.grouping.unit === "underlying_menu_or_template", "Generated manifest grouping unit is invalid.");
  assertString(manifest.grouping.leakageRule, "grouping.leakageRule");
  invariant(manifest.grouping.groups.length === 23, "Generated manifest group list must contain 23 groups.");
  const groupIds = manifest.grouping.groups.map((group) => group.id);
  invariant(new Set(groupIds).size === groupIds.length, "Generated manifest contains duplicate group IDs.");
  invariant(stableStringify(groupIds) === stableStringify([...groupIds].sort(compareStrings)), "Generated groups are not sorted by id.");

  const caseIdsFromGroups = [];
  const groupByCaseId = new Map();
  for (const group of manifest.grouping.groups) {
    invariant(isRecord(group), "Every generated group must be an object.");
    assertString(group.id, "Generated group id");
    invariant(["controlled_template", "licensed_menu"].includes(group.kind), `Group ${group.id} kind is invalid.`);
    assertString(group.name, `Group ${group.id} name`);
    assertStringArray(group.caseIds, `Group ${group.id} caseIds`, { allowEmpty: false });
    invariant(stableStringify(group.caseIds) === stableStringify([...group.caseIds].sort(compareStrings)), `Group ${group.id} case IDs are not sorted.`);
    for (const caseId of group.caseIds) {
      invariant(!groupByCaseId.has(caseId), `Case ${caseId} appears in multiple groups.`);
      groupByCaseId.set(caseId, group.id);
      caseIdsFromGroups.push(caseId);
    }
  }

  invariant(Array.isArray(manifest.cases) && manifest.cases.length === 60, "Generated manifest cases must contain 60 entries.");
  const caseIds = manifest.cases.map((benchmarkCase) => benchmarkCase.id);
  invariant(new Set(caseIds).size === caseIds.length, "Generated manifest contains duplicate case IDs.");
  invariant(stableStringify(caseIds) === stableStringify([...caseIds].sort(compareStrings)), "Generated cases are not sorted by id.");
  invariant(
    stableStringify([...caseIdsFromGroups].sort(compareStrings)) === stableStringify(caseIds),
    "Generated groups must cover every case exactly once."
  );

  const sourceById = new Map(sourceCases.map((sourceCase) => [sourceCase.id, sourceCase]));
  for (const benchmarkCase of manifest.cases) {
    invariant(isRecord(benchmarkCase), "Every generated case must be an object.");
    const sourceCase = sourceById.get(benchmarkCase.id);
    invariant(sourceCase, `Generated case ${benchmarkCase.id} is not in the source manifest.`);
    invariant(benchmarkCase.split === "development", `Generated case ${benchmarkCase.id} has an invalid split.`);
    invariant(benchmarkCase.groupId === groupByCaseId.get(benchmarkCase.id), `Generated case ${benchmarkCase.id} has an invalid groupId.`);
    invariant(benchmarkCase.sourceType === sourceCase.sourceType, `Generated case ${benchmarkCase.id} sourceType drifted.`);
    assertString(benchmarkCase.cuisine, `Generated case ${benchmarkCase.id} cuisine`);
    invariant(
      benchmarkCase.cuisine === GROUP_SPEC_BY_ID.get(benchmarkCase.groupId)?.cuisine,
      `Generated case ${benchmarkCase.id} cuisine drifted.`
    );
    invariant(isRecord(benchmarkCase.image), `Generated case ${benchmarkCase.id} image must be an object.`);
    invariant(benchmarkCase.image.path === sourceCase.imagePath, `Generated case ${benchmarkCase.id} image path drifted.`);
    assertSha256(benchmarkCase.image.sha256, `Generated case ${benchmarkCase.id} image.sha256`);
    invariant(isRecord(benchmarkCase.expectations), `Generated case ${benchmarkCase.id} expectations must be an object.`);
    invariant(isRecord(benchmarkCase.expectations.readability), `Generated case ${benchmarkCase.id} readability must be an object.`);
    assertStringArray(benchmarkCase.expectations.readability.allowedValues, `Generated case ${benchmarkCase.id} readability.allowedValues`, { allowEmpty: false });
    invariant(
      benchmarkCase.expectations.readability.allowedValues.every((value) => READABILITY_VALUES.includes(value)),
      `Generated case ${benchmarkCase.id} has an invalid readability value.`
    );
    invariant(
      typeof benchmarkCase.expectations.readability.needsRetake === "boolean",
      `Generated case ${benchmarkCase.id} needsRetake must be boolean.`
    );

    const overallRisk = benchmarkCase.expectations.overallRisk;
    invariant(isRecord(overallRisk), `Generated case ${benchmarkCase.id} overallRisk must be an object.`);
    invariant(["annotated", "not_annotated"].includes(overallRisk.status), `Generated case ${benchmarkCase.id} overall risk status is invalid.`);
    invariant(EVIDENCE_LABELS.includes(overallRisk.evidenceLabel), `Generated case ${benchmarkCase.id} overall risk evidence label is invalid.`);
    assertStringArray(overallRisk.evidenceSourceUrls, `Generated case ${benchmarkCase.id} overall risk evidenceSourceUrls`);
    invariant(
      overallRisk.evidenceSourceUrls.every((url) => /^https:\/\//.test(url)),
      `Generated case ${benchmarkCase.id} overall risk evidence sources must use HTTPS.`
    );
    invariant(
      overallRisk.evidenceLabel !== "confirmed_external" || overallRisk.evidenceSourceUrls.length > 0,
      `Generated case ${benchmarkCase.id} confirmed external overall risk needs a source URL.`
    );
    assertString(overallRisk.note, `Generated case ${benchmarkCase.id} overall risk note`);
    if (overallRisk.status === "annotated") {
      validateRiskRange(overallRisk.allowedRiskRange, `Generated case ${benchmarkCase.id} overall risk range`);
    } else {
      invariant(overallRisk.allowedRiskRange === null, `Generated case ${benchmarkCase.id} unannotated overall risk must have a null range.`);
    }

    invariant(Array.isArray(benchmarkCase.expectations.dishes), `Generated case ${benchmarkCase.id} dishes must be an array.`);
    const dishNames = [];
    for (const dish of benchmarkCase.expectations.dishes) {
      invariant(isRecord(dish), `Generated case ${benchmarkCase.id} dish expectation must be an object.`);
      assertString(dish.dishName, `Generated case ${benchmarkCase.id} dishName`);
      dishNames.push(dish.dishName);
      invariant(["risk_target", "benign_control"].includes(dish.role), `Generated case ${benchmarkCase.id} dish role is invalid.`);
      invariant(EVIDENCE_LABELS.includes(dish.evidenceLabel), `Generated case ${benchmarkCase.id} dish evidence label is invalid.`);
      assertString(dish.evidenceNote, `Generated case ${benchmarkCase.id} dish evidence note`);
      assertStringArray(dish.evidenceSourceUrls, `Generated case ${benchmarkCase.id} dish evidenceSourceUrls`);
      invariant(
        dish.evidenceSourceUrls.every((url) => /^https:\/\//.test(url)),
        `Generated case ${benchmarkCase.id} dish evidence sources must use HTTPS.`
      );
      invariant(
        dish.evidenceLabel !== "confirmed_external" || dish.evidenceSourceUrls.length > 0,
        `Generated case ${benchmarkCase.id} confirmed external dish evidence needs a source URL.`
      );
      validateRiskRange(dish.allowedRiskRange, `Generated case ${benchmarkCase.id} ${dish.dishName} risk range`);
    }
    invariant(new Set(dishNames).size === dishNames.length, `Generated case ${benchmarkCase.id} repeats a dish expectation.`);
    invariant(stableStringify(dishNames) === stableStringify([...dishNames].sort(compareStrings)), `Generated case ${benchmarkCase.id} dishes are not sorted.`);

    invariant(Array.isArray(benchmarkCase.expectations.requiredQuestions), `Generated case ${benchmarkCase.id} requiredQuestions must be an array.`);
    const questionIds = [];
    for (const question of benchmarkCase.expectations.requiredQuestions) {
      invariant(isRecord(question), `Generated case ${benchmarkCase.id} question requirement must be an object.`);
      assertString(question.id, `Generated case ${benchmarkCase.id} question id`);
      questionIds.push(question.id);
      invariant(QUESTION_SCOPES.includes(question.scope), `Generated case ${benchmarkCase.id} question scope is invalid.`);
      invariant(QUESTION_INTENTS.includes(question.intent), `Generated case ${benchmarkCase.id} question intent is invalid.`);
      assertStringArray(question.dishNames, `Generated case ${benchmarkCase.id} question dishNames`);
      assertStringArray(question.allergens, `Generated case ${benchmarkCase.id} question allergens`);
      assertStringArray(question.requiredLanguages, `Generated case ${benchmarkCase.id} question requiredLanguages`, { allowEmpty: false });
      invariant(
        (question.scope === "named_dishes") === (question.dishNames.length > 0),
        `Generated case ${benchmarkCase.id} named-dish question scope and dishNames disagree.`
      );
    }
    invariant(new Set(questionIds).size === questionIds.length, `Generated case ${benchmarkCase.id} repeats a question requirement.`);

    invariant(isRecord(benchmarkCase.provenance), `Generated case ${benchmarkCase.id} provenance must be an object.`);
    invariant(benchmarkCase.provenance.sourceManifestPath === SOURCE_PATH, `Generated case ${benchmarkCase.id} provenance path drifted.`);
    invariant(benchmarkCase.provenance.sourceCaseId === benchmarkCase.id, `Generated case ${benchmarkCase.id} provenance id drifted.`);
    assertSha256(benchmarkCase.provenance.sourceRecordSha256, `Generated case ${benchmarkCase.id} sourceRecordSha256`);
    invariant(
      benchmarkCase.provenance.sourceRecordSha256 === sha256(Buffer.from(stableStringify(sourceCase), "utf8")),
      `Generated case ${benchmarkCase.id} source record hash drifted.`
    );
    invariant(isRecord(benchmarkCase.license), `Generated case ${benchmarkCase.id} license must be an object.`);
    invariant(["internal_fixture", "declared"].includes(benchmarkCase.license.status), `Generated case ${benchmarkCase.id} license status is invalid.`);
    invariant(isRecord(benchmarkCase.review), `Generated case ${benchmarkCase.id} review must be an object.`);
    invariant(benchmarkCase.review.status === "pending", `Generated case ${benchmarkCase.id} review status must remain pending in development-v1.`);
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
    "Generated manifest corpus SHA-256 does not match its source and image records."
  );
}

async function validateSchemaDefinition() {
  const schema = JSON.parse(await readFile(SCHEMA_FILE, "utf8"));
  invariant(schema.$schema === "https://json-schema.org/draft/2020-12/schema", `${SCHEMA_PATH} must use JSON Schema 2020-12.`);
  invariant(schema.$id === "benchmark-manifest.schema.json", `${SCHEMA_PATH} has an unexpected $id.`);
  invariant(schema.properties?.schemaVersion?.const === "1.0.0", `${SCHEMA_PATH} must lock schemaVersion 1.0.0.`);
  invariant(
    stableStringify(schema.$defs?.evidenceLabel?.enum) === stableStringify(EVIDENCE_LABELS),
    `${SCHEMA_PATH} evidence labels disagree with the builder.`
  );
  invariant(
    stableStringify(schema.$defs?.riskLevel?.enum) === stableStringify(ALL_RISK_LEVELS),
    `${SCHEMA_PATH} risk levels disagree with the builder.`
  );
}

function serialize(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(`Usage: node ${SCRIPT_PATH} [--write|--check]`);
    return;
  }
  invariant(args.length <= 1, `Usage: node ${SCRIPT_PATH} [--write|--check]`);
  const mode = args[0] ?? "--write";
  invariant(["--write", "--check"].includes(mode), `Unknown option ${mode}. Use --write or --check.`);

  await validateSchemaDefinition();
  const sourceBytes = await readFile(SOURCE_FILE);
  const sourceCases = JSON.parse(sourceBytes.toString("utf8"));
  validateSourceCases(sourceCases);
  const manifest = await buildManifest(sourceBytes, sourceCases);
  validateManifest(manifest, sourceCases);
  const expectedOutput = serialize(manifest);

  if (mode === "--check") {
    const actualOutput = await readFile(OUTPUT_FILE, "utf8");
    const actualManifest = JSON.parse(actualOutput);
    validateManifest(actualManifest, sourceCases);
    invariant(actualOutput === expectedOutput, `${OUTPUT_PATH} is not canonical or is out of date. Run the builder with --write.`);
    console.log(`Validated ${OUTPUT_PATH}: ${manifest.corpus.caseCount} cases in ${manifest.corpus.groupCount} groups.`);
  } else {
    await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await writeFile(OUTPUT_FILE, expectedOutput, "utf8");
    invariant((await readFile(OUTPUT_FILE, "utf8")) === expectedOutput, `Failed to persist canonical ${OUTPUT_PATH}.`);
    console.log(`Wrote ${OUTPUT_PATH}: ${manifest.corpus.caseCount} cases in ${manifest.corpus.groupCount} groups.`);
  }
  console.log(`Corpus SHA-256: ${manifest.corpus.sha256}`);
}

main().catch((error) => {
  console.error(`Benchmark manifest build failed: ${error.message}`);
  process.exitCode = 1;
});
