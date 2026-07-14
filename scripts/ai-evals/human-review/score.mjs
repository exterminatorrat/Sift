import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  HumanReviewError,
  readJsonFile,
  scoreReview,
  writeJsonAtomic
} from "./index.mjs";

export function parseArguments(args) {
  const options = { template: null, key: null, output: null, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--template") options.template = requireValue(args, ++index, argument);
    else if (argument === "--key") options.key = requireValue(args, ++index, argument);
    else if (argument === "--output") options.output = requireValue(args, ++index, argument);
    else throw new HumanReviewError(`Unknown argument ${argument}.`, "unknown_argument");
  }
  return options;
}

export function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (options.help) {
    printUsage();
    return null;
  }
  if (!options.template || !options.key) {
    throw new HumanReviewError("--template and --key are required.", "missing_input");
  }
  const templatePath = path.resolve(options.template);
  const keyPath = path.resolve(options.key);
  const report = scoreReview(
    readJsonFile(templatePath, "filled review template"),
    readJsonFile(keyPath, "review key")
  );
  const outputPath = path.resolve(options.output ?? path.join(path.dirname(templatePath), "review-report.json"));
  writeJsonAtomic(outputPath, report);
  console.log(`Scored human review ${report.reviewSetId}.`);
  console.log(`Coverage: ${report.coverage.reviewedItems}/${report.coverage.expectedItems}`);
  console.log(`Visible-text hallucination: ${formatRate(report.visibleTextHallucination.rate)}`);
  console.log(`Translation fidelity: ${formatRate(report.translationFidelity.overall.fidelityRate)}`);
  console.log(`Question-intent pass rate: ${formatRate(report.questionIntent.passRate)}`);
  console.log(`Human release gate: ${report.releaseGate.passed ? "passed" : "blocked"}`);
  if (!report.releaseGate.passed) {
    console.log(`Gate failures: ${report.releaseGate.failures.join(", ")}`);
  }
  console.log(`Report: ${outputPath}`);
  return { report, outputPath };
}

function requireValue(args, index, option) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new HumanReviewError(`${option} requires a value.`, "missing_argument_value");
  return value;
}

function formatRate(value) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function printUsage() {
  console.log(`Usage:
  node scripts/ai-evals/human-review/score.mjs --template <filled-review-template.json> --key <review-key.json> [--output <report.json>]`);
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error(`Human review scoring failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
