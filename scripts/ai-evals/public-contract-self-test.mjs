import assert from "node:assert/strict";
import fs from "node:fs";

import { loadClientScanResultValidator } from "./lib/client-validator.mjs";
import { validatePublicScanResult } from "../../supabase/functions/_shared/ai/public-validation.mjs";

const fixture = JSON.parse(fs.readFileSync("docs/ai-evals/sample-output.json", "utf8"));
const client = loadClientScanResultValidator();

assert.equal(validatePublicScanResult(fixture), null);
assert.equal(client.validateScanResult(fixture).ok, true);

const withoutOptionalMessage = clone(fixture);
delete withoutOptionalMessage.restaurantMessage;
assert.equal(validatePublicScanResult(withoutOptionalMessage), null);
assert.equal(client.validateScanResult(withoutOptionalMessage).ok, true);

const missingQuestions = clone(fixture);
missingQuestions.dishes[0].questionsToAsk = [];
assert.match(validatePublicScanResult(missingQuestions), /too_few_items/);
assert.equal(client.validateScanResult(missingQuestions).ok, false);

const bannedAssurance = clone(fixture);
bannedAssurance.scanSummary.summary = "This dish is safe to eat.";
assert.equal(validatePublicScanResult(bannedAssurance), "banned_safety_language");
assert.equal(client.validateScanResult(bannedAssurance).ok, false);

const contradictoryLowRisk = clone(fixture);
contradictoryLowRisk.scanSummary.overallRisk = "low_risk";
contradictoryLowRisk.dishes[0].riskLevel = "low_risk";
assert.equal(validatePublicScanResult(contradictoryLowRisk), "low_risk_contradicts_reported_concerns");
assert.equal(client.validateScanResult(contradictoryLowRisk).ok, false);

const poorLowRisk = clone(fixture);
poorLowRisk.scanSummary.overallRisk = "unclear";
poorLowRisk.dishes[0].riskLevel = "low_risk";
poorLowRisk.dishes[0].crossContactConcerns = [];
poorLowRisk.dishes[0].riskBasis = ["image_uncertain"];
poorLowRisk.imageQuality = {
  readability: "poor",
  issues: ["Blur obscures ingredient text."],
  needsRetake: true
};
poorLowRisk.pageAssessments[0] = {
  pageNumber: 1,
  readability: "poor",
  issues: ["Blur obscures ingredient text."]
};
assert.equal(validatePublicScanResult(poorLowRisk), "poor_image_contains_low_risk_dish");
assert.equal(client.validateScanResult(poorLowRisk).ok, false);

const invalidTimestamp = clone(fixture);
invalidTimestamp.createdAt = "not-a-date";
assert.equal(validatePublicScanResult(invalidTimestamp), "invalid_created_at");
const normalizedTimestamp = client.validateScanResult(invalidTimestamp);
assert.equal(normalizedTimestamp.ok, true);
assert.notEqual(normalizedTimestamp.value.createdAt, "not-a-date");

const unsafeReference = clone(fixture);
unsafeReference.transparency.sourceReferences[0].uri = "javascript:alert(1)";
assert.equal(validatePublicScanResult(unsafeReference), "invalid_transparency_source_uri");
const filteredReference = client.validateScanResult(unsafeReference);
assert.equal(filteredReference.ok, true);
assert.deepEqual(filteredReference.value.transparency.sourceReferences, []);

const additionalProperty = clone(fixture);
additionalProperty.unexpected = "not part of the wire contract";
assert.match(validatePublicScanResult(additionalProperty), /additional_property/);
const sanitizedAdditionalProperty = client.validateScanResult(additionalProperty);
assert.equal(sanitizedAdditionalProperty.ok, true);
assert.equal("unexpected" in sanitizedAdditionalProperty.value, false);

const outOfOrderPages = clone(fixture);
outOfOrderPages.pageAssessments[0].pageNumber = 2;
assert.equal(validatePublicScanResult(outOfOrderPages), "page_assessments_out_of_order");
assert.equal(client.validateScanResult(outOfOrderPages).ok, false);

const uncoveredReadablePage = clone(fixture);
uncoveredReadablePage.dishes[0].sourcePageNumbers = [];
assert.equal(validatePublicScanResult(uncoveredReadablePage), "invalid_dish_source_pages");
assert.equal(client.validateScanResult(uncoveredReadablePage).ok, false);

const aggregateReadabilityMismatch = clone(fixture);
aggregateReadabilityMismatch.pageAssessments[0].readability = "partially_clear";
assert.equal(validatePublicScanResult(aggregateReadabilityMismatch), "aggregate_page_readability_mismatch");
assert.equal(client.validateScanResult(aggregateReadabilityMismatch).ok, false);

console.log("Public wire contract self-tests passed: the server fails closed and the client rejects or sanitizes compatibility inputs, including page provenance.");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
