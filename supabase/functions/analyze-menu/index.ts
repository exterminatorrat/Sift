import { createConfigurationProvenance } from "../_shared/ai/configuration.mjs";
import {
  createFallbackScanResult as createSharedFallbackScanResult,
  mergeAnalysisSources as mergeSharedAnalysisSources,
  normalizeModelScanResult,
  sanitizeScanResult as sanitizeSharedScanResult,
  withAnalysisMetadata as withSharedAnalysisMetadata
} from "../_shared/ai/normalization.mjs";
import {
  buildMenuPageLabel,
  buildSystemPrompt,
  buildUserPrompt,
  promptVersion
} from "../_shared/ai/prompts.mjs";
import { validateModelScanResult } from "../_shared/ai/provider-validation.mjs";
import { validatePublicScanResult } from "../_shared/ai/public-validation.mjs";
import { applyRiskPolicy } from "../_shared/ai/risk-policy.mjs";
import {
  modelScanResultSchema,
  schemaVersion,
  toGeminiOpenApiSchema
} from "../_shared/ai/schemas.mjs";

type AllergySeverity = "mild" | "moderate" | "severe";
type RiskLevel = "low_risk" | "ask_staff" | "high_risk" | "avoid_unless_confirmed" | "unclear";
type ImageReadability = "clear" | "partially_clear" | "poor";
type EvidenceConfidence = "high" | "medium" | "low";
type RiskBasis =
  | "visible_text"
  | "common_pattern"
  | "unknown_ingredient"
  | "cross_contact"
  | "translation_uncertain"
  | "image_uncertain";
type SubscriptionPlanId = "free" | "plus" | "pro" | "family";

type Allergy = {
  id: string;
  name: string;
  severity: AllergySeverity;
  avoidCrossContact: boolean;
  notes?: string;
};

type UserProfile = {
  id: string;
  name: string;
  allergies: Allergy[];
  preferredLanguage: string;
  restaurantLanguage?: string;
};

