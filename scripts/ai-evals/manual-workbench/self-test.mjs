import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  computeConfigFingerprints,
  fingerprintJson,
  loadPreparedRun,
  readJsonFile,
  startWorkbench,
  writeJsonAtomic
} from "./workbench.mjs";
import { buildMenuPageLabel } from "../../../supabase/functions/_shared/ai/prompts.mjs";
import {
  createManualScoringManifest,
  fingerprintEvidenceBytes
} from "../lib/manual-evidence.mjs";

const HIDDEN_LABEL = "DO_NOT_EXPOSE_EXPECTED_LABEL";
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const TINY_PNG_SHA256 = crypto.createHash("sha256").update(TINY_PNG).digest("hex");

export async function runSelfTest() {
  const temporaryRoot = makeTemporaryRoot();
  const fixture = createFixture(temporaryRoot);
  const activeServers = [];

  try {
    assertPreparedImageCompatibility(fixture);
    const first = await startWorkbench({
      runDirectory: fixture.runDirectory,
      pass: 1,
      port: 0,
      outputRoot: fixture.outputRoot
    });
    activeServers.push(first);

    const health = await request(first.port, "/healthz");
    assert.equal(health.status, 200);
    assert.equal(health.json.ok, true);

    const foreignHost = await request(first.port, "/healthz", {
      headers: { Host: "example.invalid" }
    });
    assert.equal(foreignHost.status, 400);
    assert.equal(foreignHost.json.code, "invalid_host");

    const root = await request(first.port, "/");
    assert.equal(root.status, 200);
    assert.match(root.headers["content-security-policy"], /connect-src 'self'/);
    assert.doesNotMatch(root.text, /https?:\/\//i);

    const appScript = await request(first.port, "/app.js");
    assert.equal(appScript.status, 200);
    assert.doesNotMatch(appScript.text, /https?:\/\//i);

    const bootstrap = await request(first.port, "/api/bootstrap");
    assert.equal(bootstrap.status, 200);
    assert.equal(bootstrap.json.status.totalCases, 3);
    assert.equal(bootstrap.json.status.completedCases, 0);
    assert.equal(bootstrap.json.run.pass, 1);
    assert.equal(bootstrap.json.run.expectedPasses, 2);
    assert.equal(bootstrap.json.run.scoringManifestFingerprint, fixture.scoringManifest.scoringManifestFingerprint);
    assert.deepEqual(
      bootstrap.json.queue.map((item) => item.name),
      ["Evaluation case case-001", "Evaluation case case-002", "Evaluation case case-003"]
    );
    assertLabelIsHidden(bootstrap.text);

    const caseOne = await request(first.port, "/api/cases/case-001");
    assert.equal(caseOne.status, 200);
    assert.equal(caseOne.json.userPrompt, "Analyze this menu for the supplied profile. Return JSON only.");
    assert.deepEqual(caseOne.json.profile.allergies, ["sesame"]);
    assert.equal(caseOne.json.name, "Evaluation case case-001");
    assert.equal(caseOne.json.menuPageLabel, buildMenuPageLabel(0, 1));
    assert.equal(caseOne.json.promptContentOrder, "instruction_first");
    assert.equal(caseOne.json.images.length, 1);
    assert.equal(caseOne.json.images[0].imageUrl, "/api/cases/case-001/images/1");
    assertLabelIsHidden(caseOne.text);

    const image = await request(first.port, "/api/cases/case-001/image");
    assert.equal(image.status, 200);
    assert.equal(image.headers["content-type"], "image/png");
    assert.deepEqual(image.body, TINY_PNG);

    const multiPageCase = await request(first.port, "/api/cases/case-003");
    assert.equal(multiPageCase.status, 200);
    assert.equal(multiPageCase.json.images.length, 2);
    assert.deepEqual(
      multiPageCase.json.images.map((item) => item.label),
      [buildMenuPageLabel(0, 2), buildMenuPageLabel(1, 2)]
    );
    assert.equal(Object.hasOwn(multiPageCase.json, "imageUrl"), false);
    assert.equal(Object.hasOwn(multiPageCase.json, "menuPageLabel"), false);
    assertLabelIsHidden(multiPageCase.text);
    for (const page of multiPageCase.json.images) {
      const pageImage = await request(first.port, page.imageUrl);
      assert.equal(pageImage.status, 200);
      assert.equal(pageImage.headers["content-type"], "image/png");
      assert.deepEqual(pageImage.body, TINY_PNG);
    }
    const missingPage = await request(first.port, "/api/cases/case-003/images/3");
    assert.equal(missingPage.status, 404);
    assert.equal(missingPage.json.code, "case_image_not_found");

    const validSubmission = {
      caseId: "case-001",
      pass: 1,
      fingerprints: bootstrap.json.run.fingerprints,
      freshSessionAcknowledged: true,
      executionMetrics: {
        latencyMs: 812,
        inputTokens: 1200,
        outputTokens: 340,
        thinkingTokens: 81
      },
      rawJson: "{\"answer\":{\"ok\":true},\"items\":[1,2]}"
    };

    const missingAcknowledgement = await request(first.port, "/api/responses", {
      method: "POST",
      json: { ...validSubmission, freshSessionAcknowledged: false }
    });
    assert.equal(missingAcknowledgement.status, 412);
    assert.equal(missingAcknowledgement.json.code, "fresh_session_required");

    const invalidMetrics = await request(first.port, "/api/responses", {
      method: "POST",
      json: { ...validSubmission, executionMetrics: { latencyMs: -1 } }
    });
    assert.equal(invalidMetrics.status, 400);
    assert.equal(invalidMetrics.json.code, "invalid_execution_metrics");

    const foreignOrigin = await request(first.port, "/api/responses", {
      method: "POST",
      headers: { Origin: "http://example.invalid" },
      json: validSubmission
    });
    assert.equal(foreignOrigin.status, 403);
    assert.equal(foreignOrigin.json.code, "origin_rejected");

    const wrongFingerprints = structuredClone(validSubmission);
    wrongFingerprints.fingerprints.model = `sha256:${"0".repeat(64)}`;
    const mismatch = await request(first.port, "/api/responses", {
      method: "POST",
      json: wrongFingerprints
    });
    assert.equal(mismatch.status, 412);
    assert.equal(mismatch.json.code, "fingerprint_mismatch");
    assert.deepEqual(mismatch.json.details.mismatches, ["model"]);

    const wrongPass = await request(first.port, "/api/responses", {
      method: "POST",
      json: { ...validSubmission, pass: 2 }
    });
    assert.equal(wrongPass.status, 412);
    assert.equal(wrongPass.json.code, "pass_mismatch");

    const invalidJson = await request(first.port, "/api/responses", {
      method: "POST",
      json: { ...validSubmission, rawJson: "```json\n{}\n```" }
    });
    assert.equal(invalidJson.status, 400);
    assert.equal(invalidJson.json.code, "invalid_raw_json");

    const saved = await request(first.port, "/api/responses", {
      method: "POST",
      json: validSubmission
    });
    assert.equal(saved.status, 201);
    assert.equal(saved.json.duplicate, false);
    assert.equal(saved.json.status.completedCases, 1);

    const passOneDirectory = path.join(
      fixture.outputRoot,
      fixture.config.runId,
      "pass-001"
    );
    const checkpointAfterOne = readJsonFile(path.join(passOneDirectory, "checkpoint.json"));
    assert.equal(checkpointAfterOne.completedCases, 1);
    assert.deepEqual(checkpointAfterOne.completedCaseIds, ["case-001"]);
    assert.equal(jsonFiles(path.join(passOneDirectory, "responses")).length, 1);
    const savedRecord = readJsonFile(path.join(
      passOneDirectory,
      "responses",
      jsonFiles(path.join(passOneDirectory, "responses"))[0]
    ));
    assert.equal(savedRecord.freshSessionAcknowledged, true);
    assert.ok(Number.isFinite(new Date(savedRecord.freshSessionAcknowledgedAt).getTime()));
    assert.deepEqual(savedRecord.executionMetrics, validSubmission.executionMetrics);
    assert.match(savedRecord.submissionFingerprint, /^sha256:[a-f0-9]{64}$/);
    assert.equal(savedRecord.scoringManifestFingerprint, fixture.scoringManifest.scoringManifestFingerprint);

    const equivalentRetry = await request(first.port, "/api/responses", {
      method: "POST",
      json: {
        ...validSubmission,
        rawJson: "{ \"items\": [1, 2], \"answer\": { \"ok\": true } }"
      }
    });
    assert.equal(equivalentRetry.status, 200);
    assert.equal(equivalentRetry.json.duplicate, true);
    assert.equal(jsonFiles(path.join(passOneDirectory, "responses")).length, 1);

    const conflictingMetrics = await request(first.port, "/api/responses", {
      method: "POST",
      json: {
        ...validSubmission,
        executionMetrics: { ...validSubmission.executionMetrics, latencyMs: 813 }
      }
    });
    assert.equal(conflictingMetrics.status, 409);
    assert.equal(conflictingMetrics.json.code, "case_already_completed");

    const conflictingRetry = await request(first.port, "/api/responses", {
      method: "POST",
      json: { ...validSubmission, rawJson: "{\"answer\":{\"ok\":false}}" }
    });
    assert.equal(conflictingRetry.status, 409);
    assert.equal(conflictingRetry.json.code, "case_already_completed");

    await first.close();

    const resumed = await startWorkbench({
      runDirectory: fixture.runDirectory,
      pass: 1,
      port: 0,
      outputRoot: fixture.outputRoot
    });
    activeServers.push(resumed);
    const resumedStatus = await request(resumed.port, "/status");
    assert.equal(resumedStatus.json.completedCases, 1);
    assert.equal(resumedStatus.json.nextCaseId, "case-002");

    const secondSaved = await request(resumed.port, "/api/responses", {
      method: "POST",
      json: {
        caseId: "case-002",
        pass: 1,
        fingerprints: bootstrap.json.run.fingerprints,
        freshSessionAcknowledged: true,
        executionMetrics: null,
        rawJson: "{\"answer\":\"second\"}"
      }
    });
    assert.equal(secondSaved.status, 201);
    assert.equal(secondSaved.json.status.completedCases, 2);
    assert.equal(secondSaved.json.status.nextCaseId, "case-003");

    const thirdSaved = await request(resumed.port, "/api/responses", {
      method: "POST",
      json: {
        caseId: "case-003",
        pass: 1,
        fingerprints: bootstrap.json.run.fingerprints,
        freshSessionAcknowledged: true,
        executionMetrics: null,
        rawJson: "{\"answer\":\"third\"}"
      }
    });
    assert.equal(thirdSaved.status, 201);
    assert.equal(thirdSaved.json.status.completedCases, 3);
    assert.equal(thirdSaved.json.status.nextCaseId, null);
    assert.equal(jsonFiles(path.join(passOneDirectory, "responses")).length, 3);
    assertNoTemporaryFiles(fixture.outputRoot);
    await resumed.close();

    const passTwo = await startWorkbench({
      runDirectory: fixture.runDirectory,
      pass: 2,
      port: 0,
      outputRoot: fixture.outputRoot
    });
    activeServers.push(passTwo);
    const passTwoStatus = await request(passTwo.port, "/api/status");
    assert.equal(passTwoStatus.json.pass, 2);
    assert.equal(passTwoStatus.json.completedCases, 0);

    const passTwoSaved = await request(passTwo.port, "/api/responses", {
      method: "POST",
      json: {
        ...validSubmission,
        pass: 2,
        rawJson: "{\"pass\":2}"
      }
    });
    assert.equal(passTwoSaved.status, 201);
    assert.equal(passTwoSaved.json.status.completedCases, 1);
    await passTwo.close();

    await assert.rejects(
      startWorkbench({
        runDirectory: fixture.runDirectory,
        pass: 3,
        port: 0,
        outputRoot: fixture.outputRoot
      }),
      /expected pass count/i
    );

    const passTwoResponsePath = path.join(
      fixture.outputRoot,
      fixture.config.runId,
      "pass-002",
      "responses",
      jsonFiles(path.join(fixture.outputRoot, fixture.config.runId, "pass-002", "responses"))[0]
    );
    const tamperedResponse = readJsonFile(passTwoResponsePath);
    tamperedResponse.fingerprints.schema = `sha256:${"f".repeat(64)}`;
    writeJsonAtomic(passTwoResponsePath, tamperedResponse);
    await assert.rejects(
      startWorkbench({
        runDirectory: fixture.runDirectory,
        pass: 2,
        port: 0,
        outputRoot: fixture.outputRoot
      }),
      /fingerprint mismatch/i
    );

    const scoringManifestPath = path.join(fixture.runDirectory, "evidence", "scoring-manifest.json");
    const originalScoringManifest = fs.readFileSync(scoringManifestPath, "utf8");
    const tamperedScoringManifest = JSON.parse(originalScoringManifest);
    tamperedScoringManifest.cases[0].expectations.label = "CHANGED_AFTER_PREPARATION";
    writeJsonAtomic(scoringManifestPath, tamperedScoringManifest);
    assert.throws(
      () => loadPreparedRun(fixture.runDirectory),
      /scoring manifest fingerprint is invalid/i
    );
    fs.writeFileSync(scoringManifestPath, originalScoringManifest, "utf8");

    const sourceManifestPath = path.join(fixture.runDirectory, "evidence", "source-manifest.json");
    const originalSourceManifest = fs.readFileSync(sourceManifestPath);
    fs.appendFileSync(sourceManifestPath, " ");
    assert.throws(
      () => loadPreparedRun(fixture.runDirectory),
      /source manifest bytes do not match config evidence/i
    );
    fs.writeFileSync(sourceManifestPath, originalSourceManifest);

    const changedConfig = readJsonFile(path.join(fixture.runDirectory, "config.json"));
    changedConfig.model = { ...changedConfig.model, name: "different-model" };
    writeJsonAtomic(path.join(fixture.runDirectory, "config.json"), changedConfig);
    assert.throws(
      () => loadPreparedRun(fixture.runDirectory),
      /config\.json fingerprint mismatch/i
    );

    changedConfig.fingerprints = computeConfigFingerprints(changedConfig);
    writeJsonAtomic(path.join(fixture.runDirectory, "config.json"), changedConfig);
    await assert.rejects(
      startWorkbench({
        runDirectory: fixture.runDirectory,
        pass: 1,
        port: 0,
        outputRoot: fixture.outputRoot
      }),
      /fingerprint mismatch/i
    );

    assertNoTemporaryFiles(fixture.outputRoot);
    console.log(
      "Manual workbench self-test passed: legacy and ordered page loading, page-order fingerprints, numbered image routes, local-only hidden-label APIs, sealed passes, execution metrics, atomic checkpoints, retries, resume, and pass isolation."
    );
  } finally {
    for (const instance of activeServers) {
      try {
        await instance.close();
      } catch {
        // Continue cleanup after a failed assertion.
      }
    }
    removeTemporaryRoot(temporaryRoot);
  }
}

export async function serveSelfTestFixture(port = 4318) {
  const temporaryRoot = makeTemporaryRoot();
  const fixture = createFixture(temporaryRoot);
  const instance = await startWorkbench({
    runDirectory: fixture.runDirectory,
    pass: 1,
    port,
    outputRoot: fixture.outputRoot
  });
  console.log(`Self-test fixture URL: ${instance.url}`);
  console.log(`Temporary fixture: ${temporaryRoot}`);

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await instance.close();
    removeTemporaryRoot(temporaryRoot);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
  return instance;
}

export function createFixture(temporaryRoot) {
  const runDirectory = path.join(temporaryRoot, "prepared-run");
  const outputRoot = path.join(temporaryRoot, "output");
  fs.mkdirSync(path.join(runDirectory, "cases"), { recursive: true });
  fs.mkdirSync(path.join(runDirectory, "images"), { recursive: true });
  fs.mkdirSync(path.join(runDirectory, "evidence"), { recursive: true });
  fs.writeFileSync(path.join(runDirectory, "images", "menu.png"), TINY_PNG);
  fs.writeFileSync(path.join(runDirectory, "images", "menu-2.png"), TINY_PNG);
  fs.writeFileSync(path.join(runDirectory, "images", "menu-3.png"), TINY_PNG);

  const preparedCases = [{
    id: "case-001",
    name: "First menu",
    imagePath: "images/menu.png",
    profile: { allergies: ["sesame"], severity: "severe" },
    menuPageLabel: buildMenuPageLabel(0, 1),
    promptContentOrder: "instruction_first",
    userPrompt: "Analyze this menu for the supplied profile. Return JSON only.",
    expected: { label: HIDDEN_LABEL },
    labels: { sourceType: "controlled", critical: true, hidden: HIDDEN_LABEL }
  }, {
    id: "case-002",
    name: "Second menu",
    image: { path: "images/menu.png", mimeType: "image/png" },
    profile: { allergies: ["peanut"], severity: "mild" },
    menuPageLabel: buildMenuPageLabel(0, 1),
    promptContentOrder: "instruction_first",
    userPrompt: "Analyze the second menu. Return JSON only.",
    expected: { groundTruth: HIDDEN_LABEL },
    labels: { sourceType: "controlled", critical: false }
  }, {
    schemaVersion: "2",
    id: "case-003",
    name: "Two-page menu",
    images: [{
      path: "images/menu-2.png",
      sha256: TINY_PNG_SHA256,
      label: buildMenuPageLabel(0, 2)
    }, {
      path: "images/menu-3.png",
      sha256: TINY_PNG_SHA256,
      label: buildMenuPageLabel(1, 2)
    }],
    profile: { allergies: ["milk"], severity: "severe" },
    promptContentOrder: "image_first",
    userPrompt: "Analyze both menu pages in order. Return JSON only.",
    expected: { groundTruth: HIDDEN_LABEL },
    labels: { sourceType: "controlled", critical: true, hidden: HIDDEN_LABEL }
  }];
  const sourceManifestBytes = Buffer.from(`${JSON.stringify({ cases: preparedCases }, null, 2)}\n`, "utf8");
  const sourceManifestPath = "evidence/source-manifest.json";
  const scoringManifestPath = "evidence/scoring-manifest.json";
  const scoringManifest = createManualScoringManifest({
    runId: `manual-self-test-${path.basename(temporaryRoot).slice(-8)}`,
    sourceManifestBytes,
    sourceManifestPath,
    cases: preparedCases
  });
  fs.writeFileSync(path.join(runDirectory, sourceManifestPath), sourceManifestBytes);
  writeJsonAtomic(path.join(runDirectory, scoringManifestPath), scoringManifest);

  const config = {
    formatVersion: 1,
    runId: `manual-self-test-${path.basename(temporaryRoot).slice(-8)}`,
    model: {
      provider: "google-ai-studio",
      name: "test-model"
    },
    prompt: {
      version: "test-prompt-1",
      system: "Return JSON only."
    },
    schema: {
      version: "test-schema-1",
      type: "object"
    },
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json"
    },
    executionPlan: {
      expectedPasses: 2
    },
    evidence: {
      manualScoring: {
        sourceManifestPath,
        sourceManifestSha256: fingerprintEvidenceBytes(sourceManifestBytes),
        scoringManifestPath,
        scoringManifestFingerprint: scoringManifest.scoringManifestFingerprint,
        holdoutIdentity: null
      }
    },
    imageBaseDirectory: ".",
    freshSessionReminder: "Start a fresh test AI Studio chat before each case."
  };
  config.fingerprints = computeConfigFingerprints(config);
  writeJsonAtomic(path.join(runDirectory, "config.json"), config);

  writeJsonAtomic(path.join(runDirectory, "cases", "001.json"), preparedCases[0]);
  writeJsonAtomic(path.join(runDirectory, "cases", "002.json"), preparedCases[1]);
  writeJsonAtomic(path.join(runDirectory, "cases", "003.json"), preparedCases[2]);

  return { temporaryRoot, runDirectory, outputRoot, config, scoringManifest };
}

function assertPreparedImageCompatibility(fixture) {
  const multiCasePath = path.join(fixture.runDirectory, "cases", "003.json");
  const originalMultiSource = fs.readFileSync(multiCasePath, "utf8");
  const originalMultiCase = JSON.parse(originalMultiSource);
  const initialRun = loadPreparedRun(fixture.runDirectory);
  const legacyCase = initialRun.caseById.get("case-001");
  assert.equal(legacyCase.inputFingerprint, fingerprintJson({
    id: legacyCase.id,
    imageFingerprint: legacyCase.imageFingerprint,
    profile: legacyCase.profile,
    menuPageLabel: legacyCase.menuPageLabel,
    promptContentOrder: legacyCase.promptContentOrder,
    userPrompt: legacyCase.userPrompt
  }));
  const originalFingerprint = initialRun.caseById.get("case-003").inputFingerprint;

  const reordered = structuredClone(originalMultiCase);
  reordered.images.reverse();
  writeJsonAtomic(multiCasePath, reordered);
  const reorderedFingerprint = loadPreparedRun(fixture.runDirectory).caseById.get("case-003").inputFingerprint;
  assert.notEqual(reorderedFingerprint, originalFingerprint);

  const wrongSha = structuredClone(originalMultiCase);
  wrongSha.images[0].sha256 = "0".repeat(64);
  writeJsonAtomic(multiCasePath, wrongSha);
  assert.throws(
    () => loadPreparedRun(fixture.runDirectory),
    /SHA-256 does not match/i
  );
  fs.writeFileSync(multiCasePath, originalMultiSource, "utf8");

  const singleCasePath = path.join(fixture.runDirectory, "cases", "001.json");
  const originalSingleSource = fs.readFileSync(singleCasePath, "utf8");
  const compatibleSingle = JSON.parse(originalSingleSource);
  compatibleSingle.schemaVersion = "2";
  compatibleSingle.images = [{
    path: compatibleSingle.imagePath,
    sha256: TINY_PNG_SHA256,
    label: compatibleSingle.menuPageLabel
  }];
  compatibleSingle.imageSha256 = TINY_PNG_SHA256;
  writeJsonAtomic(singleCasePath, compatibleSingle);
  assert.equal(loadPreparedRun(fixture.runDirectory).caseById.get("case-001").images.length, 1);

  compatibleSingle.imagePath = "images/menu-2.png";
  writeJsonAtomic(singleCasePath, compatibleSingle);
  assert.throws(
    () => loadPreparedRun(fixture.runDirectory),
    /ambiguously defines singular and plural image fields/i
  );
  fs.writeFileSync(singleCasePath, originalSingleSource, "utf8");
}

function request(port, requestPath, { method = "GET", headers = {}, json = undefined } = {}) {
  const body = json === undefined ? null : Buffer.from(JSON.stringify(json), "utf8");
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: {
        ...headers,
        ...(body ? {
          "Content-Type": "application/json",
          "Content-Length": String(body.length)
        } : {})
      }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const responseBody = Buffer.concat(chunks);
        const text = responseBody.toString("utf8");
        let parsed = null;
        if ((response.headers["content-type"] ?? "").startsWith("application/json")) {
          try {
            parsed = JSON.parse(text);
          } catch (error) {
            reject(error);
            return;
          }
        }
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: responseBody,
          text,
          json: parsed
        });
      });
    });
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function assertLabelIsHidden(serialized) {
  assert.doesNotMatch(serialized, new RegExp(HIDDEN_LABEL));
  assert.doesNotMatch(serialized, /"expected"\s*:/i);
  assert.doesNotMatch(serialized, /"groundTruth"\s*:/i);
}

