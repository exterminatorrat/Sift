import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const edgeFunctionPath = path.resolve("supabase/functions/analyze-menu/index.ts");
const source = fs.readFileSync(edgeFunctionPath, "utf8");

assert.match(
  source,
  /response_format:\s*\{\s*type:\s*"json_schema",\s*json_schema:\s*\{[\s\S]*?schema:\s*modelScanResultSchema[\s\S]*?\}\s*\}/,
  "NVIDIA must receive the provider JSON schema through response_format."
);
assert.match(
  source,
  /endpoint:\s*`\$\{getNvidiaBaseUrl\(\)\}\/chat\/completions`/,
  "NVIDIA's configurable endpoint must be included in provider provenance."
);
assert.match(
  source,
  /const transportSettings = \{[\s\S]*?timeoutMs: getProviderTimeoutMs\(\),[\s\S]*?maximumAttempts: 1[\s\S]*?\}/,
  "Provider provenance must lock the runtime to one inference attempt."
);
assert.doesNotMatch(
  source,
  /analyzeMenuWithRetry|retryableProviderStatuses|readRetryAfterMs|maximumAttempts:\s*2/,
  "The Edge Function must not retain an inference retry path or retry provenance."
);
assert.match(
  source,
  /const analysis = await analyzeMenu\(body, provider\);/,
  "Each accepted scan must make one direct provider inference call."
);
assert.doesNotMatch(
  source,
  /return\s+provider\s*===\s*"nvidia"\s*\?\s*"nvidia"\s*:\s*"openai"|\|\|\s*"openai"|\?\?\s*"openai"/,
  "AI_PROVIDER must never default or fall through to OpenAI."
);
assert.match(
  source,
  /function getAnalysisProvider\(\): AnalysisProvider \{[\s\S]*?switch \(provider\)[\s\S]*?case "openai":[\s\S]*?case "nvidia":[\s\S]*?case "gemini":[\s\S]*?default:\s*throw new ProviderConfigurationError\(\);[\s\S]*?\}/,
  "Only explicitly configured supported AI providers may be accepted."
);
assert.match(
  source,
  /async function analyzeMenu\([\s\S]*?provider: AnalysisProvider[\s\S]*?switch \(provider\)[\s\S]*?case "openai":[\s\S]*?analyzeWithOpenAi\(request\)[\s\S]*?case "nvidia":[\s\S]*?analyzeWithNvidia\(request\)[\s\S]*?case "gemini":[\s\S]*?analyzeWithGemini\(request\)[\s\S]*?rejectUnsupportedProvider\(provider\)/,
  "Provider dispatch must use explicit supported branches with a fail-closed remainder."
);
assert.match(
  source,
  /validateModelScanResult\(parsedModelResult,\s*\{\s*profile: body\.profile,\s*imageCount: body\.images\.length,\s*userLanguage: body\.profile\.preferredLanguage,\s*restaurantLanguage: body\.restaurantLanguage \?\? body\.profile\.restaurantLanguage \?\? null\s*\}\)/,
  "Provider validation must receive profile, image-count, user-language, and restaurant-language request context."
);
assert.match(
  source,
  /normalizeModelScanResult\(parsedModelResult, body\.profile\.id, \{ imageCount: body\.images\.length \}\)/,
  "Normalization must preserve ordered page assessments and dish source-page provenance."
);
assert.equal(
  (source.match(/createSharedFallbackScanResult\(body\.profile\.id, [^,\n]+, \{ imageCount: body\.images\.length \}\)/g) ?? []).length,
  2,
  "Both fallback paths must preserve the requested menu-page count."
);
assert.match(
  source,
  /class ProviderConfigurationError extends Error \{[\s\S]*?failureCode = "provider_configuration_invalid"/,
  "Invalid provider configuration must retain a distinct telemetry failure code."
);
assert.match(
  source,
  /function getProviderFailureCode\(error: unknown\) \{[\s\S]*?error instanceof ProviderConfigurationError[\s\S]*?return error\.failureCode/,
  "Provider configuration failures must flow through normal failure categorization."
);
assert.match(
  source,
  /const failureHeaders = provider && configuredModel[\s\S]*?X-Sift-Analysis-Failure": publicAnalysisFailureCategory\(failureCode\)/,
  "Missing provider identity must return the calm fallback without fabricated provider provenance."
);
assert.match(
  source,
  /validatePublicScanResult\(scanResult\)/,
  "The versioned shared public validator must govern the Edge Function wire result."
);
assert.doesNotMatch(
  source,
  /function validateScanResult\(/,
  "The Edge Function must not retain a divergent handwritten public-result validator."
);
assert.equal(
  (source.match(/const analysis = await analyzeMenu\(body, provider\);/g) ?? []).length,
  1,
  "The request path must contain exactly one provider-inference call site."
);
assert.match(
  source,
  /async function fetchWithTimeout\([\s\S]*?timeoutMs = getProviderTimeoutMs\(\)/,
  "Provider requests and provenance must use the same validated timeout helper."
);
assert.match(
  source,
  /wireSchema:\s*responseSchemaEnabled \? toGeminiOpenApiSchema\(modelScanResultSchema\) : null/,
  "Gemini provenance must identify the effective transformed wire schema or its absence."
);
assert.match(
  source,
  /mediaResolution: getGeminiMediaResolution\(\)[\s\S]*?promptContentOrder: getGeminiPromptContentOrder\(\)/,
  "Gemini media resolution and prompt content order must be included in provider provenance."
);
assert.match(
  source,
  /function buildGeminiGenerationConfig\(\)[\s\S]*?getGeminiMediaResolution\(\)[\s\S]*?mediaResolution/,
  "Gemini runtime requests must use the same media resolution helper as provenance."
);
assert.match(
  source,
  /parts: buildGeminiUserParts\(request\)/,
  "Gemini runtime requests must use the versioned prompt-content-order builder."
);
assert.match(
  source,
  /Access-Control-Expose-Headers[\s\S]*?X-Sift-Input-Tokens[\s\S]*?X-Sift-Output-Tokens[\s\S]*?X-Sift-Thinking-Tokens/,
  "Provider token-count headers must be exposed to browser and live-eval clients."
);
assert.equal(
  (source.match(/analysisResponseHeaders\(analysis\.provider, analysis\.model, analysis\.usage\)/g) ?? []).length,
  2,
  "Both successful and invalid-model fallback responses must pass available provider usage metadata to response headers."
);
assert.match(
  source,
  /function analysisUsageHeaders\([\s\S]*?X-Sift-Input-Tokens[\s\S]*?X-Sift-Output-Tokens[\s\S]*?X-Sift-Thinking-Tokens/,
  "Only the three non-sensitive token-count fields should be serialized by the usage-header helper."
);
assert.match(
  source,
  /gitCommitSha: readHeaderIdentity\("SIFT_GIT_COMMIT_SHA"\)[\s\S]*?edgeDeploymentId: readHeaderIdentity\("SIFT_EDGE_DEPLOYMENT_ID"\)/,
  "Git commit and Edge deployment identities must participate in configuration provenance."
);
for (const requiredField of [
  "user_prompt_sha256",
  "provider_validation",
  "provider_validation_sha256",
  "public_validation",
  "public_validation_sha256",
  "preprocessing_sha256",
  "git_commit",
  "edge_deployment_id"
]) {
  assert.match(
    source,
    new RegExp(`${requiredField}=`),
    `${requiredField} must be included in X-Sift-Analysis-Configuration.`
  );
}

console.log("Edge Function wire self-test passed: explicit provider selection, fail-closed fallback, structured output, page provenance, single-attempt timeout, usage, deployment, and schema provenance are locked.");