type MenuImagePayload = {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

type AnalyzeMenuRequestPayload = {
  profile?: UserProfile;
  images?: MenuImagePayload[];
  imageBase64?: string;
  mimeType?: MenuImagePayload["mimeType"];
  restaurantLanguage?: string;
};

type AnalyzeMenuRequest = {
  profile: UserProfile;
  images: MenuImagePayload[];
  restaurantLanguage?: string;
};

type AnalysisProvider = "openai" | "nvidia" | "gemini";

type AnalysisUsage = {
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
};

type AnalysisOutput = {
  model: string;
  provider: AnalysisProvider;
  text: string;
  sourceReferences?: SourceReference[];
  webSearchQueries?: string[];
  usage?: AnalysisUsage;
};

type AnalysisEvent = {
  requestId: string;
  provider: AnalysisProvider | null;
  model: string | null;
  outcome: "success" | "fallback" | "quota_rejected";
  failureCode: string | null;
  latencyMs: number;
  imageBytes: number;
  usage?: AnalysisUsage;
  dishCount: number | null;
  imageReadability: ImageReadability | null;
  planId: SubscriptionPlanId;
};

type SourceReference = {
  title: string;
  uri: string;
  source?: string | null;
};

type ScanResult = {
  id: string;
  createdAt: string;
  imageUri?: string | null;
  restaurantName?: string | null;
  profileId: string;
  analysisSource?: "ai" | "fallback";
  analysisModel?: string | null;
  analysisRequestId?: string | null;
  pageAssessments: Array<{
    pageNumber: number;
    readability: ImageReadability;
    issues: string[];
  }>;
  scanSummary: {
    overallRisk: RiskLevel;
    summary: string;
    limitations: string;
  };
  dishes: Array<{
    id: string;
    dishName: string;
    menuDescription?: string | null;
    sourcePageNumbers: number[];
    riskLevel: RiskLevel;
    possibleAllergens: string[];
    hiddenRiskIngredients: string[];
    crossContactConcerns: string[];
    evidenceConfidence: EvidenceConfidence;
    riskBasis: RiskBasis[];
    reason: string;
    questionsToAsk: string[];
    questionsToAskUserLanguage?: string[];
    conservativeLanguage: string;
    transparency?: {
      visibleMenuText: string[];
      profileFactors: string[];
      commonRiskPatterns: string[];
      uncertainty: string[];
    };
  }>;
  restaurantMessage?: {
    english: string;
    translated?: string | null;
    language?: string | null;
    userLanguageText?: string | null;
    userLanguage?: string | null;
  } | null;
  imageQuality: {
    readability: ImageReadability;
    issues: string[];
    needsRetake?: boolean;
  };
  transparency?: {
    checked: string[];
    limitations: string[];
    sourceReferences: SourceReference[];
    webSearchQueries?: string[];
  };
};

const evidenceConfidenceValues = new Set<EvidenceConfidence>(["high", "medium", "low"]);
const riskBasisValues = new Set<RiskBasis>([
  "visible_text",
  "common_pattern",
  "unknown_ingredient",
  "cross_contact",
  "translation_uncertain",
  "image_uncertain"
]);
const defaultMaxImageBase64Length = 3_000_000;
const defaultMaxTotalImageBase64Length = 12_000_000;
const defaultMaxMenuImageCount = 4;
const defaultBodyReadTimeoutMs = 20_000;
const defaultInternalRequestTimeoutMs = 5_000;
const defaultProviderTimeoutMs = 22_000;
const defaultPerUserRequestRateLimit = 12;
const defaultPerUserScanRateLimit = 4;
const defaultGlobalScanRateLimit = 4;
const maxProfileNameLength = 80;
const maxAllergyNameLength = 80;
const maxAllergyNotesLength = 500;
const maxLanguageLength = 80;
const planScanLimits: Record<SubscriptionPlanId, number> = {
  free: 3,
  plus: 50,
  pro: 200,
  family: 500
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Sift-Analysis-Failure, X-Sift-Analysis-Provider, X-Sift-Analysis-Model, X-Sift-Analysis-Configuration, X-Sift-Input-Tokens, X-Sift-Output-Tokens, X-Sift-Thinking-Tokens"
};


Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  const requestStartedAt = Date.now();

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    if (isDeclaredRequestTooLarge(request)) {
      return jsonResponse({ error: "Invalid analysis request." }, 413);
    }

    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return auth.reason === "account_required"
        ? jsonResponse({ error: "A signed-in account is required.", code: "account_required" }, 403)
        : jsonResponse({ error: "Authentication required." }, 401);
    }

    const requestRate = await claimMenuRequestMinuteRate(auth.userId);
    if (!requestRate.allowed) {
      return jsonResponse(
        {
          error: "Scan rate limit reached.",
          code: "scan_rate_limited",
          retryAfterSeconds: requestRate.retryAfterSeconds
        },
        429,
        { "Retry-After": String(requestRate.retryAfterSeconds) }
      );
    }

    const parsedBody = await readBoundedJsonBody<AnalyzeMenuRequestPayload>(request);
    if (!parsedBody.ok) {
      return jsonResponse({ error: "Invalid analysis request." }, parsedBody.status);
    }

    const body = normalizeAnalyzeMenuRequest(parsedBody.value);
    if (!body) {
      return jsonResponse({ error: "Invalid analysis request." }, 400);
    }

    const entitlement = await resolveEntitlement(auth.userId);
    const quota = await claimMenuScanLimits(auth.userId, entitlement.planId, entitlement.scanLimit);
    if (!quota.allowed) {
      const isMonthlyLimit = quota.rejectionReason === "monthly_quota_reached";
      await recordAnalysisEvent({
        requestId,
        provider: null,
        model: null,
        outcome: "quota_rejected",
        failureCode: quota.rejectionReason ?? "scan_limit_reached",
        latencyMs: Date.now() - requestStartedAt,
        imageBytes: estimateImagesBytes(body.images),
        dishCount: null,
        imageReadability: null,
        planId: entitlement.planId
      });
      return jsonResponse(
        isMonthlyLimit
          ? {
              error: "Monthly scan limit reached.",
              code: "monthly_scan_limit",
              scanCount: quota.monthlyScanCount,
              scanLimit: quota.monthlyScanLimit,
              monthStart: quota.monthStart
            }
          : {
              error: "Scan rate limit reached.",
              code: "scan_rate_limited",
              retryAfterSeconds: quota.retryAfterSeconds
            },
        429,
        isMonthlyLimit ? {} : { "Retry-After": String(quota.retryAfterSeconds) }
      );
    }

    let provider: AnalysisProvider | null = null;
    let configuredModel: string | null = null;

    try {
      provider = getAnalysisProvider();
      configuredModel = getConfiguredModel(provider);
      const analysis = await analyzeMenu(body, provider);
      const parsedModelResult = parseModelJson(analysis.text);
      const providerValidationError = validateModelScanResult(parsedModelResult, {
        profile: body.profile,
        imageCount: body.images.length,
        userLanguage: body.profile.preferredLanguage,
        restaurantLanguage: body.restaurantLanguage ?? body.profile.restaurantLanguage ?? null
      });
      const scanResult = providerValidationError
        ? null
        : applyRiskPolicy(sanitizeSharedScanResult(
            mergeSharedAnalysisSources(
              normalizeModelScanResult(parsedModelResult, body.profile.id, { imageCount: body.images.length }),
              analysis
            )
          ), body.profile) as ScanResult;
      const validationError = providerValidationError ?? (scanResult ? validatePublicScanResult(scanResult) : "missing_scan_result");

      if (validationError || !scanResult) {
        console.error("Invalid model response", requestId, validationError, analysis.provider, analysis.model);
        const fallback = withSharedAnalysisMetadata(
          createSharedFallbackScanResult(body.profile.id, analysis.model, { imageCount: body.images.length }),
          requestId
        );
        await recordAnalysisEvent({
          requestId,
          provider: analysis.provider,
          model: analysis.model,
          outcome: "fallback",
          failureCode: `invalid_model_response:${validationError}`.slice(0, 80),
          latencyMs: Date.now() - requestStartedAt,
          imageBytes: estimateImagesBytes(body.images),
          usage: analysis.usage,
          dishCount: fallback.dishes.length,
          imageReadability: fallback.imageQuality.readability,
          planId: entitlement.planId
        });
        return jsonResponse(fallback, 200, {
          ...await analysisResponseHeaders(analysis.provider, analysis.model, analysis.usage),
          "X-Sift-Analysis-Failure": "model_output_invalid"
        });
      }

      const responseResult: ScanResult = {
        ...scanResult,
        imageUri: null,
        analysisSource: "ai",
        analysisModel: analysis.model,
        analysisRequestId: requestId
      };
      await recordAnalysisEvent({
        requestId,
        provider: analysis.provider,
        model: analysis.model,
        outcome: "success",
        failureCode: null,
        latencyMs: Date.now() - requestStartedAt,
        imageBytes: estimateImagesBytes(body.images),
        usage: analysis.usage,
        dishCount: responseResult.dishes.length,
        imageReadability: responseResult.imageQuality.readability,
        planId: entitlement.planId
      });
      return jsonResponse(
        responseResult,
        200,
        await analysisResponseHeaders(analysis.provider, analysis.model, analysis.usage)
      );
    } catch (error) {
      const failureCode = getProviderFailureCode(error);
      console.error("Menu analysis provider failure", requestId, failureCode);
      const fallback = withSharedAnalysisMetadata(
        createSharedFallbackScanResult(body.profile.id, configuredModel, { imageCount: body.images.length }),
        requestId
      );
      await recordAnalysisEvent({
        requestId,
        provider,
        model: configuredModel,
        outcome: "fallback",
        failureCode,
        latencyMs: Date.now() - requestStartedAt,
        imageBytes: estimateImagesBytes(body.images),
        dishCount: fallback.dishes.length,
        imageReadability: fallback.imageQuality.readability,
        planId: entitlement.planId
      });
      const failureHeaders = provider && configuredModel
        ? await analysisResponseHeaders(provider, configuredModel)
        : {};
      return jsonResponse(fallback, 200, {
        ...failureHeaders,
        "X-Sift-Analysis-Failure": publicAnalysisFailureCategory(failureCode)
      });
    }
  } catch (error) {
    console.error("Menu analysis request failure", requestId, getSafeErrorMessage(error));
    return jsonResponse({ error: "We could not analyze this menu clearly." }, 500);
  }
});

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "account_required" | "authentication_required" };

