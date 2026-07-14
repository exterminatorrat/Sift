import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadAndValidateManualScoringEvidence } from "../lib/manual-evidence.mjs";

export const WORKBENCH_VERSION = 1;
export const FINGERPRINT_KEYS = ["model", "prompt", "schema", "config"];
export const DEFAULT_BODY_LIMIT_BYTES = 6 * 1024 * 1024;
const MAX_PAGES_PER_CASE = 4;
const EXECUTION_METRIC_KEYS = ["latencyMs", "inputTokens", "outputTokens", "thinkingTokens"];

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIRECTORY = path.join(MODULE_DIRECTORY, "public");
const IMAGE_CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);
const STATIC_FILES = new Map([
  ["/", { name: "index.html", contentType: "text/html; charset=utf-8" }],
  ["/app.js", { name: "app.js", contentType: "text/javascript; charset=utf-8" }],
  ["/styles.css", { name: "styles.css", contentType: "text/css; charset=utf-8" }]
]);

export class WorkbenchError extends Error {
  constructor(message, { status = 400, code = "workbench_error", details = undefined } = {}) {
    super(message);
    this.name = "WorkbenchError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function canonicalJson(value) {
  if (value === null) return "null";

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new WorkbenchError("Cannot fingerprint a non-finite JSON number.", {
          code: "invalid_fingerprint_source"
        });
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object": {
      const entries = Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
      return `{${entries.join(",")}}`;
    }
    default:
      throw new WorkbenchError(`Cannot fingerprint JSON value of type ${typeof value}.`, {
        code: "invalid_fingerprint_source"
      });
  }
}

export function fingerprintJson(value) {
  const digest = crypto.createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
  return `sha256:${digest}`;
}

export function computeConfigFingerprints(config) {
  validateConfigIdentityFields(config);
  const configWithoutFingerprints = structuredClone(config);
  delete configWithoutFingerprints.fingerprints;

  return {
    model: fingerprintJson(config.model),
    prompt: fingerprintJson(config.prompt),
    schema: fingerprintJson(config.schema),
    config: fingerprintJson(configWithoutFingerprints)
  };
}

export function readJsonFile(filePath, label = filePath) {
  let source;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new WorkbenchError(`Could not read ${label}: ${errorMessage(error)}`, {
      code: "file_read_failed"
    });
  }

  try {
    return JSON.parse(stripBom(source));
  } catch (error) {
    throw new WorkbenchError(`${label} is not valid JSON: ${errorMessage(error)}`, {
      code: "invalid_json_file"
    });
  }
}

