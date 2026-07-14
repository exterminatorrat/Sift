import assert from "node:assert/strict";
import fs from "node:fs";
import process from "node:process";

const DEFAULT_PATH = "docs/ai-evals/benchmark-v1/failure-registry.json";
const REQUIRED_CATEGORIES = [
  "vision",
  "prompt",
  "ontology",
  "policy",
  "contract",
  "translation",
  "provider_availability"
];

export function validateFailureRegistry(registry) {
  invariant(registry?.schemaVersion === "1.0.0", "Failure registry schemaVersion must be 1.0.0.");
  invariant(
    JSON.stringify(registry.categories) === JSON.stringify(REQUIRED_CATEGORIES),
    "Failure registry categories changed without a schema update."
  );
  invariant(Array.isArray(registry.failures), "Failure registry failures must be an array.");
  const ids = new Set();
  for (const failure of registry.failures) {
    invariant(/^FAIL-[0-9]{3}$/u.test(failure?.id), "Failure IDs must use FAIL-###.");
    invariant(!ids.has(failure.id), `Duplicate failure ${failure.id}.`);
    ids.add(failure.id);
    invariant(nonEmpty(failure.title), `${failure.id} title is required.`);
    invariant(REQUIRED_CATEGORIES.includes(failure.category), `${failure.id} category is invalid.`);
    invariant(["open", "resolved"].includes(failure.status), `${failure.id} status is invalid.`);
    invariant(Number.isFinite(Date.parse(failure.discoveredAt)), `${failure.id} discoveredAt is invalid.`);
    invariant(nonEmpty(failure.discoveredIn), `${failure.id} discoveredIn is required.`);
    invariant(Array.isArray(failure.caseIds) && failure.caseIds.length > 0, `${failure.id} needs regression or evidence cases.`);
    invariant(nonEmpty(failure.responsibleLayer), `${failure.id} responsibleLayer is required.`);
    invariant(typeof failure.holdoutRetirementRequired === "boolean", `${failure.id} holdout retirement flag is required.`);

    if (failure.status === "resolved") {
      const resolution = failure.resolution;
      invariant(resolution && typeof resolution === "object", `${failure.id} resolved failure needs resolution evidence.`);
      for (const field of [
        "summary",
        "fromVersion",
        "toVersion",
        "regressionPath",
        "targetedVerification",
        "fullVerification"
      ]) {
        invariant(nonEmpty(resolution[field]), `${failure.id} resolution.${field} is required.`);
      }
      invariant(resolution.fromVersion !== resolution.toVersion, `${failure.id} must increment the responsible version.`);
      invariant(fs.existsSync(resolution.regressionPath), `${failure.id} regressionPath does not exist.`);
    } else {
      invariant(failure.resolution === null, `${failure.id} open failure must not claim a resolution.`);
    }
  }
  return { failureCount: registry.failures.length, openCount: registry.failures.filter((item) => item.status === "open").length };
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const registryPath = process.argv[2] ?? DEFAULT_PATH;
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const result = validateFailureRegistry(registry);
assert.ok(result.failureCount >= result.openCount);
console.log(`Validated ${result.failureCount} reliability failures; ${result.openCount} remain open.`);