type EntitlementResult = {
  planId: SubscriptionPlanId;
  scanLimit: number;
};

type RequestRateResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type ScanLimitResult = {
  allowed: boolean;
  rejectionReason: string | null;
  monthlyScanCount: number;
  monthlyScanLimit: number;
  monthStart: string;
  retryAfterSeconds: number;
};

async function authenticateRequest(request: Request): Promise<AuthResult> {
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return { ok: false, reason: "authentication_required" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("Supabase auth environment is not configured.");
    return { ok: false, reason: "authentication_required" };
  }

  const response = await fetchWithTimeout(
    `${trimTrailingSlash(supabaseUrl)}/auth/v1/user`,
    {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${accessToken}`
      }
    },
    defaultInternalRequestTimeoutMs
  );

  if (!response.ok) {
    return { ok: false, reason: "authentication_required" };
  }

  const user = await response.json();
  const userId = readString(user?.id);
  if (!userId) {
    return { ok: false, reason: "authentication_required" };
  }

  if (Deno.env.get("REQUIRE_DURABLE_AUTH") === "true" && user?.is_anonymous === true) {
    return { ok: false, reason: "account_required" };
  }

  return { ok: true, userId };
}

async function resolveEntitlement(userId: string): Promise<EntitlementResult> {
  const entitlement = await callSupabaseRpc<{ plan_id?: string }>(
    "sift_get_or_create_entitlement",
    { p_user_id: userId }
  );
  const planId = isPlanId(entitlement?.plan_id) ? entitlement.plan_id : "free";

  return {
    planId,
    scanLimit: planScanLimits[planId]
  };
}

async function claimMenuRequestMinuteRate(userId: string): Promise<RequestRateResult> {
  const requestLimit = readBoundedEnvironmentInteger(
    "PER_USER_REQUEST_RATE_LIMIT",
    defaultPerUserRequestRateLimit,
    1,
    120
  );
  const rate = await callSupabaseRpc<{
    allowed?: boolean;
    retry_after_seconds?: number;
  }>("sift_claim_menu_request_minute", {
    p_user_id: userId,
    p_request_limit: requestLimit
  });

  return {
    allowed: rate?.allowed === true,
    retryAfterSeconds: readPositiveInteger(rate?.retry_after_seconds, 60)
  };
}

async function claimMenuScanLimits(
  userId: string,
  planId: SubscriptionPlanId,
  scanLimit: number
): Promise<ScanLimitResult> {
  const userLimit = readBoundedEnvironmentInteger(
    "PER_USER_SCAN_RATE_LIMIT",
    defaultPerUserScanRateLimit,
    1,
    60
  );
  const globalLimit = readBoundedEnvironmentInteger(
    "GLOBAL_SCAN_RATE_LIMIT",
    defaultGlobalScanRateLimit,
    1,
    600
  );
  const quota = await callSupabaseRpc<{
    allowed?: boolean;
    rejection_reason?: string | null;
    monthly_scan_count?: number;
    monthly_scan_limit?: number;
    month_start?: string;
    retry_after_seconds?: number;
  }>("sift_claim_menu_scan_limits", {
    p_user_id: userId,
    p_plan_id: planId,
    p_scan_limit: scanLimit,
    p_user_limit: userLimit,
    p_global_limit: globalLimit
  });

  return {
    allowed: quota?.allowed === true,
    rejectionReason: readString(quota?.rejection_reason) || null,
    monthlyScanCount: Number(quota?.monthly_scan_count ?? 0),
    monthlyScanLimit: Number(quota?.monthly_scan_limit ?? scanLimit),
    monthStart: readString(quota?.month_start),
    retryAfterSeconds: readPositiveInteger(quota?.retry_after_seconds, 60)
  };
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.ceil(parsed)) : fallback;
}

function readBoundedEnvironmentInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const value = Number(Deno.env.get(name) ?? fallback);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

async function callSupabaseRpc<T>(functionName: string, params: Record<string, unknown>): Promise<T | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment is not configured.");
  }

  const response = await fetchWithTimeout(
    `${trimTrailingSlash(supabaseUrl)}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(params)
    },
    defaultInternalRequestTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`Supabase RPC failed: ${JSON.stringify(await readErrorPreview(response))}`);
  }

  const data = await response.json();
  return (Array.isArray(data) ? data[0] : data) as T | null;
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function isPlanId(value: unknown): value is SubscriptionPlanId {
  return value === "free" || value === "plus" || value === "pro" || value === "family";
}

class ProviderRequestError extends Error {
  constructor(
    readonly provider: AnalysisProvider,
    readonly status: number | null,
    readonly failureCode: string
  ) {
    super(failureCode);
  }
}

class ProviderConfigurationError extends Error {
  readonly failureCode = "provider_configuration_invalid";

  constructor() {
    super("AI provider configuration is missing or unsupported.");
    this.name = "ProviderConfigurationError";
  }
}

