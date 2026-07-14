import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = path.join(root, "docs", "ai-evals", "multi-page-cases.json");
const riskLevels = ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed"];
const requiredScenarios = new Set([
  "page_2_direct_allergen",
  "benign_and_severe_pages",
  "repeated_dish_deduplication",
  "one_poor_page_among_readable",
  "cropped_page",
  "partial_glare_page",
  "non_english_menu",
  "max_four_page_path"
]);
const requiredLanguages = [
  "English",
  "German",
  "Italian",
  "Japanese",
  "Simplified Chinese",
  "Spanish",
  "Thai"
];
const requiredAllergens = [
  "Dairy",
  "Mustard",
  "Peanut",
  "Sesame",
  "Shellfish",
  "Soy",
  "Sulfites"
];

assert.ok(fs.existsSync(manifestPath), `Missing generated manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.status, "development_diagnostic");
assert.equal(manifest.evidenceBoundary?.holdout, false);
assert.equal(manifest.evidenceBoundary?.releaseAccuracyClaim, false);
assert.ok(Array.isArray(manifest.cases));
assert.equal(manifest.cases.length, 8, "The corpus must contain exactly eight cases.");

const caseIds = manifest.cases.map((testCase) => testCase.id);
assert.equal(new Set(caseIds).size, 8, "Case IDs must be unique.");

const allPaths = [];
const coveredScenarios = new Set();
const coveredLanguages = new Set();
const coveredAllergens = new Set();
const coveredSeverities = new Set();
const coveredCrossContactSettings = new Set();

for (const testCase of manifest.cases) {
  assert.equal(testCase.sourceType, "controlled", `${testCase.id} must be controlled.`);
  assert.equal(testCase.split, "development_diagnostic", `${testCase.id} must remain diagnostic.`);
  assert.equal(testCase.diagnosticOnly, true, `${testCase.id} must be marked diagnostic-only.`);
  assert.ok(Array.isArray(testCase.imagePaths), `${testCase.id} imagePaths must be an array.`);
  assert.ok(
    testCase.imagePaths.length >= 2 && testCase.imagePaths.length <= 4,
    `${testCase.id} must contain two to four pages.`
  );
  assert.equal(
    testCase.imageSha256s.length,
    testCase.imagePaths.length,
    `${testCase.id} must hash every ordered page.`
  );
  assert.equal(
    testCase.expectations.pages.length,
    testCase.imagePaths.length,
    `${testCase.id} page expectation count must match imagePaths.`
  );

  coveredLanguages.add(testCase.language);
  for (const scenario of testCase.diagnosticScenarios) coveredScenarios.add(scenario);
  for (const allergy of testCase.profile.allergies) {
    assert.ok(["mild", "moderate", "severe"].includes(allergy.severity));
    assert.equal(typeof allergy.avoidCrossContact, "boolean");
    coveredAllergens.add(allergy.name);
    coveredSeverities.add(allergy.severity);
    coveredCrossContactSettings.add(allergy.avoidCrossContact);
  }

  const expectedPageNumbers = Array.from(
    { length: testCase.imagePaths.length },
    (_, index) => index + 1
  );
  assert.deepEqual(
    testCase.expectations.pages.map((page) => page.pageNumber),
    expectedPageNumbers,
    `${testCase.id} page numbers must be ordered and contiguous.`
  );

  testCase.imagePaths.forEach((relativePath, index) => {
    assert.match(
      relativePath,
      new RegExp(`^docs/ai-evals/images/multi-page/${testCase.id}-p${String(index + 1).padStart(2, "0")}\\.jpg$`),
      `${testCase.id} image paths must encode their page order.`
    );
    allPaths.push(relativePath);
    const absolutePath = path.join(root, ...relativePath.split("/"));
    assert.ok(fs.existsSync(absolutePath), `Missing generated image: ${relativePath}`);
    const bytes = fs.readFileSync(absolutePath);
    assert.ok(bytes.length > 10_000, `${relativePath} is unexpectedly small.`);
    assert.equal(bytes[0], 0xff, `${relativePath} is not a JPEG.`);
    assert.equal(bytes[1], 0xd8, `${relativePath} is not a JPEG.`);
    assert.equal(bytes.at(-2), 0xff, `${relativePath} is not a complete JPEG.`);
    assert.equal(bytes.at(-1), 0xd9, `${relativePath} is not a complete JPEG.`);
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      testCase.imageSha256s[index],
      `${relativePath} hash differs from the manifest.`
    );
  });

  const dishNames = testCase.expectations.dishes.map((dish) => dish.dishName);
  assert.equal(
    new Set(dishNames).size,
    dishNames.length,
    `${testCase.id} must contain one expectation per deduplicated dish.`
  );
  for (const dish of testCase.expectations.dishes) {
    assert.ok(dish.sourcePageNumbers.length > 0, `${testCase.id}/${dish.dishName} needs a source page.`);
    assert.deepEqual(
      dish.sourcePageNumbers,
      [...new Set(dish.sourcePageNumbers)].sort((left, right) => left - right),
      `${testCase.id}/${dish.dishName} source pages must be unique and ordered.`
    );
    for (const pageNumber of dish.sourcePageNumbers) {
      assert.ok(expectedPageNumbers.includes(pageNumber), `${testCase.id}/${dish.dishName} has an invalid page.`);
      assert.ok(
        testCase.expectations.pages[pageNumber - 1].dishNames.includes(dish.dishName),
        `${testCase.id}/${dish.dishName} is absent from its declared source page.`
      );
    }
    assertCanonicalRiskRange(dish.allowedRiskRange, `${testCase.id}/${dish.dishName}`);
  }

  assert.ok(["clear", "partially_clear", "poor"].includes(testCase.expected.readability));
  assert.ok(Array.isArray(testCase.expected.minimumRisks));
  assert.ok(Array.isArray(testCase.expected.benignDishes));
}

assert.equal(new Set(allPaths).size, allPaths.length, "Every generated image path must be unique.");
assert.ok(manifest.cases.some((testCase) => testCase.imagePaths.length === 4), "Four-page coverage is required.");
assert.deepEqual([...coveredLanguages].sort(), requiredLanguages, "Required language coverage changed.");
assert.deepEqual([...coveredAllergens].sort(), requiredAllergens, "Required allergen coverage changed.");
assert.deepEqual([...coveredSeverities].sort(), ["mild", "moderate", "severe"]);
assert.deepEqual([...coveredCrossContactSettings].sort(), [false, true]);
for (const scenario of requiredScenarios) {
  assert.ok(coveredScenarios.has(scenario), `Missing required scenario: ${scenario}`);
}

const pageTwoCase = caseForScenario("page_2_direct_allergen");
assert.ok(
  pageTwoCase.expectations.dishes.some(
    (dish) => dish.sourcePageNumbers.includes(2) && dish.evidenceLabel === "confirmed_visible"
  ),
  "The page-2 case must place direct allergen evidence on page 2."
);

const benignSevereCase = caseForScenario("benign_and_severe_pages");
assert.ok(
  benignSevereCase.expectations.pages.some((page) => page.contentLabels.includes("benign_only"))
);
assert.ok(
  benignSevereCase.expectations.pages.some((page) => page.contentLabels.includes("severe_risk_page"))
);

const repeatedCase = caseForScenario("repeated_dish_deduplication");
assert.ok(
  repeatedCase.expectations.dishes.some((dish) => dish.sourcePageNumbers.length > 1),
  "The deduplication case must merge a repeated dish into one multi-page expectation."
);

const poorCase = caseForScenario("one_poor_page_among_readable");
const poorReadabilities = poorCase.expectations.pages.flatMap((page) => page.readability.allowedValues);
assert.ok(poorReadabilities.includes("poor"), "The mixed-quality case needs one poor page.");
assert.ok(
  poorReadabilities.some((readability) => readability !== "poor"),
  "The mixed-quality case also needs readable pages."
);

const croppedCase = caseForScenario("cropped_page");
assert.ok(croppedCase.expectations.pages.some((page) => page.issues.includes("crop")));

const glareCase = caseForScenario("partial_glare_page");
assert.ok(
  glareCase.expectations.pages.some(
    (page) => page.issues.includes("partial_occlusion") && page.issues.includes("glare")
  )
);

const nonEnglishCases = manifest.cases.filter((testCase) => testCase.language !== "English");
assert.ok(nonEnglishCases.length >= 6, "The corpus must include substantial non-English coverage.");

console.log(
  `Multi-page corpus self-test passed: ${manifest.cases.length} cases, ${allPaths.length} ordered JPEG pages, ${coveredLanguages.size} languages.`
);

function caseForScenario(scenario) {
  const matches = manifest.cases.filter((testCase) => testCase.diagnosticScenarios.includes(scenario));
  assert.ok(matches.length > 0, `No case covers ${scenario}.`);
  return matches[0];
}

function assertCanonicalRiskRange(range, context) {
  assert.equal(range?.kind, "ordinal", `${context} risk range must be ordinal.`);
  const minimumIndex = riskLevels.indexOf(range.minimum);
  const maximumIndex = riskLevels.indexOf(range.maximum);
  assert.ok(minimumIndex >= 0, `${context} has an unknown minimum risk.`);
  assert.ok(maximumIndex >= minimumIndex, `${context} has an invalid risk range.`);
  assert.deepEqual(
    range.levels,
    riskLevels.slice(minimumIndex, maximumIndex + 1),
    `${context} risk levels must match its bounds.`
  );
}