export function writeJsonAtomic(filePath, value, { exclusive = false } = {}) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  if (exclusive && fs.existsSync(filePath)) {
    throw new WorkbenchError(`Refusing to replace existing file ${filePath}.`, {
      status: 409,
      code: "immutable_file_exists"
    });
  }

  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString("hex")}.tmp`
  );
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  let descriptor;

  try {
    descriptor = fs.openSync(temporaryPath, "wx", 0o600);
    fs.writeFileSync(descriptor, serialized, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;

    if (exclusive && fs.existsSync(filePath)) {
      throw new WorkbenchError(`Refusing to replace existing file ${filePath}.`, {
        status: 409,
        code: "immutable_file_exists"
      });
    }

    fs.renameSync(temporaryPath, filePath);
    fsyncDirectoryBestEffort(directory);
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // The original write error is more useful.
      }
    }
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      // A stale temp file is ignored by the loader and does not affect checkpoints.
    }
    throw error;
  }
}

export function loadPreparedRun(runDirectory, { requireFingerprints = true } = {}) {
  const directory = path.resolve(runDirectory);
  assertDirectory(directory, "Prepared run directory");

  const configPath = path.join(directory, "config.json");
  const config = readJsonFile(configPath, "config.json");
  validateConfig(config);

  const computedFingerprints = computeConfigFingerprints(config);
  const fingerprints = validateDeclaredFingerprints(
    config.fingerprints,
    computedFingerprints,
    requireFingerprints
  );
  const imageBaseDirectory = resolveImageBaseDirectory(directory, config.imageBaseDirectory);
  const casesDirectory = path.join(directory, "cases");
  assertDirectory(casesDirectory, "Prepared cases directory");

  const caseFiles = fs.readdirSync(casesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));

  if (caseFiles.length === 0) {
    throw new WorkbenchError("Prepared run must contain at least one cases/*.json file.", {
      code: "missing_cases"
    });
  }

  const cases = [];
  const caseById = new Map();
  const scoringSourceCases = [];
  for (const caseFile of caseFiles) {
    const casePath = path.join(casesDirectory, caseFile);
    const parsed = readJsonFile(casePath, `cases/${caseFile}`);
    const entries = Array.isArray(parsed) ? parsed : [parsed];

    if (entries.length === 0) {
      throw new WorkbenchError(`cases/${caseFile} must not be an empty array.`, {
        code: "invalid_case_file"
      });
    }

    for (let index = 0; index < entries.length; index += 1) {
      const sourceLabel = entries.length === 1
        ? `cases/${caseFile}`
        : `cases/${caseFile}[${index}]`;
      const preparedCase = normalizePreparedCase(entries[index], {
        sourceLabel,
        imageBaseDirectory
      });
      scoringSourceCases.push(entries[index]);

      if (caseById.has(preparedCase.id)) {
        throw new WorkbenchError(`Duplicate case ID ${preparedCase.id} in ${sourceLabel}.`, {
          code: "duplicate_case_id"
        });
      }

      cases.push(preparedCase);
      caseById.set(preparedCase.id, preparedCase);
    }
  }

  const caseSetFingerprint = fingerprintJson(cases.map((item) => ({
    id: item.id,
    inputFingerprint: item.inputFingerprint
  })));
  const scoringEvidence = loadAndValidateManualScoringEvidence({
    runDirectory: directory,
    config,
    preparedCases: scoringSourceCases
  });

  return {
    directory,
    configPath,
    config,
    runId: config.runId,
    fingerprints,
    modelLabel: modelLabel(config.model),
    expectedPasses: config.executionPlan.expectedPasses,
    freshSessionReminder: typeof config.freshSessionReminder === "string" && config.freshSessionReminder.trim()
      ? config.freshSessionReminder.trim()
      : "Start a fresh Google AI Studio chat before each case, then keep the model and settings unchanged.",
    cases,
    caseById,
    caseSetFingerprint,
    scoringEvidence,
    scoringManifestFingerprint: scoringEvidence.scoringManifestFingerprint
  };
}

export class OutputStore {
  constructor({ preparedRun, pass, outputRoot }) {
    if (!Number.isInteger(pass) || pass < 1) {
      throw new WorkbenchError("Pass must be a positive integer.", { code: "invalid_pass" });
    }
    if (pass > preparedRun.expectedPasses) {
      throw new WorkbenchError(
        `Pass ${pass} exceeds the prepared run's expected pass count of ${preparedRun.expectedPasses}.`,
        { code: "invalid_pass" }
      );
    }

    this.preparedRun = preparedRun;
    this.pass = pass;
    this.outputRoot = path.resolve(outputRoot);
    this.runOutputDirectory = path.join(this.outputRoot, preparedRun.runId);
    this.passDirectory = path.join(this.runOutputDirectory, `pass-${String(pass).padStart(3, "0")}`);
    this.responsesDirectory = path.join(this.passDirectory, "responses");
    this.manifestPath = path.join(this.runOutputDirectory, "manifest.json");
    this.checkpointPath = path.join(this.passDirectory, "checkpoint.json");
    this.completed = new Map();

    fs.mkdirSync(this.responsesDirectory, { recursive: true });
    this.assertOrCreateManifest();
    this.assertCheckpointIdentity();
    this.loadCompletedResponses();
    this.writeCheckpoint();
  }

  assertOrCreateManifest() {
    const nextManifest = {
      formatVersion: WORKBENCH_VERSION,
      runId: this.preparedRun.runId,
      createdAt: new Date().toISOString(),
      sourceRunDirectory: this.preparedRun.directory,
      fingerprints: this.preparedRun.fingerprints,
      caseSetFingerprint: this.preparedRun.caseSetFingerprint,
      scoringManifestFingerprint: this.preparedRun.scoringManifestFingerprint,
      expectedPasses: this.preparedRun.expectedPasses,
      cases: this.preparedRun.cases.map((item) => ({
        caseId: item.id,
        inputFingerprint: item.inputFingerprint
      }))
    };

    if (!fs.existsSync(this.manifestPath)) {
      writeJsonAtomic(this.manifestPath, nextManifest, { exclusive: true });
      return;
    }

    const existing = readJsonFile(this.manifestPath, "existing manual-run manifest");
    assertRecord(existing, "Existing manual-run manifest");
    if (existing.runId !== nextManifest.runId) {
      throw identityError("run ID", nextManifest.runId, existing.runId);
    }
    assertMatchingFingerprints(nextManifest.fingerprints, existing.fingerprints, "Existing manual-run manifest");
    if (existing.caseSetFingerprint !== nextManifest.caseSetFingerprint) {
      throw identityError("case-set fingerprint", nextManifest.caseSetFingerprint, existing.caseSetFingerprint);
    }
    if (existing.scoringManifestFingerprint !== nextManifest.scoringManifestFingerprint) {
      throw identityError(
        "scoring-manifest fingerprint",
        nextManifest.scoringManifestFingerprint,
        existing.scoringManifestFingerprint
      );
    }
    if (existing.expectedPasses !== nextManifest.expectedPasses) {
      throw identityError("expected pass count", nextManifest.expectedPasses, existing.expectedPasses);
    }
  }

  assertCheckpointIdentity() {
    if (!fs.existsSync(this.checkpointPath)) return;

    const checkpoint = readJsonFile(this.checkpointPath, "existing pass checkpoint");
    assertRecord(checkpoint, "Existing pass checkpoint");
    if (checkpoint.runId !== this.preparedRun.runId) {
      throw identityError("checkpoint run ID", this.preparedRun.runId, checkpoint.runId);
    }
    if (checkpoint.pass !== this.pass) {
      throw identityError("checkpoint pass", this.pass, checkpoint.pass);
    }
    assertMatchingFingerprints(this.preparedRun.fingerprints, checkpoint.fingerprints, "Existing pass checkpoint");
    if (checkpoint.caseSetFingerprint !== this.preparedRun.caseSetFingerprint) {
      throw identityError(
        "checkpoint case-set fingerprint",
        this.preparedRun.caseSetFingerprint,
        checkpoint.caseSetFingerprint
      );
    }
    if (checkpoint.scoringManifestFingerprint !== this.preparedRun.scoringManifestFingerprint) {
      throw identityError(
        "checkpoint scoring-manifest fingerprint",
        this.preparedRun.scoringManifestFingerprint,
        checkpoint.scoringManifestFingerprint
      );
    }
  }

  loadCompletedResponses() {
    const responseFiles = fs.readdirSync(this.responsesDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => entry.name)
      .sort();

    for (const responseFile of responseFiles) {
      const responsePath = path.join(this.responsesDirectory, responseFile);
      const record = readJsonFile(responsePath, `saved response ${responseFile}`);
      this.validateSavedResponse(record, responseFile);
      if (this.completed.has(record.caseId)) {
        throw new WorkbenchError(`Multiple saved responses exist for case ${record.caseId} in pass ${this.pass}.`, {
          code: "duplicate_saved_response"
        });
      }
      this.completed.set(record.caseId, record);
    }
  }

  validateSavedResponse(record, responseFile) {
    assertRecord(record, `Saved response ${responseFile}`);
    if (record.runId !== this.preparedRun.runId || record.pass !== this.pass) {
      throw new WorkbenchError(`Saved response ${responseFile} belongs to a different run or pass.`, {
        code: "saved_response_identity_mismatch"
      });
    }

    const preparedCase = this.preparedRun.caseById.get(record.caseId);
    if (!preparedCase) {
      throw new WorkbenchError(`Saved response ${responseFile} references unknown case ${record.caseId}.`, {
        code: "unknown_saved_case"
      });
    }
    assertMatchingFingerprints(this.preparedRun.fingerprints, record.fingerprints, `Saved response ${responseFile}`);
    if (record.caseInputFingerprint !== preparedCase.inputFingerprint) {
      throw identityError(
        `saved case ${record.caseId} input fingerprint`,
        preparedCase.inputFingerprint,
        record.caseInputFingerprint
      );
    }
    if (record.scoringManifestFingerprint !== this.preparedRun.scoringManifestFingerprint) {
      throw identityError(
        `saved case ${record.caseId} scoring-manifest fingerprint`,
        this.preparedRun.scoringManifestFingerprint,
        record.scoringManifestFingerprint
      );
    }
    if (typeof record.rawResponse !== "string") {
      throw new WorkbenchError(`Saved response ${responseFile} is missing rawResponse.`, {
        code: "invalid_saved_response"
      });
    }
    if (record.freshSessionAcknowledged !== true || !isFiniteTimestamp(record.freshSessionAcknowledgedAt)) {
      throw new WorkbenchError(`Saved response ${responseFile} is missing its per-case fresh-session acknowledgement.`, {
        code: "invalid_saved_response"
      });
    }

    const parsed = parseRawJson(record.rawResponse);
    const executionMetrics = normalizeExecutionMetrics(record.executionMetrics, {
      label: `Saved response ${responseFile} executionMetrics`
    });
    const responseFingerprint = fingerprintJson(parsed.value);
    if (record.responseFingerprint !== responseFingerprint || fingerprintJson(record.response) !== responseFingerprint) {
      throw identityError(
        `saved response ${record.caseId} content fingerprint`,
        responseFingerprint,
        record.responseFingerprint
      );
    }
    const submissionFingerprint = fingerprintJson({ response: parsed.value, executionMetrics });
    if (record.submissionFingerprint !== submissionFingerprint) {
      throw identityError(
        `saved response ${record.caseId} submission fingerprint`,
        submissionFingerprint,
        record.submissionFingerprint
      );
    }
  }

  status() {
    const completedCaseIds = this.preparedRun.cases
      .filter((item) => this.completed.has(item.id))
      .map((item) => item.id);
    const nextCase = this.preparedRun.cases.find((item) => !this.completed.has(item.id));

    return {
      ok: true,
      service: "sift-manual-ai-eval-workbench",
      version: WORKBENCH_VERSION,
      runId: this.preparedRun.runId,
      pass: this.pass,
      expectedPasses: this.preparedRun.expectedPasses,
      totalCases: this.preparedRun.cases.length,
      completedCases: completedCaseIds.length,
      remainingCases: this.preparedRun.cases.length - completedCaseIds.length,
      completedCaseIds,
      nextCaseId: nextCase?.id ?? null,
      outputDirectory: this.runOutputDirectory,
      fingerprints: this.preparedRun.fingerprints,
      caseSetFingerprint: this.preparedRun.caseSetFingerprint,
      scoringManifestFingerprint: this.preparedRun.scoringManifestFingerprint
    };
  }

  queue() {
    return this.preparedRun.cases.map((item, index) => {
      const saved = this.completed.get(item.id);
      return {
        id: item.id,
        name: item.name,
        position: index + 1,
        completed: Boolean(saved),
        submittedAt: saved?.submittedAt ?? null
      };
    });
  }

  caseDetail(caseId) {
    const preparedCase = this.preparedRun.caseById.get(caseId);
    if (!preparedCase) {
      throw new WorkbenchError(`Unknown case ${caseId}.`, {
        status: 404,
        code: "case_not_found"
      });
    }
    const saved = this.completed.get(caseId);
    const encodedCaseId = encodeURIComponent(preparedCase.id);
    const images = preparedCase.images.map((image, index) => ({
      pageNumber: index + 1,
      label: image.label,
      imageUrl: `/api/cases/${encodedCaseId}/images/${index + 1}`
    }));

    return {
      id: preparedCase.id,
      name: preparedCase.name,
      profile: preparedCase.profile,
      images,
      ...(images.length === 1 ? {
        imageUrl: `/api/cases/${encodedCaseId}/image`,
        menuPageLabel: images[0].label
      } : {}),
      promptContentOrder: preparedCase.promptContentOrder,
      userPrompt: preparedCase.userPrompt,
      completed: Boolean(saved),
      submittedAt: saved?.submittedAt ?? null,
      rawResponse: saved?.rawResponse ?? null,
      freshSessionAcknowledgedAt: saved?.freshSessionAcknowledgedAt ?? null,
      executionMetrics: saved?.executionMetrics ?? null
    };
  }

  image(caseId, pageNumber = 1) {
    const preparedCase = this.preparedRun.caseById.get(caseId);
    if (!preparedCase) {
      throw new WorkbenchError(`Unknown case ${caseId}.`, {
        status: 404,
        code: "case_not_found"
      });
    }
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > preparedCase.images.length) {
      throw new WorkbenchError(`Case ${caseId} has no image page ${pageNumber}.`, {
        status: 404,
        code: "case_image_not_found"
      });
    }
    return preparedCase.images[pageNumber - 1];
  }

  submit({ caseId, pass, fingerprints, rawJson, freshSessionAcknowledged, executionMetrics }) {
    if (pass !== this.pass) {
      throw new WorkbenchError(`Submission pass ${pass} does not match active pass ${this.pass}.`, {
        status: 412,
        code: "pass_mismatch"
      });
    }
    assertMatchingFingerprints(this.preparedRun.fingerprints, fingerprints, "Submission", 412);

    const preparedCase = this.preparedRun.caseById.get(caseId);
    if (!preparedCase) {
      throw new WorkbenchError(`Unknown case ${caseId}.`, {
        status: 404,
        code: "case_not_found"
      });
    }
    if (freshSessionAcknowledged !== true) {
      throw new WorkbenchError(`Case ${caseId} requires a fresh AI Studio session acknowledgement.`, {
        status: 412,
        code: "fresh_session_required"
      });
    }

    const parsed = parseRawJson(rawJson);
    const normalizedExecutionMetrics = normalizeExecutionMetrics(executionMetrics, {
      label: "Submission executionMetrics"
    });
    const responseFingerprint = fingerprintJson(parsed.value);
    const submissionFingerprint = fingerprintJson({
      response: parsed.value,
      executionMetrics: normalizedExecutionMetrics
    });
    const existing = this.completed.get(caseId);
    if (existing) {
      if (existing.submissionFingerprint === submissionFingerprint) {
        return {
          duplicate: true,
          caseId,
          submittedAt: existing.submittedAt,
          status: this.status()
        };
      }
      throw new WorkbenchError(`Case ${caseId} already has a different response for pass ${this.pass}.`, {
        status: 409,
        code: "case_already_completed"
      });
    }

    const submittedAt = new Date().toISOString();
    const record = {
      formatVersion: WORKBENCH_VERSION,
      runId: this.preparedRun.runId,
      pass: this.pass,
      caseId,
      submittedAt,
      fingerprints: this.preparedRun.fingerprints,
      caseInputFingerprint: preparedCase.inputFingerprint,
      scoringManifestFingerprint: this.preparedRun.scoringManifestFingerprint,
      responseFingerprint,
      submissionFingerprint,
      freshSessionAcknowledged: true,
      freshSessionAcknowledgedAt: submittedAt,
      executionMetrics: normalizedExecutionMetrics,
      rawResponse: parsed.raw,
      response: parsed.value
    };
    const responsePath = path.join(this.responsesDirectory, responseFilename(caseId));
    writeJsonAtomic(responsePath, record, { exclusive: true });
    this.completed.set(caseId, record);
    this.writeCheckpoint();

    return {
      duplicate: false,
      caseId,
      submittedAt: record.submittedAt,
      status: this.status()
    };
  }

  writeCheckpoint() {
    const status = this.status();
    const checkpoint = {
      formatVersion: WORKBENCH_VERSION,
      runId: this.preparedRun.runId,
      pass: this.pass,
      updatedAt: new Date().toISOString(),
      fingerprints: this.preparedRun.fingerprints,
      caseSetFingerprint: this.preparedRun.caseSetFingerprint,
      scoringManifestFingerprint: this.preparedRun.scoringManifestFingerprint,
      totalCases: status.totalCases,
      completedCases: status.completedCases,
      remainingCases: status.remainingCases,
      completedCaseIds: status.completedCaseIds,
      nextCaseId: status.nextCaseId
    };
    writeJsonAtomic(this.checkpointPath, checkpoint);
  }
}

