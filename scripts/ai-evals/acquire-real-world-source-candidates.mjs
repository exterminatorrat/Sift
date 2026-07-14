import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Jimp from "jimp-compact";

const INTAKE_PATH = "docs/ai-evals/benchmark-v1/real-world-source-candidates.json";
const OUTPUT_DIR = "output/ai-evals/real-world-source-intake/downloads";
const MANIFEST_PATH = path.join(OUTPUT_DIR, "acquisition-manifest.json");
const DEFAULT_INTERVAL_MS = 65_000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeCommonsFileTitle(value) {
  return decodeURIComponent(value)
    .replaceAll("_", " ")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("en-US");
}

function sourceFileTitle(sourcePageUrl) {
  const parsed = new URL(sourcePageUrl);
  const prefix = "/wiki/File:";
  const decodedPath = decodeURIComponent(parsed.pathname);
  invariant(parsed.protocol === "https:" && parsed.hostname === "commons.wikimedia.org", "Source page must be a Commons HTTPS URL.");
  invariant(decodedPath.startsWith(prefix), "Source page must identify a Commons file.");
  return normalizeCommonsFileTitle(decodedPath.slice(prefix.length));
}

function resolvedFileTitle(resolvedUrl) {
  const parsed = new URL(resolvedUrl);
  invariant(parsed.protocol === "https:" && parsed.hostname === "upload.wikimedia.org", "Resolved source must remain on Wikimedia uploads.");
  const fileName = decodeURIComponent(parsed.pathname.split("/").at(-1) ?? "");
  invariant(fileName.length > 0, "Resolved source URL is missing a file name.");
  return normalizeCommonsFileTitle(fileName);
}

function parseJpegDimensions(buffer) {
  invariant(buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8, "Source file is not a JPEG.");
  let offset = 2;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

  while (offset + 3 < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) offset += 1;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    invariant(offset + 2 <= buffer.length, "JPEG segment length is truncated.");
    const segmentLength = buffer.readUInt16BE(offset);
    invariant(segmentLength >= 2 && offset + segmentLength <= buffer.length, "JPEG segment is truncated.");

    if (sofMarkers.has(marker)) {
      invariant(segmentLength >= 7, "JPEG frame header is invalid.");
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3)
      };
    }
    offset += segmentLength;
  }

  throw new Error("JPEG dimensions were not found.");
}

function parseArgs(argv) {
  const mode = argv.includes("--download") ? "download" : argv.includes("--check-local") ? "check-local" : null;
  const intervalIndex = argv.indexOf("--interval-ms");
  const intervalMs = intervalIndex >= 0 ? Number(argv[intervalIndex + 1]) : DEFAULT_INTERVAL_MS;
  invariant(mode, "Usage: node acquire-real-world-source-candidates.mjs (--download | --check-local) [--interval-ms <ms>]");
  invariant(Number.isInteger(intervalMs) && intervalMs >= 1_000, "--interval-ms must be an integer of at least 1000.");
  return { intervalMs, mode };
}

function sourcePath(candidate) {
  invariant(/^RW-[A-Z-]+-[0-9]{3}$/u.test(candidate.candidateSourceId), "Candidate source ID is invalid.");
  return path.join(OUTPUT_DIR, `${candidate.candidateSourceId}.jpg`);
}