async function analyzeMenu(
  request: AnalyzeMenuRequest,
  provider: AnalysisProvider
): Promise<AnalysisOutput> {
  switch (provider) {
    case "openai":
      return analyzeWithOpenAi(request);
    case "nvidia":
      return analyzeWithNvidia(request);
    case "gemini":
      return analyzeWithGemini(request);
  }

  return rejectUnsupportedProvider(provider);
}

function getAnalysisProvider(): AnalysisProvider {
  const provider = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase();

  switch (provider) {
    case "openai":
      return "openai";
    case "nvidia":
      return "nvidia";
    case "gemini":
      return "gemini";
    default:
      throw new ProviderConfigurationError();
  }
}

function getConfiguredModel(provider: AnalysisProvider) {
  switch (provider) {
    case "openai":
      return Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";
    case "nvidia":
      return Deno.env.get("NVIDIA_MODEL") ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
    case "gemini":
      return Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";
  }

  return rejectUnsupportedProvider(provider);
}

async function analyzeWithOpenAi(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    throw new Error("OpenAI analysis service is not configured.");
  }

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: getOpenAiReasoningEffort() },
      max_output_tokens: getProviderMaxOutputTokens("openai"),
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "sift_menu_scan_result",
          strict: true,
          schema: modelScanResultSchema
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: buildSystemPrompt()
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildUserPrompt(request)
            },
            ...request.images.flatMap((image, index) => [
              {
                type: "input_text",
                text: buildMenuPageLabel(index, request.images.length)
              },
              {
                type: "input_image",
                image_url: `data:${image.mimeType};base64,${image.imageBase64}`
              }
            ])
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    console.error("OpenAI analysis failed", await readErrorPreview(response));
    throw new ProviderRequestError(
      "openai",
      response.status,
      `openai_http_${response.status}`
    );
  }

  const data = await response.json();
  return {
    model,
    provider: "openai",
    text: extractOpenAiOutputText(data),
    usage: extractOpenAiUsage(data)
  };
}

async function analyzeWithNvidia(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const nvidiaKey = Deno.env.get("NVIDIA_API_KEY");
  if (!nvidiaKey) {
    throw new Error("NVIDIA analysis service is not configured.");
  }

  const baseUrl = getNvidiaBaseUrl();
  const model = Deno.env.get("NVIDIA_MODEL") ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${nvidiaKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: getNvidiaTemperature(),
      max_tokens: getProviderMaxOutputTokens("nvidia"),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sift_menu_scan_result",
          schema: modelScanResultSchema
        }
      },
      messages: [
        {
          role: "system",
          content: `${buildSystemPrompt()}\nReturn raw JSON only. Do not wrap JSON in markdown fences.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildUserPrompt(request)
            },
            ...request.images.flatMap((image, index) => [
              {
                type: "text",
                text: buildMenuPageLabel(index, request.images.length)
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${image.mimeType};base64,${image.imageBase64}`
                }
              }
            ])
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    console.error("NVIDIA analysis failed", await readErrorPreview(response));
    throw new ProviderRequestError(
      "nvidia",
      response.status,
      `nvidia_http_${response.status}`
    );
  }

  const data = await response.json();
  return {
    model,
    provider: "nvidia",
    text: extractChatCompletionText(data),
    usage: extractChatCompletionUsage(data)
  };
}

async function analyzeWithGemini(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    throw new Error("Gemini analysis service is not configured.");
  }

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: buildSystemPrompt()
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: buildGeminiUserParts(request)
          }
        ],
        generationConfig: buildGeminiGenerationConfig(),
        ...(isGeminiGroundingEnabled()
          ? {
              tools: [
                {
                  googleSearch: {}
                }
              ]
            }
          : {})
      })
    }
  );

  if (!response.ok) {
    const errorPreview = await readErrorPreview(response);
    console.error("Gemini analysis failed", errorPreview);
    throw new ProviderRequestError(
      "gemini",
      response.status,
      [`gemini_http_${response.status}`, errorPreview.classification].filter(Boolean).join(":").slice(0, 80)
    );
  }

  const data = await response.json();
  return {
    model,
    provider: "gemini",
    text: extractGeminiOutputText(data),
    sourceReferences: extractGeminiSourceReferences(data),
    webSearchQueries: extractGeminiWebSearchQueries(data),
    usage: extractGeminiUsage(data)
  };
}

function buildGeminiGenerationConfig() {
  const mediaResolution = getGeminiMediaResolution();
  const baseConfig = {
    maxOutputTokens: getProviderMaxOutputTokens("gemini"),
    thinkingConfig: {
      thinkingLevel: getGeminiThinkingLevel()
    },
    ...(mediaResolution === "MEDIA_RESOLUTION_UNSPECIFIED"
      ? {}
      : { mediaResolution })
  };

  if (!isGeminiResponseSchemaEnabled()) {
    return {
      ...baseConfig,
      responseMimeType: "application/json"
    };
  }

  return {
    ...baseConfig,
    responseMimeType: "application/json",
    responseSchema: toGeminiOpenApiSchema(modelScanResultSchema)
  };
}

function buildGeminiUserParts(request: AnalyzeMenuRequest) {
  const promptPart = { text: buildUserPrompt(request) };
  if (getGeminiPromptContentOrder() === "image_first") {
    return [
      ...request.images.flatMap((image, index) => [
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.imageBase64
          }
        },
        {
          text: buildMenuPageLabel(index, request.images.length)
        }
      ]),
      promptPart
    ];
  }

  return [
    promptPart,
    ...request.images.flatMap((image, index) => [
      {
        text: buildMenuPageLabel(index, request.images.length)
      },
      {
        inlineData: {
          mimeType: image.mimeType,
          data: image.imageBase64
        }
      }
    ])
  ];
}