export function createWorkbenchServer({
  runDirectory,
  pass = 1,
  outputRoot,
  publicDirectory = DEFAULT_PUBLIC_DIRECTORY,
  bodyLimitBytes = DEFAULT_BODY_LIMIT_BYTES
}) {
  const preparedRun = loadPreparedRun(runDirectory);
  const store = new OutputStore({ preparedRun, pass, outputRoot });
  const staticAssets = loadStaticAssets(publicDirectory);

  const server = http.createServer(async (request, response) => {
    let requestPath = "/";
    try {
      if (!isAllowedHostHeader(request.headers.host)) {
        throw new WorkbenchError("Requests must use a localhost Host header.", {
          status: 400,
          code: "invalid_host"
        });
      }

      const url = new URL(request.url ?? "/", "http://localhost");
      requestPath = url.pathname;

      if (request.method === "GET" && STATIC_FILES.has(requestPath)) {
        const asset = staticAssets.get(requestPath);
        sendBuffer(response, 200, asset.body, asset.contentType);
        return;
      }

      if (request.method === "GET" && requestPath === "/favicon.ico") {
        sendEmpty(response, 204);
        return;
      }

      if (request.method === "GET" && ["/healthz", "/api/health"].includes(requestPath)) {
        sendJson(response, 200, {
          ok: true,
          service: "sift-manual-ai-eval-workbench",
          version: WORKBENCH_VERSION
        });
        return;
      }

      if (request.method === "GET" && ["/status", "/api/status"].includes(requestPath)) {
        sendJson(response, 200, store.status());
        return;
      }

      if (request.method === "GET" && requestPath === "/api/bootstrap") {
        sendJson(response, 200, {
          run: {
            runId: preparedRun.runId,
            pass,
            expectedPasses: preparedRun.expectedPasses,
            modelLabel: preparedRun.modelLabel,
            freshSessionReminder: preparedRun.freshSessionReminder,
            fingerprints: preparedRun.fingerprints,
            caseSetFingerprint: preparedRun.caseSetFingerprint,
            scoringManifestFingerprint: preparedRun.scoringManifestFingerprint
          },
          status: store.status(),
          queue: store.queue()
        });
        return;
      }

      const pagedImageMatch = requestPath.match(/^\/api\/cases\/([^/]+)\/images\/(\d+)$/);
      if (request.method === "GET" && pagedImageMatch) {
        const caseId = decodePathPart(pagedImageMatch[1]);
        const image = store.image(caseId, Number(pagedImageMatch[2]));
        sendBuffer(response, 200, fs.readFileSync(image.path), image.contentType);
        return;
      }

      const imageMatch = requestPath.match(/^\/api\/cases\/([^/]+)\/image$/);
      if (request.method === "GET" && imageMatch) {
        const caseId = decodePathPart(imageMatch[1]);
        const image = store.image(caseId);
        sendBuffer(response, 200, fs.readFileSync(image.path), image.contentType);
        return;
      }

      const caseMatch = requestPath.match(/^\/api\/cases\/([^/]+)$/);
      if (request.method === "GET" && caseMatch) {
        sendJson(response, 200, store.caseDetail(decodePathPart(caseMatch[1])));
        return;
      }

      if (request.method === "POST" && requestPath === "/api/responses") {
        assertSameOrigin(request);
        const body = await readRequestJson(request, bodyLimitBytes);
        assertRecord(body, "Submission body");
        const result = store.submit({
          caseId: body.caseId,
          pass: body.pass,
          fingerprints: body.fingerprints,
          rawJson: body.rawJson,
          freshSessionAcknowledged: body.freshSessionAcknowledged,
          executionMetrics: body.executionMetrics
        });
        sendJson(response, result.duplicate ? 200 : 201, result);
        return;
      }

      if (["GET", "POST"].includes(request.method ?? "")) {
        throw new WorkbenchError(`No route for ${request.method} ${requestPath}.`, {
          status: 404,
          code: "not_found"
        });
      }

      throw new WorkbenchError(`Method ${request.method ?? "unknown"} is not allowed.`, {
        status: 405,
        code: "method_not_allowed"
      });
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const normalized = normalizeHttpError(error);
      if (normalized.status >= 500) {
        console.error(`Manual workbench request failed for ${request.method ?? "unknown"} ${requestPath}:`, error);
      }
      sendJson(response, normalized.status, {
        ok: false,
        error: normalized.message,
        code: normalized.code,
        ...(normalized.details === undefined ? {} : { details: normalized.details })
      });
    }
  });

  server.on("clientError", (_error, socket) => {
    if (socket.writable) {
      socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    }
  });

  return { server, preparedRun, store };
}

