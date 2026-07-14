import { getOntologyFingerprintSource, ontologyVersion } from "./ontology.mjs";
import { getNormalizationFingerprintSource, normalizationVersion } from "./normalization.mjs";
import {
  buildSystemPrompt,
  getUserPromptFingerprintSource,
  promptVersion
} from "./prompts.mjs";
import {
  getProviderValidationFingerprintSource,
  providerValidationVersion
} from "./provider-validation.mjs";
import {
  getPublicValidationFingerprintSource,
  publicValidationVersion
} from "./public-validation.mjs";
import { getRiskPolicyFingerprintSource, riskPolicyVersion } from "./risk-policy.mjs";
import {
  getSafetyLanguageFingerprintSource,
  safetyLanguageVersion
} from "./safety-language.mjs";
import { modelScanResultSchema, schemaVersion, scanResultSchema } from "./schemas.mjs";

export const imagePreprocessingVersion = "app-jpeg-1600-compress-0.72-v1";
export const imagePreprocessingDescriptor = Object.freeze({
  version: imagePreprocessingVersion,
  format: "jpeg",
  maxLongEdge: 1600,
  compress: 0.72
});

let staticHashesPromise;

export function getStaticConfigurationHashes() {
  staticHashesPromise ??= Promise.all([
    sha256Hex(buildSystemPrompt()),
    sha256Hex(getUserPromptFingerprintSource()),
    sha256Hex(stableStringify(modelScanResultSchema)),
    sha256Hex(stableStringify(scanResultSchema)),
    sha256Hex(getRiskPolicyFingerprintSource()),
    sha256Hex(getOntologyFingerprintSource()),
    sha256Hex(getNormalizationFingerprintSource()),
    sha256Hex(getSafetyLanguageFingerprintSource()),
    sha256Hex(getProviderValidationFingerprintSource()),
    sha256Hex(getPublicValidationFingerprintSource()),
    sha256Hex(stableStringify(imagePreprocessingDescriptor))
  ]).then(([
    systemPromptSha256,
    userPromptSha256,
    providerSchemaSha256,
    publicSchemaSha256,
    riskPolicySha256,
    ontologySha256,
    normalizationSha256,
    safetyLanguageSha256,
    providerValidationSha256,
    publicValidationSha256,
    imagePreprocessingSha256
  ]) => ({
    systemPromptSha256,
    userPromptSha256,
    providerSchemaSha256,
    publicSchemaSha256,
    riskPolicySha256,
    ontologySha256,
    normalizationSha256,
    safetyLanguageSha256,
    providerValidationSha256,
    publicValidationSha256,
    imagePreprocessingSha256
  }));

  return staticHashesPromise;
}

export async function createConfigurationProvenance({
  provider,
  model,
  thinkingLevel,
  maxOutputTokens,
  providerSettings = {},
  wireSchema = modelScanResultSchema,
  gitCommitSha = null,
  edgeDeploymentId = null
}) {
  const hashes = await getStaticConfigurationHashes();
  const wireSchemaSha256 = wireSchema === null
    ? null
    : await sha256Hex(stableStringify(wireSchema));
  const descriptor = {
    provider,
    model,
    thinkingLevel,
    maxOutputTokens,
    providerSettings,
    wireSchemaSha256,
    promptVersion,
    schemaVersion,
    riskPolicyVersion,
    ontologyVersion,
    normalizationVersion,
    safetyLanguageVersion,
    providerValidationVersion,
    publicValidationVersion,
    imagePreprocessingVersion,
    gitCommitSha,
    edgeDeploymentId,
    ...hashes
  };

  return {
    ...descriptor,
    configurationSha256: await sha256Hex(stableStringify(descriptor))
  };
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