function getGeminiThinkingLevel() {
  const value = Deno.env.get("GEMINI_THINKING_LEVEL")?.trim().toLowerCase();
  return value === "minimal" || value === "low" || value === "high" ? value : "medium";
}

function getGeminiMediaResolution() {
  const value = Deno.env.get("GEMINI_MEDIA_RESOLUTION")?.trim().toUpperCase();
  return value === "MEDIA_RESOLUTION_LOW" ||
      value === "MEDIA_RESOLUTION_MEDIUM" ||
      value === "MEDIA_RESOLUTION_HIGH"
    ? value
    : "MEDIA_RESOLUTION_UNSPECIFIED";
}

function getGeminiPromptContentOrder() {
  return Deno.env.get("GEMINI_PROMPT_CONTENT_ORDER")?.trim().toLowerCase() === "image_first"
    ? "image_first"
    : "instruction_first";
}

function getOpenAiReasoningEffort() {
  const value = Deno.env.get("OPENAI_REASONING_EFFORT")?.trim().toLowerCase();
  return value === "minimal" || value === "low" || value === "medium" || value === "high"
    ? value
    : "low";
}

function getNvidiaTemperature() {
  const value = Number(Deno.env.get("NVIDIA_TEMPERATURE") ?? 0.1);
  return Number.isFinite(value) && value >= 0 && value <= 2 ? value : 0.1;
}

function getNvidiaBaseUrl() {
  return trimTrailingSlash(Deno.env.get("NVIDIA_BASE_URL") ?? "https://integrate.api.nvidia.com/v1");
}

function getProviderTimeoutMs() {
  const value = Number(Deno.env.get("AI_PROVIDER_TIMEOUT_MS") ?? defaultProviderTimeoutMs);
  return Number.isFinite(value) && value >= 1_000 && value <= 120_000
    ? Math.round(value)
    : defaultProviderTimeoutMs;
}

function isGeminiResponseSchemaEnabled() {
  return Deno.env.get("GEMINI_USE_RESPONSE_SCHEMA") !== "false";
}

function isGeminiGroundingEnabled() {
  return Deno.env.get("GEMINI_ENABLE_GROUNDING") === "true";
}

function normalizeAnalyzeMenuRequest(
  value: AnalyzeMenuRequestPayload
): AnalyzeMenuRequest | null {
  const maxImageBase64Length = Number(Deno.env.get("MAX_IMAGE_BASE64_LENGTH") ?? defaultMaxImageBase64Length);
  const maxTotalImageBase64Length = Number(
    Deno.env.get("MAX_TOTAL_IMAGE_BASE64_LENGTH") ?? defaultMaxTotalImageBase64Length
  );
  const maxMenuImageCount = Number(
    Deno.env.get("MAX_MENU_IMAGE_COUNT") ?? defaultMaxMenuImageCount
  );

  if (
    !Number.isFinite(maxImageBase64Length) ||
    maxImageBase64Length <= 100 ||
    !Number.isFinite(maxTotalImageBase64Length) ||
    maxTotalImageBase64Length <= 100 ||
    !Number.isInteger(maxMenuImageCount) ||
    maxMenuImageCount < 1
  ) {
    return null;
  }

  if (!value || !isValidProfile(value.profile)) {
    return null;
  }

  let rawImages: unknown[];
  if (Array.isArray(value.images)) {
    if (value.imageBase64 !== undefined || value.mimeType !== undefined) {
      return null;
    }
    rawImages = value.images;
  } else if (value.images !== undefined) {
    return null;
  } else {
    rawImages = [
      {
        imageBase64: value.imageBase64,
        mimeType: value.mimeType
      }
    ];
  }

  if (rawImages.length === 0 || rawImages.length > maxMenuImageCount) {
    return null;
  }

  const images: MenuImagePayload[] = [];
  let totalBase64Length = 0;
  for (const image of rawImages) {
    if (
      !isRecord(image) ||
      !isAllowedMimeType(image.mimeType) ||
      typeof image.imageBase64 !== "string" ||
      image.imageBase64.length <= 100 ||
      image.imageBase64.length > maxImageBase64Length ||
      !isBase64ImagePayload(image.imageBase64)
    ) {
      return null;
    }

    totalBase64Length += image.imageBase64.length;
    if (totalBase64Length > maxTotalImageBase64Length) {
      return null;
    }

    images.push({
      imageBase64: image.imageBase64,
      mimeType: image.mimeType
    });
  }

  let restaurantLanguage: string | undefined;
  if (
    value.restaurantLanguage !== undefined &&
    (!readString(value.restaurantLanguage) || readString(value.restaurantLanguage).length > maxLanguageLength)
  ) {
    return null;
  } else if (value.restaurantLanguage !== undefined) {
    restaurantLanguage = readString(value.restaurantLanguage);
  }

  return {
    profile: value.profile,
    images,
    ...(restaurantLanguage ? { restaurantLanguage } : {})
  };
}

type BoundedJsonBody<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 408 | 413 };

async function readBoundedJsonBody<T>(request: Request): Promise<BoundedJsonBody<T>> {
  const maxTotalImageBase64Length = Number(
    Deno.env.get("MAX_TOTAL_IMAGE_BASE64_LENGTH") ?? defaultMaxTotalImageBase64Length
  );
  const maxRequestBytes = maxTotalImageBase64Length + 100_000;
  const contentLength = request.headers.get("content-length");

  if (!Number.isFinite(maxTotalImageBase64Length) || maxTotalImageBase64Length <= 100) {
    return { ok: false, status: 413 };
  }

  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0 || parsedLength > maxRequestBytes) {
      return { ok: false, status: 413 };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, status: 400 };
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  const deadline = Date.now() + defaultBodyReadTimeoutMs;

  while (true) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      await cancelReader(reader);
      return { ok: false, status: 408 };
    }

    const chunk = await readChunkWithTimeout(reader, remainingMs);
    if (!chunk) {
      await cancelReader(reader);
      return { ok: false, status: 408 };
    }

    const { done, value } = chunk;
    if (done) {
      break;
    }

    receivedBytes += value.byteLength;
    if (receivedBytes > maxRequestBytes) {
      await cancelReader(reader);
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }

  try {
    const bodyText = new TextDecoder().decode(concatUint8Arrays(chunks, receivedBytes));
    return { ok: true, value: JSON.parse(bodyText) as T };
  } catch {
    return { ok: false, status: 400 };
  }
}