export async function startWorkbench(options) {
  const host = "127.0.0.1";
  const port = options.port ?? 4317;
  const instance = createWorkbenchServer(options);

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      instance.server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      instance.server.off("error", onError);
      resolve();
    };
    instance.server.once("error", onError);
    instance.server.once("listening", onListening);
    instance.server.listen(port, host);
  });

  const address = instance.server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return {
    ...instance,
    host,
    port: actualPort,
    url: `http://${host}:${actualPort}`,
    close: () => closeServer(instance.server)
  };
}

export function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close((error) => error ? reject(error) : resolve());
  });
}

function validateConfig(config) {
  assertRecord(config, "config.json");
  if (config.formatVersion !== undefined && config.formatVersion !== WORKBENCH_VERSION) {
    throw new WorkbenchError(`config.json formatVersion must be ${WORKBENCH_VERSION}.`, {
      code: "unsupported_format_version"
    });
  }
  if (typeof config.runId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(config.runId)) {
    throw new WorkbenchError(
      "config.json runId must be 1-128 characters using letters, numbers, dot, underscore, or hyphen.",
      { code: "invalid_run_id" }
    );
  }
  validateConfigIdentityFields(config);
  if (
    !isRecord(config.executionPlan) ||
    !Number.isInteger(config.executionPlan.expectedPasses) ||
    config.executionPlan.expectedPasses < 1 ||
    config.executionPlan.expectedPasses > 10
  ) {
    throw new WorkbenchError("config.json executionPlan.expectedPasses must be an integer from 1 to 10.", {
      code: "invalid_execution_plan"
    });
  }
  if (config.imageBaseDirectory !== undefined && typeof config.imageBaseDirectory !== "string") {
    throw new WorkbenchError("config.json imageBaseDirectory must be a string when present.", {
      code: "invalid_image_base"
    });
  }
  if (config.freshSessionReminder !== undefined && typeof config.freshSessionReminder !== "string") {
    throw new WorkbenchError("config.json freshSessionReminder must be a string when present.", {
      code: "invalid_fresh_session_reminder"
    });
  }
}