async function verifySource(candidate, buffer, resolvedUrl) {
  invariant(buffer.length > 0 && buffer.length <= MAX_IMAGE_BYTES, `${candidate.candidateSourceId} has an invalid byte length.`);
  const headerDimensions = parseJpegDimensions(buffer);
  let decoded;
  try {
    decoded = await Jimp.read(buffer);
  } catch (error) {
    throw new Error(`${candidate.candidateSourceId} is not a decodable JPEG.`, { cause: error });
  }
  const dimensions = { width: decoded.bitmap.width, height: decoded.bitmap.height };
  invariant(
    dimensions.width === headerDimensions.width && dimensions.height === headerDimensions.height,
    `${candidate.candidateSourceId} decoded dimensions disagree with its JPEG frame header.`
  );
  const expectedDimensions = candidate.provenance.observedDimensions;
  invariant(
    `${dimensions.width}x${dimensions.height}` === expectedDimensions,
    `${candidate.candidateSourceId} dimensions ${dimensions.width}x${dimensions.height} do not match ${expectedDimensions}.`
  );
  invariant(candidate.provenance.observedMimeType === "image/jpeg", `${candidate.candidateSourceId} intake MIME type is invalid.`);
  invariant(typeof resolvedUrl === "string" && resolvedUrl.length > 0, `${candidate.candidateSourceId} is missing its trusted resolved URL.`);
  const sourceIdentity = sourceFileTitle(candidate.provenance.sourcePageUrl);
  invariant(
    sourceIdentity === resolvedFileTitle(resolvedUrl),
    `${candidate.candidateSourceId} downloaded bytes resolved from a different Commons file.`
  );
  return {
    candidateSourceId: candidate.candidateSourceId,
    language: candidate.language,
    sourcePageUrl: candidate.provenance.sourcePageUrl,
    downloadUrl: candidate.provenance.downloadUrl,
    resolvedUrl,
    sourceFileTitle: sourceIdentity,
    localPath: sourcePath(candidate).replaceAll("\\", "/"),
    byteLength: buffer.length,
    sha256: sha256(buffer),
    width: dimensions.width,
    height: dimensions.height,
    mimeType: "image/jpeg",
    licenseIdentifier: candidate.license.identifier,
    rightsReviewStatus: candidate.rightsReview.status,
    suitabilityReviewStatus: candidate.suitabilityReview.status
  };
}

