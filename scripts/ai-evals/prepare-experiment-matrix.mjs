import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_PLAN_PATH = "docs/ai-evals/benchmark-v1/experiments-v1.json";
const DEFAULT_OUTPUT_ROOT = "output/ai-evals/experiments";

export function validateExperimentPlan(plan, developmentManifest) {
  invariant(isRecord(plan), "Experiment plan must be an object.");
  invariant(plan.schemaVersion === "1.0.0", "Experiment plan schemaVersion must be 1.0.0.");
  invariant(plan.status === "planned_unexecuted", "Experiment plan must remain planned_unexecuted until evidence exists.");
  invariant(typeof plan.version === "string" && plan.version.length > 0, "Experiment plan version is required.");
  invariant(Array.isArray(plan.cases) && plan.cases.length > 0, "Experiment plan cases are required.");
  invariant(new Set(plan.cases).size === plan.cases.length, "Experiment plan cases must be unique.");
  invariant(Array.isArray(developmentManifest?.cases), "Development manifest cases are required.");

  const developmentIds = new Set(developmentManifest.cases.map((item) => item.id));
  for (const caseId of plan.cases) {
    invariant(developmentIds.has(caseId), `Experiment case ${caseId} is not in the development split.`);
  }

  invariant(Array.isArray(plan.experiments) && plan.experiments.length > 0, "Experiments are required.");
  const experimentIds = new Set();
  for (const experiment of plan.experiments) {
    invariant(isRecord(experiment), "Each experiment must be an object.");
    invariant(typeof experiment.id === "string" && experiment.id.length > 0, "Experiment id is required.");
    invariant(!experimentIds.has(experiment.id), `Duplicate experiment id ${experiment.id}.`);
    experimentIds.add(experiment.id);
    invariant(typeof experiment.factor === "string" && experiment.factor.length > 0, `Experiment ${experiment.id} factor is required.`);
    invariant(Array.isArray(experiment.arms) && experiment.arms.length === 2, `Experiment ${experiment.id} must have two arms.`);
    const [control, treatment] = experiment.arms;
    validateArm(control, `${experiment.id} control`);
    validateArm(treatment, `${experiment.id} treatment`);
    invariant(control.id.startsWith("control-"), `Experiment ${experiment.id} first arm must be the control.`);
    invariant(treatment.id.startsWith("treatment-"), `Experiment ${experiment.id} second arm must be the treatment.`);
    const changedFields = differencePaths(control, treatment).filter((item) => item !== "id");
    invariant(
      changedFields.length === 1 && changedFields[0] === experiment.factor,
      `Experiment ${experiment.id} must change only ${experiment.factor}; found ${changedFields.join(", ") || "none"}.`
    );
  }

  const expectedCalls = plan.experiments.length * 2 * plan.cases.length;
  invariant(plan.callBudget?.maximumCalls === expectedCalls, "Experiment call budget does not match the declared matrix.");
  invariant(expectedCalls <= 120, "Experiment matrix exceeds the 120-call safety cap.");
  return { expectedCalls, experimentIds: [...experimentIds] };
}

function validateArm(arm, label) {
  invariant(isRecord(arm), `${label} must be an object.`);
  invariant(typeof arm.id === "string" && arm.id.length > 0, `${label} id is required.`);
  invariant(Number.isInteger(arm.preprocessing?.maxLongEdge), `${label} maxLongEdge must be an integer.`);
  invariant(arm.preprocessing.maxLongEdge >= 512 && arm.preprocessing.maxLongEdge <= 4096, `${label} maxLongEdge is out of range.`);
  invariant(Number.isInteger(arm.preprocessing?.jpegQuality), `${label} jpegQuality must be an integer.`);
  invariant(arm.preprocessing.jpegQuality >= 40 && arm.preprocessing.jpegQuality <= 95, `${label} jpegQuality is out of range.`);
  invariant(["low", "medium"].includes(arm.generation?.thinkingLevel), `${label} thinkingLevel is invalid.`);
  invariant(
    ["MEDIA_RESOLUTION_UNSPECIFIED", "MEDIA_RESOLUTION_HIGH"].includes(arm.generation?.mediaResolution),
    `${label} mediaResolution is invalid.`
  );
  invariant(
    ["instruction_first", "image_first"].includes(arm.generation?.promptContentOrder),
    `${label} promptContentOrder is invalid.`
  );
}