function validateConfigIdentityFields(config) {
  assertRecord(config, "config.json");
  for (const key of ["model", "prompt", "schema"]) {
    if (!Object.hasOwn(config, key) || config[key] === null) {
      throw new WorkbenchError(`config.json must define ${key}.`, {
        code: "missing_config_identity"
      });
    }
  }
}

function validateDeclaredFingerprints(declared, computed, required) {
  if (declared === undefined && !required) return computed;
  if (!isRecord(declared)) {
    throw new WorkbenchError(
      "config.json must include fingerprints for model, prompt, schema, and config. Run fingerprint.mjs --write after preparing the run.",
      { code: "missing_fingerprints" }
    );
  }

  const normalized = {};
  const mismatches = [];
  for (const key of FINGERPRINT_KEYS) {
    try {
      normalized[key] = normalizeFingerprint(declared[key]);
      if (normalized[key] !== computed[key]) mismatches.push(key);
    } catch {
      mismatches.push(key);
    }
  }

  if (mismatches.length > 0) {
    throw new WorkbenchError(
      `config.json fingerprint mismatch: ${mismatches.join(", ")}. Re-prepare the run instead of mixing configurations.`,
      {
        status: 412,
        code: "config_fingerprint_mismatch",
        details: { mismatches }
      }
    );
  }
  return normalized;
}

