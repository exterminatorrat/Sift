import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const INTAKE_PATH = "docs/ai-evals/benchmark-v1/real-world-source-candidates.json";
const HOLDOUT_SOURCE_PATH = "docs/ai-evals/images/holdout/source-cases.json";
const DEVELOPMENT_LICENSES_PATH = "docs/ai-evals/licensed-images.json";
const REQUIRED_LANGUAGES = [
  "Traditional Chinese",
  "Vietnamese",
  "Turkish",
  "Polish",
  "Indonesian",
  "Dutch"
];
const LICENSE_RULES = new Map([
  ["PD-1923", { licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-US-expired", attributionRequired: false }],
  ["PD-self", { licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-self", attributionRequired: false }],
  ["CC0", { licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", attributionRequired: false }],
  ["CC BY 3.0", { licenseUrl: "https://creativecommons.org/licenses/by/3.0/", attributionRequired: true }],
  ["CC BY 4.0", { licenseUrl: "https://creativecommons.org/licenses/by/4.0/", attributionRequired: true }],
  ["CC BY-SA 3.0", { licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", attributionRequired: true }],
  ["CC BY-SA 4.0", { licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", attributionRequired: true }]
]);
const LABEL_SIGNAL_PATTERN = /(?:low[_ -]?risk|ask[_ -]?staff|high[_ -]?risk|avoid[_ -]?unless|unclear|safe to eat|must remain|expected (?:risk|behavior|label)|target label|gold label)/iu;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  invariant(parsed.protocol === "https:", `${label} must use HTTPS.`);
  parsed.hash = "";
  parsed.search = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  const decodedPath = decodeURIComponent(parsed.pathname).replace(/\/$/u, "");
  return `${parsed.hostname}${decodedPath}`;
}

function assertExactKeys(value, allowedKeys, label) {
  invariant(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object.`);
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  invariant(unknownKeys.length === 0, `${label}.${unknownKeys[0]} is not an allowed source-intake field.`);
}

function normalizeCommonsFileTitle(value) {
  return decodeURIComponent(value)
    .replaceAll("_", " ")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("en-US");
}

function commonsFileTitle(value, kind, label) {
  const parsed = new URL(value);
  const decodedPath = decodeURIComponent(parsed.pathname);
  const prefix = kind === "page" ? "/wiki/File:" : "/wiki/Special:Redirect/file/";
  invariant(decodedPath.startsWith(prefix), `${label} is not a canonical Commons ${kind === "page" ? "file page" : "file redirect"}.`);
  const title = decodedPath.slice(prefix.length);
  invariant(title.length > 0 && !title.includes("/"), `${label} has an invalid Commons file title.`);
  return normalizeCommonsFileTitle(title);
}

function assertLabelBlindNote(value, label) {
  invariant(nonEmpty(value), `${label} is required.`);
  invariant(!LABEL_SIGNAL_PATTERN.test(value), `${label} contains benchmark-label guidance.`);
}

export function validateRealWorldSourceCandidates(intake, holdoutSource, developmentLicenses) {
  invariant(intake?.schemaVersion === "1.0.0", "Source intake schemaVersion must be 1.0.0.");
  invariant(intake?.intakeId === "sift-holdout-real-world-source-intake-v1", "Source intake ID is invalid.");
  invariant(
    intake?.status === "research_pending_rights_and_suitability_review",
    "Source intake must remain pending until independent rights and suitability review."
  );
  invariant(Number.isFinite(Date.parse(intake.metadataCheckedAt)), "Source intake metadataCheckedAt is invalid.");
  assertLabelBlindNote(intake.purpose, "Source intake purpose");
  invariant(
    JSON.stringify(intake.requiredLanguages) === JSON.stringify(REQUIRED_LANGUAGES),
    "Source intake must preserve the six predeclared holdout languages."
  );
  invariant(Array.isArray(intake.candidates) && intake.candidates.length === 6, "Source intake must contain six candidates.");
  invariant(Array.isArray(holdoutSource?.groups), "Holdout source groups are missing.");
  invariant(Array.isArray(holdoutSource?.cases), "Holdout source cases are missing.");
  invariant(Array.isArray(developmentLicenses), "Development license registry must be an array.");
  assertExactKeys(
    intake,
    ["schemaVersion", "intakeId", "status", "metadataCheckedAt", "purpose", "requiredLanguages", "candidates"],
    "intake"
  );

  const groupById = new Map(holdoutSource.groups.map((group) => [group.id, group]));
  const caseById = new Map(holdoutSource.cases.map((item) => [item.id, item]));
  const crossLanguageGroupByLanguage = new Map();
  for (const group of holdoutSource.groups) {
    const groupCases = group.caseIds.map((caseId) => caseById.get(caseId));
    const menuLanguage = groupCases[0]?.language;
    const isCrossLanguageGroup =
      REQUIRED_LANGUAGES.includes(menuLanguage) &&
      groupCases.length === 2 &&
      groupCases.every(
        (item) =>
          item?.language === menuLanguage &&
          item?.profile?.preferredLanguage === "English" &&
          item?.profile?.restaurantLanguage === menuLanguage
      );
    if (!isCrossLanguageGroup) continue;
    invariant(!crossLanguageGroupByLanguage.has(menuLanguage), `${menuLanguage} has multiple cross-language holdout groups.`);
    crossLanguageGroupByLanguage.set(menuLanguage, group.id);
  }
  invariant(crossLanguageGroupByLanguage.size === 6, "Holdout source must contain one cross-language group per required language.");
  const developmentUrls = new Set(
    developmentLicenses.map((item, index) => canonicalUrl(item?.source?.pageUrl, `Development source ${index + 1} pageUrl`))
  );
  const developmentTitles = new Set(
    developmentLicenses.map((item) => item?.source?.title?.trim().toLocaleLowerCase("en-US")).filter(Boolean)
  );
  const sourceIds = new Set();
  const languages = new Set();
  const sourceUrls = new Set();
  const downloadUrls = new Set();
  const sourceTitles = new Set();
  const replacementGroups = new Set();
  const replacementCases = new Set();

  for (const candidate of intake.candidates) {
    assertExactKeys(
      candidate,
      ["candidateSourceId", "language", "provenance", "license", "rightsReview", "researchScreen", "suitabilityReview", "proposedReplacement"],
      `Candidate ${candidate?.candidateSourceId ?? "unknown"}`
    );
    invariant(/^RW-[A-Z-]+-[0-9]{3}$/u.test(candidate?.candidateSourceId), "Candidate source IDs must use RW-...-###.");
    invariant(!sourceIds.has(candidate.candidateSourceId), `Duplicate source ID ${candidate.candidateSourceId}.`);
    sourceIds.add(candidate.candidateSourceId);
    invariant(REQUIRED_LANGUAGES.includes(candidate.language), `${candidate.candidateSourceId} language is invalid.`);
    invariant(!languages.has(candidate.language), `${candidate.language} has more than one intake candidate.`);
    languages.add(candidate.language);

    const provenance = candidate.provenance;
    assertExactKeys(
      provenance,
      ["sourceRepository", "sourceTitle", "sourceCreator", "sourcePageUrl", "downloadUrl", "observedDimensions", "observedMimeType"],
      `${candidate.candidateSourceId} provenance`
    );
    invariant(provenance?.sourceRepository === "Wikimedia Commons", `${candidate.candidateSourceId} source repository is invalid.`);
    for (const field of ["sourceTitle", "sourceCreator", "observedDimensions", "observedMimeType"]) {
      invariant(nonEmpty(provenance?.[field]), `${candidate.candidateSourceId} provenance.${field} is required.`);
    }
    invariant(/^\d+x\d+$/u.test(provenance.observedDimensions), `${candidate.candidateSourceId} dimensions are invalid.`);
    invariant(provenance.observedMimeType === "image/jpeg", `${candidate.candidateSourceId} MIME type must be image/jpeg.`);
    const sourceUrl = canonicalUrl(provenance.sourcePageUrl, `${candidate.candidateSourceId} sourcePageUrl`);
    const downloadUrl = canonicalUrl(provenance.downloadUrl, `${candidate.candidateSourceId} downloadUrl`);
    invariant(sourceUrl.startsWith("commons.wikimedia.org/wiki/File:"), `${candidate.candidateSourceId} must use a Commons file page.`);
    invariant(
      downloadUrl.startsWith("commons.wikimedia.org/wiki/Special:Redirect/file/"),
      `${candidate.candidateSourceId} must use a Commons file redirect for download.`
    );
    const sourceFileTitle = commonsFileTitle(provenance.sourcePageUrl, "page", `${candidate.candidateSourceId} sourcePageUrl`);
    const downloadFileTitle = commonsFileTitle(provenance.downloadUrl, "download", `${candidate.candidateSourceId} downloadUrl`);
    invariant(sourceFileTitle === downloadFileTitle, `${candidate.candidateSourceId} source page and download URL identify different Commons files.`);
    invariant(
      sourceFileTitle === normalizeCommonsFileTitle(provenance.sourceTitle),
      `${candidate.candidateSourceId} sourceTitle does not match its Commons file identity.`
    );
    invariant(!sourceUrls.has(sourceUrl), `${candidate.candidateSourceId} repeats a source page.`);
    invariant(!downloadUrls.has(downloadUrl), `${candidate.candidateSourceId} repeats a download URL.`);
    invariant(!developmentUrls.has(sourceUrl), `${candidate.candidateSourceId} overlaps the development image registry.`);
    sourceUrls.add(sourceUrl);
    downloadUrls.add(downloadUrl);
    const normalizedTitle = provenance.sourceTitle.trim().toLocaleLowerCase("en-US");
    invariant(!sourceTitles.has(normalizedTitle), `${candidate.candidateSourceId} repeats a source title.`);
    invariant(!developmentTitles.has(normalizedTitle), `${candidate.candidateSourceId} repeats a development source title.`);
    sourceTitles.add(normalizedTitle);

    const license = candidate.license;
    assertExactKeys(license, ["identifier", "licenseUrl", "attributionRequired", "notes"], `${candidate.candidateSourceId} license`);
    const licenseRule = LICENSE_RULES.get(license?.identifier);
    invariant(licenseRule, `${candidate.candidateSourceId} license identifier is unsupported.`);
    invariant(
      canonicalUrl(license.licenseUrl, `${candidate.candidateSourceId} licenseUrl`) ===
        canonicalUrl(licenseRule.licenseUrl, `${candidate.candidateSourceId} canonical licenseUrl`),
      `${candidate.candidateSourceId} license URL does not match ${license.identifier}.`
    );
    invariant(
      license.attributionRequired === licenseRule.attributionRequired,
      `${candidate.candidateSourceId} attribution flag does not match ${license.identifier}.`
    );
    assertLabelBlindNote(license.notes, `${candidate.candidateSourceId} license notes`);

    assertExactKeys(candidate.rightsReview, ["status", "reviewerId", "reviewedAt", "notes"], `${candidate.candidateSourceId} rightsReview`);
    invariant(candidate.rightsReview?.status === "pending", `${candidate.candidateSourceId} rights review must remain pending.`);
    invariant(candidate.rightsReview.reviewerId === null, `${candidate.candidateSourceId} cannot name an unrecorded rights reviewer.`);
    invariant(candidate.rightsReview.reviewedAt === null, `${candidate.candidateSourceId} cannot claim a rights review date.`);
    assertLabelBlindNote(candidate.rightsReview.notes, `${candidate.candidateSourceId} rights review notes`);
    assertExactKeys(
      candidate.researchScreen,
      ["status", "screenedAt", "evaluator", "disposition", "notes"],
      `${candidate.candidateSourceId} researchScreen`
    );
    invariant(
      candidate.researchScreen?.status === "completed_candidate_screen",
      `${candidate.candidateSourceId} must complete non-approval visual source screening.`
    );
    invariant(Number.isFinite(Date.parse(candidate.researchScreen.screenedAt)), `${candidate.candidateSourceId} screening date is invalid.`);
    invariant(
      candidate.researchScreen.evaluator === "Codex visual source screening",
      `${candidate.candidateSourceId} screening evaluator is invalid.`
    );
    invariant(
      candidate.researchScreen.disposition === "retained_for_independent_review",
      `${candidate.candidateSourceId} screening disposition is invalid.`
    );
    assertLabelBlindNote(candidate.researchScreen.notes, `${candidate.candidateSourceId} researchScreen.notes`);
    assertExactKeys(candidate.suitabilityReview, ["status", "notes"], `${candidate.candidateSourceId} suitabilityReview`);
    invariant(
      candidate.suitabilityReview?.status === "pending_visual_and_label_review",
      `${candidate.candidateSourceId} suitability review must remain pending.`
    );
    assertLabelBlindNote(candidate.suitabilityReview.notes, `${candidate.candidateSourceId} suitabilityReview.notes`);

    const replacement = candidate.proposedReplacement;
    assertExactKeys(
      replacement,
      ["groupId", "caseIds", "preserveExistingProfiles", "preserveExistingQualityVariants", "qualityVariants", "annotationStatus"],
      `${candidate.candidateSourceId} proposedReplacement`
    );
    invariant(!replacementGroups.has(replacement?.groupId), `${candidate.candidateSourceId} repeats a replacement group.`);
    replacementGroups.add(replacement.groupId);
    const group = groupById.get(replacement.groupId);
    invariant(group, `${candidate.candidateSourceId} replacement group does not exist.`);
    invariant(
      crossLanguageGroupByLanguage.get(candidate.language) === group.id,
      `${candidate.candidateSourceId} must replace its predeclared cross-language group.`
    );
    invariant(Array.isArray(group.caseIds) && group.caseIds.length === 2, `${replacement.groupId} must remain a two-case group.`);
    invariant(
      JSON.stringify(replacement.caseIds) === JSON.stringify(group.caseIds),
      `${candidate.candidateSourceId} must replace the complete group without changing case IDs.`
    );
    invariant(replacement.preserveExistingProfiles === true, `${candidate.candidateSourceId} must preserve existing profiles.`);
    invariant(
      replacement.preserveExistingQualityVariants === true,
      `${candidate.candidateSourceId} must preserve existing quality variants.`
    );
    invariant(replacement.annotationStatus === "not_started", `${candidate.candidateSourceId} cannot claim annotations.`);

    const sourceCases = group.caseIds.map((caseId) => {
      invariant(!replacementCases.has(caseId), `${candidate.candidateSourceId} repeats replacement case ${caseId}.`);
      replacementCases.add(caseId);
      const sourceCase = caseById.get(caseId);
      invariant(sourceCase, `${candidate.candidateSourceId} replacement case ${caseId} does not exist.`);
      invariant(sourceCase.groupId === group.id, `${caseId} does not belong to ${group.id}.`);
      invariant(sourceCase.language === candidate.language, `${candidate.candidateSourceId} language does not match ${caseId}.`);
      invariant(sourceCase.sourceType === "controlled", `${caseId} is no longer an untouched controlled candidate.`);
      invariant(sourceCase.reviewStatus === "pending", `${caseId} review status must remain pending during source intake.`);
      return sourceCase;
    });
    invariant(
      JSON.stringify(replacement.qualityVariants) === JSON.stringify(sourceCases.map((item) => item.qualityVariant)),
      `${candidate.candidateSourceId} quality variants do not match the proposed cases.`
    );
  }

  invariant(
    JSON.stringify([...languages].sort()) === JSON.stringify([...REQUIRED_LANGUAGES].sort()),
    "Source intake does not cover each required language exactly once."
  );
  invariant(replacementGroups.size === 6, "Source intake must propose six independent whole-group replacements.");
  invariant(replacementCases.size === 12, "Source intake must propose exactly 12 replacement cases.");

  return {
    candidateCount: intake.candidates.length,
    languageCount: languages.size,
    proposedGroupCount: replacementGroups.size,
    proposedCaseCount: replacementCases.size
  };
}

function loadInputs() {
  return {
    intake: JSON.parse(fs.readFileSync(INTAKE_PATH, "utf8")),
    holdoutSource: JSON.parse(fs.readFileSync(HOLDOUT_SOURCE_PATH, "utf8")),
    developmentLicenses: JSON.parse(fs.readFileSync(DEVELOPMENT_LICENSES_PATH, "utf8"))
  };
}

function expectRejection(inputs, mutate, expectedMessage) {
  const changed = structuredClone(inputs);
  mutate(changed);
  assert.throws(
    () => validateRealWorldSourceCandidates(changed.intake, changed.holdoutSource, changed.developmentLicenses),
    new RegExp(expectedMessage, "u")
  );
}

function runSelfTest(inputs) {
  const result = validateRealWorldSourceCandidates(inputs.intake, inputs.holdoutSource, inputs.developmentLicenses);
  assert.deepEqual(result, {
    candidateCount: 6,
    languageCount: 6,
    proposedGroupCount: 6,
    proposedCaseCount: 12
  });
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[1].provenance.sourcePageUrl = intake.candidates[0].provenance.sourcePageUrl;
      intake.candidates[1].provenance.downloadUrl = intake.candidates[0].provenance.downloadUrl;
      intake.candidates[1].provenance.sourceTitle = intake.candidates[0].provenance.sourceTitle;
    },
    "repeats a source page"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].rightsReview.status = "approved";
    },
    "rights review must remain pending"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].researchScreen.status = "not_started";
    },
    "must complete non-approval visual source screening"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].expectedOutput = {};
    },
    "not an allowed source-intake field"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].expectedRiskLevel = "high_risk";
    },
    "not an allowed source-intake field"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].researchScreen.notes = "This item must remain unclear.";
    },
    "contains benchmark-label guidance"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.purpose = "Expected risk label: high risk.";
    },
    "contains benchmark-label guidance"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].license.notes = "Target label is low risk.";
    },
    "contains benchmark-label guidance"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].rightsReview.notes = "This must remain unclear.";
    },
    "contains benchmark-label guidance"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].provenance.downloadUrl = intake.candidates[1].provenance.downloadUrl;
    },
    "identify different Commons files"
  );
  expectRejection(
    inputs,
    ({ intake }) => {
      intake.candidates[0].proposedReplacement.caseIds = ["I-103", "I-105"];
    },
    "replace the complete group"
  );
  console.log("Real-world source intake self-test passed: duplicate, premature-approval, label-leakage, and partial-group mutations fail closed.");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const inputs = loadInputs();
  if (process.argv[2] === "--self-test") {
    runSelfTest(inputs);
  } else {
    invariant(process.argv.length === 2, `Usage: node ${process.argv[1]} [--self-test]`);
    const result = validateRealWorldSourceCandidates(inputs.intake, inputs.holdoutSource, inputs.developmentLicenses);
    console.log(
      `Validated ${result.candidateCount} pending real-world source candidates across ${result.languageCount} languages and ${result.proposedCaseCount} proposed cases. No rights, suitability, or labels are approved.`
    );
  }
}
