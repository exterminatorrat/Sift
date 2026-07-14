import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  computeConfigFingerprints,
  readJsonFile,
  WorkbenchError,
  writeJsonAtomic
} from "./workbench.mjs";

export function parseFingerprintArguments(args) {
  const options = { runDirectory: null, write: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--write") {
      options.write = true;
      continue;
    }
    if (argument === "--run" || argument === "--run-dir") {
      const value = args[++index];
      if (value === undefined || value.startsWith("--")) {
        throw new WorkbenchError(`${argument} requires a directory.`, {
          code: "missing_run_directory"
        });
      }
      options.runDirectory = value;
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

export function main(args = process.argv.slice(2)) {
  const options = parseFingerprintArguments(args);
  if (options.help) {
    printUsage();
    return null;
  }
  if (!options.runDirectory) {
    throw new WorkbenchError("Provide a prepared run directory with --run <directory>.", {
      code: "missing_run_directory"
    });
  }

  const configPath = path.join(path.resolve(options.runDirectory), "config.json");
  const config = readJsonFile(configPath, "config.json");
  const fingerprints = computeConfigFingerprints(config);

  if (options.write) {
    writeJsonAtomic(configPath, { ...config, fingerprints });
    console.log(`Updated ${configPath}`);
  }
  console.log(JSON.stringify(fingerprints, null, 2));
  return fingerprints;
}

function printUsage() {
  console.log(`Usage:
  node scripts/ai-evals/manual-workbench/fingerprint.mjs --run <directory> [--write]

Without --write, prints the four canonical SHA-256 fingerprints.
With --write, atomically updates config.json.fingerprints.`);
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Fingerprint command failed: ${message}`);
    process.exitCode = 1;
  }
}