function normalizePreparedCase(value, { sourceLabel, imageBaseDirectory }) {
  assertRecord(value, sourceLabel);
  if (typeof value.id !== "string" || !value.id.trim() || value.id.length > 200) {
    throw new WorkbenchError(`${sourceLabel} must define a non-empty id no longer than 200 characters.`, {
      code: "invalid_case_id"
    });
  }
  if (!isRecord(value.profile)) {
    throw new WorkbenchError(`${sourceLabel} must define profile as a JSON object.`, {
      code: "invalid_case_profile"
    });
  }
  if (typeof value.userPrompt !== "string" || !value.userPrompt.trim()) {
    throw new WorkbenchError(`${sourceLabel} must define a non-empty userPrompt string.`, {
      code: "invalid_case_prompt"
    });
  }
  if (value.promptContentOrder !== "instruction_first" && value.promptContentOrder !== "image_first") {
    throw new WorkbenchError(
      `${sourceLabel} promptContentOrder must be instruction_first or image_first.`,
      { code: "invalid_prompt_content_order" }
    );
  }

  const imageSet = readPreparedImageSet(value, sourceLabel);
  const images = imageSet.specs.map((imageSpec, index) => normalizePreparedImage(imageSpec, {
    sourceLabel: `${sourceLabel} image page ${index + 1}`,
    imageBaseDirectory
  }));
  const imagePathIdentities = images.map((image) => (
    process.platform === "win32" ? image.path.toLowerCase() : image.path
  ));
  if (new Set(imagePathIdentities).size !== imagePathIdentities.length) {
    throw new WorkbenchError(`${sourceLabel} contains duplicate image paths.`, {
      code: "duplicate_case_image"
    });
  }

  const id = value.id.trim();
  const name = `Evaluation case ${id}`;
  const profile = structuredClone(value.profile);
  const promptContentOrder = value.promptContentOrder;
  const userPrompt = value.userPrompt;
  const inputFingerprint = imageSet.legacy
    ? fingerprintJson({
        id,
        imageFingerprint: images[0].fingerprint,
        profile,
        menuPageLabel: images[0].label,
        promptContentOrder,
        userPrompt
      })
    : fingerprintJson({
        id,
        images: images.map((image) => ({
          imageFingerprint: image.fingerprint,
          imageContentType: image.contentType,
          label: image.label
        })),
        profile,
        promptContentOrder,
        userPrompt
      });

  // Only these fields can reach the browser. Expected/scoring fields are never retained here.
  return {
    id,
    name,
    profile,
    promptContentOrder,
    userPrompt,
    images,
    imagePath: images[0].path,
    imageContentType: images[0].contentType,
    imageFingerprint: images[0].fingerprint,
    imageSchemaVersion: imageSet.legacy ? 1 : 2,
    ...(images.length === 1 ? { menuPageLabel: images[0].label } : {}),
    inputFingerprint
  };
}

function readPreparedImageSet(value, sourceLabel) {
  const hasImages = Object.hasOwn(value, "images");
  const hasImagePaths = Object.hasOwn(value, "imagePaths");
  if (hasImages && hasImagePaths) {
    throw new WorkbenchError(`${sourceLabel} ambiguously defines images and imagePaths.`, {
      code: "ambiguous_case_images"
    });
  }
  if (!hasImages && !hasImagePaths) {
    const spec = readLegacyImageSpec(value, sourceLabel);
    if (typeof value.menuPageLabel !== "string" || !value.menuPageLabel.trim()) {
      throw new WorkbenchError(`${sourceLabel} must define a non-empty menuPageLabel string.`, {
        code: "invalid_menu_page_label"
      });
    }
    return {
      legacy: true,
      specs: [{ ...spec, label: value.menuPageLabel.trim() }]
    };
  }

  const field = hasImages ? "images" : "imagePaths";
  const rawImages = value[field];
  if (!Array.isArray(rawImages)) {
    throw new WorkbenchError(`${sourceLabel} ${field} must be an array.`, {
      code: "invalid_case_images"
    });
  }
  if (rawImages.length < 1 || rawImages.length > MAX_PAGES_PER_CASE) {
    throw new WorkbenchError(
      `${sourceLabel} must define 1-${MAX_PAGES_PER_CASE} image pages.`,
      { code: "invalid_case_image_count" }
    );
  }

  const labels = readOptionalPageArray(value, "menuPageLabels", rawImages.length, sourceLabel);
  const sha256s = readOptionalPageArray(value, "imageSha256s", rawImages.length, sourceLabel);
  const mimeTypes = readOptionalPageArray(value, "imageMimeTypes", rawImages.length, sourceLabel);
  const specs = rawImages.map((rawImage, index) => {
    const record = isRecord(rawImage) ? rawImage : null;
    const imagePath = typeof rawImage === "string" ? rawImage : record?.path;
    if (typeof imagePath !== "string" || !imagePath.trim()) {
      throw new WorkbenchError(`${sourceLabel} ${field}[${index}] must define a non-empty path.`, {
        code: "missing_case_image"
      });
    }
    const label = record?.label ?? labels?.[index] ?? defaultMenuPageLabel(index, rawImages.length);
    if (typeof label !== "string" || !label.trim()) {
      throw new WorkbenchError(`${sourceLabel} ${field}[${index}] must define a non-empty label.`, {
        code: "invalid_menu_page_label"
      });
    }
    return {
      path: imagePath.trim(),
      contentType: normalizeImageContentType(
        record?.mimeType ?? record?.imageMimeType ?? mimeTypes?.[index],
        `${sourceLabel} ${field}[${index}]`
      ),
      sha256: normalizeOptionalImageSha256(
        record?.sha256 ?? record?.imageSha256 ?? sha256s?.[index],
        `${sourceLabel} ${field}[${index}]`
      ),
      label: label.trim()
    };
  });

  const hasSingularPath = Object.hasOwn(value, "imagePath") || Object.hasOwn(value, "image");
  const compatibleSingle = (
    hasImages &&
    specs.length === 1 &&
    !Object.hasOwn(value, "image") &&
    typeof value.imagePath === "string" &&
    value.imagePath.trim() === specs[0].path
  );
  if (hasSingularPath && !compatibleSingle) {
    throw new WorkbenchError(`${sourceLabel} ambiguously defines singular and plural image fields.`, {
      code: "ambiguous_case_images"
    });
  }
  if (specs.length > 1 && (
    Object.hasOwn(value, "menuPageLabel") ||
    Object.hasOwn(value, "imageSha256") ||
    Object.hasOwn(value, "imageMimeType")
  )) {
    throw new WorkbenchError(`${sourceLabel} ambiguously defines singular metadata for multiple images.`, {
      code: "ambiguous_case_images"
    });
  }
  if (specs.length === 1) {
    if (
      value.menuPageLabel !== undefined &&
      (typeof value.menuPageLabel !== "string" || value.menuPageLabel.trim() !== specs[0].label)
    ) {
      throw new WorkbenchError(`${sourceLabel} menuPageLabel does not match images[0].label.`, {
        code: "ambiguous_case_images"
      });
    }
    const flatSha256 = normalizeOptionalImageSha256(value.imageSha256, sourceLabel);
    if (flatSha256 && specs[0].sha256 && flatSha256 !== specs[0].sha256) {
      throw new WorkbenchError(`${sourceLabel} imageSha256 does not match images[0].sha256.`, {
        code: "ambiguous_case_images"
      });
    }
    if (!specs[0].sha256) specs[0].sha256 = flatSha256;
  }
  return { legacy: false, specs };
}