async function readChunkWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    await reader.cancel();
  } catch {
    // The request is already being rejected.
  }
}

function isDeclaredRequestTooLarge(request: Request) {
  const maxTotalImageBase64Length = Number(
    Deno.env.get("MAX_TOTAL_IMAGE_BASE64_LENGTH") ?? defaultMaxTotalImageBase64Length
  );
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }

  const parsedLength = Number(contentLength);
  return (
    !Number.isFinite(maxTotalImageBase64Length) ||
    maxTotalImageBase64Length <= 100 ||
    !Number.isFinite(parsedLength) ||
    parsedLength < 0 ||
    parsedLength > maxTotalImageBase64Length + 100_000
  );
}

function concatUint8Arrays(chunks: Uint8Array[], totalLength: number) {
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function extractOpenAiOutputText(data: any): string {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new Error("No text output returned from OpenAI.");
}

function extractOpenAiUsage(data: any): AnalysisUsage {
  return compactUsage({
    inputTokens: readNonNegativeInteger(data?.usage?.input_tokens),
    outputTokens: readNonNegativeInteger(data?.usage?.output_tokens),
    thinkingTokens: readNonNegativeInteger(data?.usage?.output_tokens_details?.reasoning_tokens)
  });
}

function extractChatCompletionText(data: any): string {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item?.text ?? item?.content ?? "")
      .filter((value) => typeof value === "string")
      .join("\n");
  }

  throw new Error("No text output returned from chat completion.");
}

function extractChatCompletionUsage(data: any): AnalysisUsage {
  return compactUsage({
    inputTokens: readNonNegativeInteger(data?.usage?.prompt_tokens),
    outputTokens: readNonNegativeInteger(data?.usage?.completion_tokens),
    thinkingTokens: readNonNegativeInteger(data?.usage?.completion_tokens_details?.reasoning_tokens)
  });
}

function extractGeminiOutputText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error("No text output returned from Gemini.");
  }

  const text = parts
    .map((part) => part?.text)
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("No text output returned from Gemini.");
  }

  return text;
}

function extractGeminiUsage(data: any): AnalysisUsage {
  return compactUsage({
    inputTokens: readNonNegativeInteger(data?.usageMetadata?.promptTokenCount),
    outputTokens: readNonNegativeInteger(data?.usageMetadata?.candidatesTokenCount),
    thinkingTokens: readNonNegativeInteger(data?.usageMetadata?.thoughtsTokenCount)
  });
}

function extractGeminiSourceReferences(data: any): SourceReference[] {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) {
    return [];
  }

  const seen = new Set<string>();
  return chunks
    .map((chunk) => {
      const web = chunk?.web;
      const uri = typeof web?.uri === "string" ? web.uri.trim() : "";
      const title = typeof web?.title === "string" ? web.title.trim() : "";

      return {
        title: title || uri,
        uri,
        source: "Google Search grounding"
      };
    })
    .filter((source) => {
      if (!source.uri || seen.has(source.uri)) {
        return false;
      }
      seen.add(source.uri);
      return true;
    })
    .slice(0, 6);
}

function extractGeminiWebSearchQueries(data: any): string[] {
  const queries = data?.candidates?.[0]?.groundingMetadata?.webSearchQueries;
  if (!Array.isArray(queries)) {
    return [];
  }

  return queries
    .filter((query): query is string => typeof query === "string" && query.trim().length > 0)
    .map((query) => query.trim())
    .slice(0, 6);
}