function differencePaths(left, right, prefix = "") {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  const differences = [];
  for (const key of [...keys].sort()) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    const leftValue = left?.[key];
    const rightValue = right?.[key];
    if (isRecord(leftValue) && isRecord(rightValue)) {
      differences.push(...differencePaths(leftValue, rightValue, nextPath));
    } else if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
      differences.push(nextPath);
    }
  }
  return differences;
}

export function prepareExperimentMatrix({
  planPath = DEFAULT_PLAN_PATH,
  outputRoot = DEFAULT_OUTPUT_ROOT,
  experimentId = "all",
  execute = false
} = {}) {
  const absolutePlanPath = path.resolve(planPath);
  const plan = readJson(absolutePlanPath);
  const developmentManifestPath = path.resolve(plan.sourceManifest);
  const developmentManifest = readJson(developmentManifestPath);
  const validation = validateExperimentPlan(plan, developmentManifest);
  const experiments = experimentId === "all"
    ? plan.experiments
    : plan.experiments.filter((item) => item.id === experimentId);
  invariant(experiments.length > 0, `Unknown experiment ${experimentId}.`);

  const commands = [];
  for (const experiment of experiments) {
    for (const arm of experiment.arms) {
      const runId = `${plan.version}-${experiment.id}-${arm.id}`;
      const armRoot = path.resolve(outputRoot, plan.version, experiment.id, arm.id);
      const preprocessedRoot = path.join(armRoot, "preprocessed");
      const preparedRoot = path.resolve("output/ai-evals/manual-prepared", runId);
      const preprocessingVersion = `benchmark-jpeg-${arm.preprocessing.maxLongEdge}-q${arm.preprocessing.jpegQuality}-v1`;
      const preprocessingArgs = [
        "scripts/prepare-ai-eval-images.mjs",
        "--manifest", plan.sourceManifest,
        "--output", relativeToRepository(preprocessedRoot),
        "--max-long-edge", String(arm.preprocessing.maxLongEdge),
        "--jpeg-quality", String(arm.preprocessing.jpegQuality),
        "--version", preprocessingVersion
      ];
      const preparationArgs = [
        "scripts/ai-evals/prepare-manual-run.mjs",
        "--run-id", runId,
        "--manifest", plan.sourceManifest,
        "--preprocessed-manifest", relativeToRepository(path.join(preprocessedRoot, "manifest.json")),
        "--cases", plan.cases.join(","),
        "--model", plan.model,
        "--thinking", arm.generation.thinkingLevel,
        "--media-resolution", arm.generation.mediaResolution,
        "--content-order", arm.generation.promptContentOrder,
        "--output", relativeToRepository(preparedRoot)
      ];
      commands.push({ experimentId: experiment.id, armId: arm.id, runId, preprocessingArgs, preparationArgs });
      if (execute) {
        runNode(preprocessingArgs);
        runNode(preparationArgs);
      }
    }
  }

  return { plan, validation, commands };
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: "utf8", stdio: "inherit" });
  invariant(!result.error, `Could not run ${args.join(" ")}: ${result.error?.message}`);
  invariant(result.status === 0, `Command failed (${result.status}): node ${args.join(" ")}`);
}

function relativeToRepository(value) {
  return path.relative(process.cwd(), value).split(path.sep).join("/");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function parseOptions(args) {
  const options = { execute: false, experimentId: "all", planPath: DEFAULT_PLAN_PATH, outputRoot: DEFAULT_OUTPUT_ROOT };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--execute") {
      options.execute = true;
      continue;
    }
    if (["--experiment", "--plan", "--output"].includes(argument)) {
      const value = args[index + 1];
      invariant(value !== undefined && !value.startsWith("--"), `${argument} requires a value.`);
      if (argument === "--experiment") options.experimentId = value;
      if (argument === "--plan") options.planPath = value;
      if (argument === "--output") options.outputRoot = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument ${argument}.`);
  }
  return options;
}

export function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  const result = prepareExperimentMatrix(options);
  console.log(
    `${options.execute ? "Prepared" : "Validated"} ${result.commands.length} experiment arms ` +
    `(${result.validation.expectedCalls} planned model calls).`
  );
  for (const command of result.commands) {
    console.log(`${command.experimentId}/${command.armId}: ${command.runId}`);
  }
  return result;
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;
if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error(`Experiment preparation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