async function downloadSource(candidate, retryCount = 0) {
  const response = await fetch(candidate.provenance.downloadUrl, {
    headers: { "user-agent": "SiftBenchmarkResearch/1.0 (source provenance verification)" },
    redirect: "follow"
  });
  if (response.status === 429 && retryCount < 1) {
    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    const retryDelay = Number.isFinite(retryAfterSeconds)
      ? Math.max(DEFAULT_INTERVAL_MS, retryAfterSeconds * 1_000)
      : DEFAULT_INTERVAL_MS;
    await wait(retryDelay);
    return downloadSource(candidate, retryCount + 1);
  }
  invariant(response.ok, `${candidate.candidateSourceId} download failed with HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength)) {
    invariant(contentLength <= MAX_IMAGE_BYTES, `${candidate.candidateSourceId} exceeds the source byte limit.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const record = await verifySource(candidate, buffer, response.url);
  fs.writeFileSync(sourcePath(candidate), buffer);
  return record;
}

async function checkLocalSource(candidate, receipt) {
  const filePath = sourcePath(candidate);
  invariant(fs.existsSync(filePath), `${candidate.candidateSourceId} is missing at ${filePath}.`);
  invariant(receipt?.candidateSourceId === candidate.candidateSourceId, `${candidate.candidateSourceId} is missing from the trusted acquisition receipt.`);
  const record = await verifySource(candidate, fs.readFileSync(filePath), receipt.resolvedUrl);
  invariant(record.sha256 === receipt.sha256, `${candidate.candidateSourceId} local SHA-256 does not match the acquisition receipt.`);
  invariant(record.byteLength === receipt.byteLength, `${candidate.candidateSourceId} local byte length does not match the acquisition receipt.`);
  invariant(record.sourceFileTitle === receipt.sourceFileTitle, `${candidate.candidateSourceId} Commons identity does not match the acquisition receipt.`);
  return record;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const { intervalMs, mode } = parseArgs(process.argv.slice(2));
  const intake = JSON.parse(fs.readFileSync(INTAKE_PATH, "utf8"));
  invariant(intake.status === "research_pending_rights_and_suitability_review", "Source intake is not in research status.");
  invariant(Array.isArray(intake.candidates) && intake.candidates.length === 6, "Source intake must contain six candidates.");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const intakeBytes = fs.readFileSync(INTAKE_PATH);
  const intakeSha256 = sha256(intakeBytes);
  let trustedManifest = null;
  if (mode === "download" && fs.existsSync(MANIFEST_PATH)) {
    const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    if (
      existing?.schemaVersion === "2.0.0" &&
      existing?.mode === "download" &&
      existing?.intakeSha256 === intakeSha256 &&
      Array.isArray(existing?.sources)
    ) {
      trustedManifest = existing;
    }
  }
  if (mode === "check-local") {
    invariant(fs.existsSync(MANIFEST_PATH), "Local checking requires an acquisition manifest created by --download.");
    trustedManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    invariant(trustedManifest?.schemaVersion === "2.0.0", "Acquisition manifest schema is stale; run --download again.");
    invariant(trustedManifest?.mode === "download", "Acquisition manifest was not established by --download.");
    invariant(trustedManifest?.status === "complete", "Acquisition manifest is incomplete; resume --download.");
    invariant(trustedManifest?.intakeSha256 === intakeSha256, "Acquisition manifest does not match the exact source-intake bytes.");
    invariant(Array.isArray(trustedManifest.sources) && trustedManifest.sources.length === 6, "Acquisition manifest source inventory is incomplete.");
  }

  const sources = [];
  for (const [index, candidate] of intake.candidates.entries()) {
    const receipt = trustedManifest?.sources.find((item) => item.candidateSourceId === candidate.candidateSourceId);
    let source;
    let downloaded = false;
    if (mode === "download" && receipt) {
      source = await checkLocalSource(candidate, receipt);
    } else {
      source = mode === "download" ? await downloadSource(candidate) : await checkLocalSource(candidate, receipt);
      downloaded = mode === "download";
    }
    sources.push(source);
    if (mode === "download") {
      fs.writeFileSync(
        MANIFEST_PATH,
        `${JSON.stringify(createManifest(intake, intakeSha256, sources, sources.length === intake.candidates.length), null, 2)}\n`,
        "utf8"
      );
    }
    if (downloaded && index < intake.candidates.length - 1) await wait(intervalMs);
  }

  if (mode === "check-local") {
    console.log(`Verified ${sources.length} local source files against ${MANIFEST_PATH}. No receipt was rewritten.`);
    return;
  }

  const manifest = createManifest(intake, intakeSha256, sources, true);
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Verified ${sources.length} source files and wrote ${MANIFEST_PATH}. No rights or labels were approved.`);
}

function createManifest(intake, intakeSha256, sources, complete) {
  return {
    artifactType: "sift-real-world-source-acquisition",
    schemaVersion: "2.0.0",
    intakeId: intake.intakeId,
    intakeSha256,
    generatedAt: new Date().toISOString(),
    mode: "download",
    status: complete ? "complete" : "partial",
    sourceCount: sources.length,
    containsBenchmarkLabels: false,
    approvalStatus: "not_approved",
    sources
  };
}

async function selfTest() {
  const syntheticJpeg = await new Jimp(3, 2, 0xffffffff).getBufferAsync(Jimp.MIME_JPEG);
  assert.deepEqual(parseJpegDimensions(syntheticJpeg), { width: 3, height: 2 });
  const decoded = await Jimp.read(syntheticJpeg);
  assert.deepEqual({ width: decoded.bitmap.width, height: decoded.bitmap.height }, { width: 3, height: 2 });
  assert.throws(() => parseJpegDimensions(Buffer.from("not-a-jpeg")), /not a JPEG/u);
  const headerOnlyJpeg = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x03,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9
  ]);
  await assert.rejects(() => Jimp.read(headerOnlyJpeg));
  const manifest = createManifest({ intakeId: "self-test" }, "a".repeat(64), [], false);
  assert.equal(manifest.mode, "download");
  assert.equal(manifest.status, "partial");
  console.log("Real-world source acquisition self-test passed: valid JPEGs decode and header-only impostors fail closed.");
}

if (process.argv.includes("--self-test")) {
  await selfTest();
} else {
  await run();
}