function readLegacyImageSpec(value, sourceLabel) {
  if (typeof value.imagePath === "string" && value.imagePath.trim()) {
    return {
      path: value.imagePath.trim(),
      contentType: normalizeImageContentType(value.imageMimeType, sourceLabel)
    };
  }
  if (typeof value.image === "string" && value.image.trim()) {
    return {
      path: value.image.trim(),
      contentType: normalizeImageContentType(value.imageMimeType, sourceLabel)
    };
  }
  if (isRecord(value.image) && typeof value.image.path === "string" && value.image.path.trim()) {
    return {
      path: value.image.path.trim(),
      contentType: normalizeImageContentType(value.image.mimeType ?? value.imageMimeType, sourceLabel)
    };
  }
  throw new WorkbenchError(`${sourceLabel} must define imagePath or image.path.`, {
    code: "missing_case_image"
  });
}

function normalizePreparedImage(imageSpec, { sourceLabel, imageBaseDirectory }) {
  const imagePath = path.isAbsolute(imageSpec.path)
    ? path.resolve(imageSpec.path)
    : path.resolve(imageBaseDirectory, imageSpec.path);
  let imageStats;
  try {
    imageStats = fs.statSync(imagePath);
  } catch (error) {
    throw new WorkbenchError(`${sourceLabel} does not exist at ${imagePath}: ${errorMessage(error)}`, {
      code: "missing_case_image"
    });
  }
  if (!imageStats.isFile()) {
    throw new WorkbenchError(`${sourceLabel} path is not a file: ${imagePath}.`, {
      code: "invalid_case_image"
    });
  }

  const inferredContentType = IMAGE_CONTENT_TYPES.get(path.extname(imagePath).toLowerCase());
  const contentType = imageSpec.contentType ?? inferredContentType;
  if (!contentType || ![...IMAGE_CONTENT_TYPES.values()].includes(contentType)) {
    throw new WorkbenchError(
      `${sourceLabel} type must be AVIF, GIF, JPEG, PNG, or WebP (or provide a MIME type).`,
      { code: "unsupported_case_image" }
    );
  }

  const fingerprint = fingerprintFile(imagePath);
  const sha256 = fingerprint.slice("sha256:".length);
  if (imageSpec.sha256 && imageSpec.sha256 !== sha256) {
    throw new WorkbenchError(`${sourceLabel} SHA-256 does not match its file bytes.`, {
      status: 412,
      code: "case_image_fingerprint_mismatch"
    });
  }
  return {
    path: imagePath,
    contentType,
    fingerprint,
    sha256,
    label: imageSpec.label
  };
}

function readOptionalPageArray(value, key, expectedLength, sourceLabel) {
  if (!Object.hasOwn(value, key)) return undefined;
  if (!Array.isArray(value[key]) || value[key].length !== expectedLength) {
    throw new WorkbenchError(`${sourceLabel} ${key} must contain one entry per image page.`, {
      code: "invalid_case_images"
    });
  }
  return value[key];
}

function normalizeOptionalImageSha256(value, sourceLabel) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new WorkbenchError(`${sourceLabel} image SHA-256 must be a string.`, {
      code: "invalid_case_image_fingerprint"
    });
  }
  const normalized = value.trim().toLowerCase().replace(/^sha256:/, "");
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new WorkbenchError(`${sourceLabel} image SHA-256 must be a 64-character hex digest.`, {
      code: "invalid_case_image_fingerprint"
    });
  }
  return normalized;
}

function defaultMenuPageLabel(index, imageCount) {
  return `Menu page ${index + 1} of ${imageCount}. Preserve this page order when reading the menu.`;
}

function normalizeImageContentType(value, sourceLabel) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new WorkbenchError(`${sourceLabel} imageMimeType must be a string.`, {
      code: "invalid_case_image_type"
    });
  }
  return value.toLowerCase() === "image/jpg" ? "image/jpeg" : value.toLowerCase();
}

function resolveImageBaseDirectory(runDirectory, configuredBase) {
  const value = configuredBase === undefined || configuredBase === "" ? "." : configuredBase;
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(runDirectory, value);
}

function assertMatchingFingerprints(expected, received, label, status = 412) {
  const mismatches = [];
  if (!isRecord(received)) {
    mismatches.push(...FINGERPRINT_KEYS);
  } else {
    for (const key of FINGERPRINT_KEYS) {
      try {
        if (normalizeFingerprint(received[key]) !== expected[key]) mismatches.push(key);
      } catch {
        mismatches.push(key);
      }
    }
  }
  if (mismatches.length > 0) {
    throw new WorkbenchError(`${label} fingerprint mismatch: ${mismatches.join(", ")}.`, {
      status,
      code: "fingerprint_mismatch",
      details: { mismatches }
    });
  }
}

function normalizeFingerprint(value) {
  if (typeof value !== "string") {
    throw new WorkbenchError("Fingerprint must be a string.", { code: "invalid_fingerprint" });
  }
  const normalized = value.trim().toLowerCase();
  if (/^[a-f0-9]{64}$/.test(normalized)) return `sha256:${normalized}`;
  if (/^sha256:[a-f0-9]{64}$/.test(normalized)) return normalized;
  throw new WorkbenchError("Fingerprint must be a SHA-256 hex digest.", { code: "invalid_fingerprint" });
}

function fingerprintFile(filePath) {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  return `sha256:${digest}`;
}

