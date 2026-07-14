import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  HumanReviewError,
  createReviewBundle,
  loadBenchmarkManifestBinding,
  readJsonFile,
  writeReviewBundle
} from "./index.mjs";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(MODULE_DIRECTORY, "../../..");

export function parseArguments(args) {
  const options = { input: null, manifest: null, outputDirectory: null, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--input") options.input = requireValue(args, ++index, argument);
    else if (argument === "--manifest") options.manifest = requireValue(args, ++index, argument);
    else if (argument === "--output-dir") options.outputDirectory = requireValue(args, ++index, argument);
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
  if (!options.input) throw new HumanReviewError("--input is required.", "missing_input");
  const inputPath = path.resolve(options.input);
  const artifact = readJsonFile(inputPath, "attempt artifact");
  const benchmarkPackage = options.manifest
    ? loadBenchmarkManifestBinding(path.resolve(options.manifest))
    : null;
  const bundle = createReviewBundle(artifact, {
    sourceDirectory: path.dirname(inputPath),
    benchmarkManifest: benchmarkPackage?.document ?? null,
    benchmarkBinding: benchmarkPackage?.binding ?? null
  });
  const outputDirectory = path.resolve(
    options.outputDirectory ?? path.join(REPOSITORY_ROOT, "output", "ai-evals", "human-review", bundle.template.reviewSetId)
  );
  const written = writeReviewBundle(bundle, outputDirectory);
  console.log(`Prepared blinded human review ${bundle.template.reviewSetId}.`);
  console.log(`Items: ${bundle.template.items.length}`);
  console.log(`Question-intent items: ${bundle.key.coverage.questionIntentItems}`);
  if (!bundle.key.coverage.reviewLineageBound) {
    console.log(
      "Human release gate: blocked (use an attempt artifact and --manifest bound to the same frozen holdout lineage)."
    );
  }
  console.log(`Reviewer template: ${written.templatePath}`);
  console.log(`Keep separate from reviewers: ${written.keyPath}`);
  return { bundle, ...written };
}

function requireValue(args, index, option) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new HumanReviewError(`${option} requires a value.`, "missing_argument_value");
  return value;
}

function printUsage() {
  console.log(`Usage:
  node scripts/ai-evals/human-review/generate.mjs --input <attempt-artifact.json> [--manifest <benchmark.json>] [--output-dir <directory>]

Default output:
  output/ai-evals/human-review/<deterministic-review-id>/`);
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error(`Human review preparation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
