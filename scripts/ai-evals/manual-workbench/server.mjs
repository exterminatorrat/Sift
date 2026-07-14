import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { startWorkbench, WorkbenchError } from "./workbench.mjs";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(MODULE_DIRECTORY, "../../..");
const DEFAULT_OUTPUT_ROOT = path.join(REPOSITORY_ROOT, "output", "ai-evals", "manual");

export function parseServerArguments(args) {
  const options = {
    runDirectory: null,
    pass: 1,
    port: 4317,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--run" || argument === "--run-dir") {
      options.runDirectory = requireValue(args, ++index, argument);
      continue;
    }
    if (argument === "--pass") {
      options.pass = parsePositiveInteger(requireValue(args, ++index, argument), "--pass");
      continue;
    }
    if (argument === "--port") {
      options.port = parsePositiveInteger(requireValue(args, ++index, argument), "--port");
      if (options.port > 65535) {
        throw new WorkbenchError("--port must be between 1 and 65535.", {
          code: "invalid_port"
        });
      }
      continue;
    }
    if (!argument.startsWith("-") && options.runDirectory === null) {
      options.runDirectory = argument;
      continue;
    }
    throw new WorkbenchError(`Unknown argument ${argument}.`, { code: "unknown_argument" });
  }

  return options;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseServerArguments(args);
  if (options.help) {
    printUsage();
    return null;
  }
  if (!options.runDirectory) {
    throw new WorkbenchError("Provide a prepared run directory with --run <directory>.", {
      code: "missing_run_directory"
    });
  }

  const instance = await startWorkbench({
    runDirectory: options.runDirectory,
    pass: options.pass,
    port: options.port,
    outputRoot: DEFAULT_OUTPUT_ROOT
  });
  const status = instance.store.status();

  console.log("Sift manual AI eval workbench is ready.");
  console.log(`URL: ${instance.url}`);
  console.log(`Run: ${status.runId}`);
  console.log(`Pass: ${status.pass}`);
  console.log(`Progress: ${status.completedCases}/${status.totalCases}`);
  console.log(`Output: ${status.outputDirectory}`);
  console.log("Network: loopback only; the workbench performs no outbound requests.");

  let stopping = false;
  const stop = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`Stopping after ${signal}.`);
    try {
      await instance.close();
    } catch (error) {
      console.error("Could not stop the workbench cleanly:", error);
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
  return instance;
}

function requireValue(args, index, option) {
  const value = args[index];
  if (value === undefined || value.startsWith("--")) {
    throw new WorkbenchError(`${option} requires a value.`, { code: "missing_argument_value" });
  }
  return value;
}

function parsePositiveInteger(value, option) {
  if (!/^\d+$/.test(value)) {
    throw new WorkbenchError(`${option} must be a positive integer.`, {
      code: "invalid_integer_argument"
    });
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new WorkbenchError(`${option} must be a positive integer.`, {
      code: "invalid_integer_argument"
    });
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/ai-evals/manual-workbench/server.mjs --run <directory> [--pass 1] [--port 4317]

The server always binds to 127.0.0.1 and writes responses under:
  output/ai-evals/manual/<runId>`);
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Manual workbench failed: ${message}`);
    process.exitCode = 1;
  });
}