function normalizeExecutionMetrics(value, { label = "executionMetrics" } = {}) {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new WorkbenchError(`${label} must be an object when present.`, {
      code: "invalid_execution_metrics"
    });
  }

  const unexpectedKeys = Object.keys(value).filter((key) => !EXECUTION_METRIC_KEYS.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new WorkbenchError(`${label} contains unsupported fields: ${unexpectedKeys.join(", ")}.`, {
      code: "invalid_execution_metrics"
    });
  }

  const normalized = {};
  for (const key of EXECUTION_METRIC_KEYS) {
    if (value[key] === undefined || value[key] === null || value[key] === "") continue;
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) {
      throw new WorkbenchError(`${label}.${key} must be a non-negative safe integer.`, {
        code: "invalid_execution_metrics"
      });
    }
    normalized[key] = value[key];
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function isFiniteTimestamp(value) {
  return typeof value === "string" && value.length > 0 && Number.isFinite(new Date(value).getTime());
}

function parseRawJson(rawJson) {
  if (typeof rawJson !== "string") {
    throw new WorkbenchError("rawJson must be a string containing one JSON value.", {
      code: "invalid_raw_json"
    });
  }
  const raw = stripBom(rawJson).trim();
  if (!raw) {
    throw new WorkbenchError("Paste a JSON response before saving.", {
      code: "empty_raw_json"
    });
  }
  try {
    return { raw, value: JSON.parse(raw) };
  } catch (error) {
    throw new WorkbenchError(`Pasted response is not valid raw JSON: ${errorMessage(error)}`, {
      code: "invalid_raw_json"
    });
  }
}

function responseFilename(caseId) {
  const slug = caseId
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "case";
  const suffix = crypto.createHash("sha256").update(caseId, "utf8").digest("hex").slice(0, 10);
  return `${slug}-${suffix}.json`;
}

function modelLabel(model) {
  if (typeof model === "string") return model;
  if (isRecord(model)) {
    for (const key of ["name", "model", "id"]) {
      if (typeof model[key] === "string" && model[key].trim()) return model[key].trim();
    }
  }
  const serialized = canonicalJson(model);
  return serialized.length > 180 ? `${serialized.slice(0, 177)}...` : serialized;
}

function loadStaticAssets(publicDirectory) {
  const directory = path.resolve(publicDirectory);
  const assets = new Map();
  for (const [route, metadata] of STATIC_FILES) {
    const filePath = path.join(directory, metadata.name);
    try {
      assets.set(route, {
        body: fs.readFileSync(filePath),
        contentType: metadata.contentType
      });
    } catch (error) {
      throw new WorkbenchError(`Could not load workbench UI asset ${metadata.name}: ${errorMessage(error)}`, {
        status: 500,
        code: "missing_ui_asset"
      });
    }
  }
  return assets;
}

function isAllowedHostHeader(hostHeader) {
  if (typeof hostHeader !== "string" || !hostHeader) return false;
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (origin === undefined) return;
  const expected = `http://${request.headers.host}`;
  let normalized;
  try {
    normalized = new URL(origin).origin;
  } catch {
    normalized = null;
  }
  if (normalized !== expected) {
    throw new WorkbenchError("Cross-origin submissions are not allowed.", {
      status: 403,
      code: "origin_rejected"
    });
  }
}

function readRequestJson(request, limitBytes) {
  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
    throw new WorkbenchError(`Request body exceeds ${limitBytes} bytes.`, {
      status: 413,
      code: "body_too_large"
    });
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > limitBytes) {
        settled = true;
        reject(new WorkbenchError(`Request body exceeds ${limitBytes} bytes.`, {
          status: 413,
          code: "body_too_large"
        }));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(new WorkbenchError(`Request body is not valid JSON: ${errorMessage(error)}`, {
          code: "invalid_request_json"
        }));
      }
    });
    request.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(new WorkbenchError(`Could not read request body: ${errorMessage(error)}`, {
        status: 400,
        code: "request_read_failed"
      }));
    });
  });
}

function sendJson(response, status, value) {
  sendBuffer(response, status, Buffer.from(`${JSON.stringify(value)}\n`, "utf8"), "application/json; charset=utf-8");
}

function sendEmpty(response, status) {
  response.writeHead(status, securityHeaders({ contentType: undefined, contentLength: 0 }));
  response.end();
}

function sendBuffer(response, status, body, contentType) {
  response.writeHead(status, securityHeaders({ contentType, contentLength: body.length }));
  response.end(body);
}

function securityHeaders({ contentType, contentLength }) {
  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    "Content-Length": String(contentLength),
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

function normalizeHttpError(error) {
  if (error instanceof WorkbenchError) return error;
  return new WorkbenchError("The workbench could not complete the request.", {
    status: 500,
    code: "internal_error"
  });
}

function identityError(label, expected, actual) {
  return new WorkbenchError(`${label} mismatch. Expected ${expected}; found ${actual ?? "missing"}.`, {
    status: 412,
    code: "stored_identity_mismatch",
    details: { label }
  });
}

function assertDirectory(directory, label) {
  let stats;
  try {
    stats = fs.statSync(directory);
  } catch (error) {
    throw new WorkbenchError(`${label} does not exist at ${directory}: ${errorMessage(error)}`, {
      code: "missing_directory"
    });
  }
  if (!stats.isDirectory()) {
    throw new WorkbenchError(`${label} is not a directory: ${directory}.`, {
      code: "invalid_directory"
    });
  }
}

function assertRecord(value, label) {
  if (!isRecord(value)) {
    throw new WorkbenchError(`${label} must be a JSON object.`, { code: "invalid_object" });
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function decodePathPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new WorkbenchError("Case ID path is not valid URL encoding.", {
      code: "invalid_case_path"
    });
  }
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

function fsyncDirectoryBestEffort(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, "r");
    fs.fsyncSync(descriptor);
  } catch {
    // Windows and some filesystems do not support directory fsync.
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // The file payload was already fsynced before rename.
      }
    }
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
