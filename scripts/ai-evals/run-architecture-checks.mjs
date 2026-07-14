import { spawnSync } from "node:child_process";
import process from "node:process";

const checks = [
  ["configuration and provider contract", ["scripts/ai-evals/configuration-self-test.mjs"]],
  ["public wire contract", ["scripts/ai-evals/public-contract-self-test.mjs"]],
  ["allergen ontology language metadata", ["scripts/ai-evals/ontology-self-test.mjs"]],
  ["Edge Function wire configuration", ["scripts/ai-evals/edge-function-wire-self-test.mjs"]],
  ["deterministic risk policy", ["scripts/ai-evals/risk-policy-self-test.mjs"]],
  ["benchmark scoring", ["scripts/ai-evals/scoring-self-test.mjs"]],
  ["deterministic image preprocessing", ["scripts/ai-evals/preprocessing-self-test.mjs"]],
  ["multi-page development corpus", ["scripts/ai-evals/multi-page-corpus-self-test.mjs"]],
  ["manual workbench", ["scripts/ai-evals/manual-workbench/self-test.mjs"]],
  ["manual holdout preparation guard", ["scripts/ai-evals/manual-preparation-self-test.mjs"]],
  ["manual result scoring", ["scripts/ai-evals/score-manual-run-self-test.mjs"]],
  ["factor-isolated experiment plan", ["scripts/ai-evals/prepare-experiment-matrix.mjs"]],
  ["live harness and holdout gate", ["scripts/run-live-ai-evals.mjs", "self-test"]],
  ["development manifest", ["scripts/ai-evals/build-benchmark-manifest.mjs", "--check"]],
  ["candidate holdout manifest", ["scripts/ai-evals/build-holdout-manifest.mjs", "--check"]],
  ["mixed-source holdout builder", ["scripts/ai-evals/build-holdout-manifest.mjs", "--self-test"]],
  ["real-world source intake", ["scripts/ai-evals/validate-real-world-source-candidates.mjs", "--self-test"]],
  ["real-world source acquisition", ["scripts/ai-evals/acquire-real-world-source-candidates.mjs", "--self-test"]],
  ["holdout promotion guard", ["scripts/ai-evals/promote-holdout.mjs", "self-test"]],
  ["blinded human adjudication", ["scripts/ai-evals/human-review/self-test.mjs"]],
  ["failure registry", ["scripts/ai-evals/validate-failure-registry.mjs"]]
];

for (const [label, args] of checks) {
  console.log(`\n[AI architecture] ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAI architecture checks passed.");