function jsonFiles(directory) {
  return fs.readdirSync(directory).filter((name) => name.toLowerCase().endsWith(".json"));
}

function assertNoTemporaryFiles(directory) {
  const entries = fs.readdirSync(directory, { recursive: true, withFileTypes: true });
  const temporaryFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tmp"))
    .map((entry) => entry.name);
  assert.deepEqual(temporaryFiles, []);
}

function makeTemporaryRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sift-manual-workbench-"));
}

function removeTemporaryRoot(temporaryRoot) {
  const resolvedRoot = path.resolve(temporaryRoot);
  const resolvedTemp = path.resolve(os.tmpdir());
  const safePrefix = `${resolvedTemp}${path.sep}`;
  if (!resolvedRoot.startsWith(safePrefix) || !path.basename(resolvedRoot).startsWith("sift-manual-workbench-")) {
    throw new Error(`Refusing to remove unexpected self-test directory ${resolvedRoot}.`);
  }
  fs.rmSync(resolvedRoot, { recursive: true, force: true });
}

function parseServePort(args) {
  const portIndex = args.indexOf("--port");
  if (portIndex === -1) return 4318;
  const value = Number(args[portIndex + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error("--port must be an integer between 1 and 65535.");
  }
  return value;
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  const serve = process.argv.includes("--serve");
  const operation = serve
    ? serveSelfTestFixture(parseServePort(process.argv.slice(2)))
    : runSelfTest();
  operation.catch((error) => {
    console.error("Manual workbench self-test failed:", error);
    process.exitCode = 1;
  });
}
