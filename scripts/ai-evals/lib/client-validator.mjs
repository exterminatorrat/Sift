import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

let validatorModule;

export function loadClientScanResultValidator(
  validatorPath = path.resolve("src/utils/scanResultValidation.ts")
) {
  validatorModule ??= compileValidator(validatorPath);
  return validatorModule;
}

function compileValidator(validatorPath) {
  const compiled = ts.transpileModule(fs.readFileSync(validatorPath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  if (/\brequire\s*\(/u.test(compiled)) {
    throw new Error("Client validator unexpectedly contains runtime imports after transpilation.");
  }

  const module = { exports: {} };
  const execute = new Function("exports", "module", compiled);
  execute(module.exports, module);
  return module.exports;
}