function extractJsonText(value: string): string {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseModelJson(text: string): Record<string, unknown> {
  const jsonText = extractJsonText(text);

  try {
    const parsed = JSON.parse(jsonText);
    if (isRecord(parsed)) {
      return parsed;
    }
    if (typeof parsed === "string") {
      const nested = JSON.parse(extractJsonText(parsed));
      if (isRecord(nested)) {
        return nested;
      }
    }
  } catch {
    throw new Error("Model JSON output could not be parsed.");
  }

  throw new Error("Model JSON output was not an object.");
}

function isHttpsUrl(value: unknown): boolean {
  const text = readString(value);
  if (!text) {
    return false;
  }

  try {
    return new URL(text).protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedMimeType(value: unknown): value is MenuImagePayload["mimeType"] {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

function isValidProfile(value: unknown): value is UserProfile {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !readString(value.id) ||
    !readString(value.name) ||
    readString(value.name).length > maxProfileNameLength ||
    !readString(value.preferredLanguage) ||
    readString(value.preferredLanguage).length > maxLanguageLength ||
    !Array.isArray(value.allergies) ||
    value.allergies.length === 0 ||
    value.allergies.length > 25
  ) {
    return false;
  }

  if (
    value.restaurantLanguage !== undefined &&
    value.restaurantLanguage !== null &&
    (typeof value.restaurantLanguage !== "string" || value.restaurantLanguage.trim().length > maxLanguageLength)
  ) {
    return false;
  }

  return value.allergies.every(isValidAllergy);
}

function isValidAllergy(value: unknown): value is Allergy {
  if (!isRecord(value)) {
    return false;
  }

  const severity = value.severity;
  const notes = value.notes;

  return Boolean(
    readString(value.id) &&
      readString(value.name) &&
      readString(value.name).length <= maxAllergyNameLength &&
      (severity === "mild" || severity === "moderate" || severity === "severe") &&
      typeof value.avoidCrossContact === "boolean" &&
      (notes === undefined || notes === null || (typeof notes === "string" && notes.length <= maxAllergyNotesLength))
  );
}

function isBase64ImagePayload(value: string) {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function readEvidenceConfidence(value: unknown): EvidenceConfidence {
  const text = readString(value);
  return evidenceConfidenceValues.has(text as EvidenceConfidence) ? text as EvidenceConfidence : "low";
}

function readRiskBasisArray(value: unknown): RiskBasis[] {
  if (!Array.isArray(value)) {
    return ["unknown_ingredient"];
  }

  return uniqueRiskBasis(
    value.filter((item): item is RiskBasis => typeof item === "string" && riskBasisValues.has(item as RiskBasis))
  );
}

function uniqueRiskBasis(values: unknown[]): RiskBasis[] {
  const riskBasis = values.filter((value): value is RiskBasis =>
    typeof value === "string" && riskBasisValues.has(value as RiskBasis)
  );

  return riskBasis.length > 0 ? Array.from(new Set(riskBasis)) : ["unknown_ingredient"];
}

function readSourceReferences(value: unknown): SourceReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((source) => ({
      title: readString(source.title),
      uri: readString(source.uri),
      source: readString(source.source) || null
    }))
    .filter((source) => source.title && isHttpsUrl(source.uri))
    .slice(0, 6);
}

async function recordAnalysisEvent(event: AnalysisEvent) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("AI metrics write skipped", event.requestId, "missing_service_configuration");
    return;
  }

  try {
    const response = await fetchWithTimeout(
      `${trimTrailingSlash(supabaseUrl)}/rest/v1/sift_ai_analysis_events`,
      {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          request_id: event.requestId,
          provider: event.provider,
          model: event.model,
          prompt_version: promptVersion,
          schema_version: schemaVersion,
          outcome: event.outcome,
          failure_code: event.failureCode,
          latency_ms: event.latencyMs,
          image_bytes: event.imageBytes,
          input_tokens: event.usage?.inputTokens ?? null,
          output_tokens: event.usage?.outputTokens ?? null,
          thinking_tokens: event.usage?.thinkingTokens ?? null,
          dish_count: event.dishCount,
          image_readability: event.imageReadability,
          plan_id: event.planId
        })
      },
      2_000
    );

    if (!response.ok) {
      console.error("AI metrics write failed", event.requestId, response.status);
    }
  } catch (error) {
    console.error("AI metrics write failed", event.requestId, getSafeErrorMessage(error));
  }
}

function compactUsage(usage: AnalysisUsage): AnalysisUsage {
  return Object.fromEntries(
    Object.entries(usage).filter(([, value]) => typeof value === "number")
  ) as AnalysisUsage;
}

function readNonNegativeInteger(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function estimateBase64Bytes(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((value.length * 3) / 4) - padding);
}

function estimateImagesBytes(images: MenuImagePayload[]) {
  return images.reduce((total, image) => total + estimateBase64Bytes(image.imageBase64), 0);
}

function getProviderFailureCode(error: unknown) {
  if (error instanceof ProviderConfigurationError) {
    return error.failureCode;
  }

  if (error instanceof ProviderRequestError) {
    return error.failureCode;
  }

  if (isRecord(error) && readString(error.name) === "AbortError") {
    return "provider_timeout";
  }

  if (error instanceof SyntaxError) {
    return "invalid_model_json";
  }

  const message = getSafeErrorMessage(error).toLowerCase();
  if (message.includes("no text output")) {
    return "empty_model_output";
  }
  if (message.includes("model json output could not be parsed")) {
    return "invalid_model_json";
  }
  if (message.includes("model json output was not an object")) {
    return "invalid_model_shape";
  }

  return "provider_failure";
}

function publicAnalysisFailureCategory(failureCode: string) {
  if (failureCode.includes("http_429") || failureCode.includes("RESOURCE_EXHAUSTED")) {
    return "provider_rate_limited";
  }
  if (failureCode === "provider_timeout") {
    return "provider_timeout";
  }
  if (failureCode === "invalid_model_json" || failureCode === "invalid_model_shape") {
    return "model_output_invalid";
  }
  return "provider_unavailable";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

async function analysisResponseHeaders(
  provider: AnalysisProvider,
  model: string,
  usage?: AnalysisUsage
) {
  const wireConfiguration = getProviderWireConfiguration(provider);
  const provenance = await createConfigurationProvenance({
    provider,
    model,
    thinkingLevel: wireConfiguration.thinkingLevel,
    maxOutputTokens: getProviderMaxOutputTokens(provider),
    providerSettings: wireConfiguration.providerSettings,
    wireSchema: wireConfiguration.wireSchema,
    gitCommitSha: readHeaderIdentity("SIFT_GIT_COMMIT_SHA"),
    edgeDeploymentId: readHeaderIdentity("SIFT_EDGE_DEPLOYMENT_ID")
  });

  return {
    "X-Sift-Analysis-Provider": provider,
    "X-Sift-Analysis-Model": model,
    "X-Sift-Analysis-Configuration": [
      `configuration_sha256=${provenance.configurationSha256}`,
      `prompt=${provenance.promptVersion}`,
      `prompt_sha256=${provenance.systemPromptSha256}`,
      `system_prompt_sha256=${provenance.systemPromptSha256}`,
      `user_prompt_sha256=${provenance.userPromptSha256}`,
      `schema=${provenance.schemaVersion}`,
      `provider_schema_sha256=${provenance.providerSchemaSha256}`,
      `wire_schema_sha256=${provenance.wireSchemaSha256 ?? "none"}`,
      `public_schema_sha256=${provenance.publicSchemaSha256}`,
      `policy=${provenance.riskPolicyVersion}`,
      `policy_sha256=${provenance.riskPolicySha256}`,
      `ontology=${provenance.ontologyVersion}`,
      `ontology_sha256=${provenance.ontologySha256}`,
      `normalization=${provenance.normalizationVersion}`,
      `normalization_sha256=${provenance.normalizationSha256}`,
      `safety_language=${provenance.safetyLanguageVersion}`,
      `safety_language_sha256=${provenance.safetyLanguageSha256}`,
      `provider_validation=${provenance.providerValidationVersion}`,
      `provider_validation_sha256=${provenance.providerValidationSha256}`,
      `public_validation=${provenance.publicValidationVersion}`,
      `public_validation_sha256=${provenance.publicValidationSha256}`,
      `preprocessing=${provenance.imagePreprocessingVersion}`,
      `preprocessing_sha256=${provenance.imagePreprocessingSha256}`,
      `thinking=${wireConfiguration.thinkingLevel}`,
      `max_output_tokens=${provenance.maxOutputTokens}`,
      `git_commit=${provenance.gitCommitSha ?? "unknown"}`,
      `edge_deployment_id=${provenance.edgeDeploymentId ?? "unknown"}`
    ].join(";"),
    ...analysisUsageHeaders(usage)
  };
}

function analysisUsageHeaders(usage?: AnalysisUsage) {
  const headers: Record<string, string> = {};
  const entries: Array<[string, number | undefined]> = [
    ["X-Sift-Input-Tokens", usage?.inputTokens],
    ["X-Sift-Output-Tokens", usage?.outputTokens],
    ["X-Sift-Thinking-Tokens", usage?.thinkingTokens]
  ];

  for (const [name, value] of entries) {
    if (Number.isSafeInteger(value) && (value as number) >= 0) {
      headers[name] = String(value);
    }
  }

  return headers;
}

function readHeaderIdentity(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) return null;
  return value.replace(/[^A-Za-z0-9._:@/-]/g, "_").slice(0, 160);
}

function getProviderWireConfiguration(provider: AnalysisProvider) {
  const transportSettings = {
    timeoutMs: getProviderTimeoutMs(),
    maximumAttempts: 1
  };

  if (provider === "openai") {
    const reasoningEffort = getOpenAiReasoningEffort();
    return {
      thinkingLevel: reasoningEffort,
      providerSettings: {
        endpoint: "https://api.openai.com/v1/responses",
        ...transportSettings,
        reasoningEffort,
        verbosity: "low",
        responseFormat: "json_schema",
        strict: true
      },
      wireSchema: modelScanResultSchema
    };
  }

  if (provider === "nvidia") {
    return {
      thinkingLevel: "not_applicable",
      providerSettings: {
        endpoint: `${getNvidiaBaseUrl()}/chat/completions`,
        ...transportSettings,
        temperature: getNvidiaTemperature(),
        responseFormat: "json_schema",
        strict: false
      },
      wireSchema: modelScanResultSchema
    };
  }

  if (provider === "gemini") {
    const responseSchemaEnabled = isGeminiResponseSchemaEnabled();
    return {
      thinkingLevel: getGeminiThinkingLevel(),
      providerSettings: {
        endpoint: "generativelanguage.googleapis.com/v1beta:generateContent",
        ...transportSettings,
        responseMimeType: "application/json",
        responseSchemaEnabled,
        groundingEnabled: isGeminiGroundingEnabled(),
        mediaResolution: getGeminiMediaResolution(),
        promptContentOrder: getGeminiPromptContentOrder(),
        temperature: "provider_default"
      },
      wireSchema: responseSchemaEnabled ? toGeminiOpenApiSchema(modelScanResultSchema) : null
    };
  }

  return rejectUnsupportedProvider(provider);
}

function getProviderMaxOutputTokens(provider: AnalysisProvider) {
  if (provider === "openai") {
    return Number(Deno.env.get("OPENAI_MAX_OUTPUT_TOKENS") ?? 3500);
  }
  if (provider === "nvidia") {
    return Number(Deno.env.get("NVIDIA_MAX_TOKENS") ?? 3500);
  }
  if (provider === "gemini") {
    return Number(Deno.env.get("GEMINI_MAX_OUTPUT_TOKENS") ?? 6000);
  }
  return rejectUnsupportedProvider(provider);
}

function rejectUnsupportedProvider(provider: never): never {
  void provider;
  throw new ProviderConfigurationError();
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function readErrorPreview(response: Response) {
  const text = await response.text();
  return {
    status: response.status,
    statusText: response.statusText,
    classification: classifyProviderError(text)
  };
}

function classifyProviderError(value: string) {
  try {
    const parsed = JSON.parse(value);
    const status = readString(parsed?.error?.status).replace(/[^A-Z0-9_]+/gi, "_").slice(0, 30);
    const details = Array.isArray(parsed?.error?.details) ? parsed.error.details : [];
    const field = details
      .flatMap((detail: unknown) => isRecord(detail) && Array.isArray(detail.fieldViolations) ? detail.fieldViolations : [])
      .map((violation: unknown) => isRecord(violation) ? readString(violation.field) : "")
      .find(Boolean)
      ?.replace(/[^A-Za-z0-9_.-]+/g, "_")
      .slice(0, 40);
    if (status && field) {
      return `${status}:${field}`;
    }
    if (status) {
      return status;
    }
  } catch {
    // Non-JSON provider failures keep only their HTTP status.
  }
  return "";
}

function redactSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/key=([^&\s]+)/gi, "key=[REDACTED]")
    .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "data:image/[REDACTED];base64,[REDACTED]")
    .replace(/[A-Za-z0-9+/]{200,}={0,2}/g, "[REDACTED_BASE64]");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = getProviderTimeoutMs()
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}
