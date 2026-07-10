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

type AnalyzeMenuRequest = {
  profile: UserProfile;
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  restaurantLanguage?: string;
  testPlanId?: SubscriptionPlanId;
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
  scanSummary: {
    overallRisk: RiskLevel;
    summary: string;
    limitations: string;
  };
  dishes: Array<{
    id: string;
    dishName: string;
    menuDescription?: string | null;
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

const riskLevels = new Set<RiskLevel>([
  "low_risk",
  "ask_staff",
  "high_risk",
  "avoid_unless_confirmed",
  "unclear"
]);

const readabilityValues = new Set<ImageReadability>(["clear", "partially_clear", "poor"]);
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
const defaultProviderTimeoutMs = 22_000;
const promptVersion = "2026-07-10.4";
const schemaVersion = "5";
const retryableProviderStatuses = new Set([429, 500, 502, 503, 504]);
const maxImmediateRetryElapsedMs = 5_000;
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

const riskRank: Record<RiskLevel, number> = {
  low_risk: 0,
  ask_staff: 1,
  unclear: 1,
  high_risk: 2,
  avoid_unless_confirmed: 3
};

const allergenRiskPatterns: Record<string, string[]> = {
  sesame: ["sesame", "sesame oil", "tahini", "goma", "furikake", "za'atar", "benne"],
  peanut: ["peanut", "groundnut", "satay", "mole", "arachide", "peanut oil"],
  dairy: ["dairy", "milk", "cream", "butter", "ghee", "whey", "casein", "cheese", "queso", "paneer"],
  egg: ["egg", "mayo", "mayonnaise", "aioli", "custard"],
  soy: ["soy", "soy sauce", "tofu", "miso", "tamari", "edamame"],
  "wheat/gluten": ["wheat", "gluten", "flour", "batter", "breadcrumbs", "soy sauce", "noodles", "seitan"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
  "tree nuts": ["tree nut", "tree nuts", "almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "macadamia"],
  fish: ["fish", "fish sauce", "anchovy", "bacalhau", "pescado", "poisson", "fisch", "pesce", "peixe"],
  mustard: ["mustard", "mostaza", "moutarde", "senf", "senfsauce", "senape", "mostarda"],
  sulfites: ["sulfite", "sulfites", "sulphite", "sulphites", "sulfit", "sulfito", "sulfitos", "wine", "wein", "vino", "vin"],
  mango: ["mango", "mangue", "manga"]
};

const directAllergenPatterns: Record<string, string[]> = {
  sesame: ["sesame", "sesame oil", "tahini", "goma", "benne", "sesamo", "ajonjoli", "sésame", "sesam", "gergelim", "ごま", "ゴマ", "胡麻", "참깨", "참기름", "芝麻", "芝麻酱", "香油", "งา", "น้ำมันงา"],
  peanut: ["peanut", "groundnut", "arachide", "peanut oil", "cacahuate", "cacahuete", "mani", "maní", "erdnuss", "amendoim", "ピーナッツ", "落花生", "땅콩", "花生", "ถั่วลิสง"],
  dairy: ["dairy", "milk", "cream", "butter", "ghee", "whey", "casein", "cheese", "queso", "paneer", "lait", "beurre", "creme", "crème", "fromage", "milch", "sahne", "käse", "burro", "panna", "formaggio", "parmigiano", "leite", "manteiga", "queijo", "牛乳", "乳製品", "버터", "우유", "牛奶", "奶", "นม", "เนย"],
  egg: ["egg", "mayo", "mayonnaise", "aioli", "custard", "huevo", "oeuf", "œuf", "ei", "uovo", "ovo", "卵", "玉子", "계란", "달걀", "鸡蛋", "蛋", "ไข่"],
  soy: ["soy", "soy sauce", "tofu", "miso", "tamari", "edamame", "soja", "しょうゆ", "醤油", "大豆", "豆腐", "味噌", "간장", "대두", "두부", "酱油", "ซีอิ๊ว", "ถั่วเหลือง"],
  "wheat/gluten": ["wheat", "gluten", "flour", "breadcrumbs", "seitan"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop", "marisco", "camarón", "crevette", "gambero", "gamberi", "garnele", "camarão", "えび", "エビ", "かに", "カニ", "새우", "게", "虾", "蝦", "蟹", "กุ้ง", "ปู"],
  "tree nuts": ["tree nut", "tree nuts", "almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "macadamia"],
  fish: ["fish", "pescado", "poisson", "fisch", "pesce", "peixe", "bacalhau", "魚", "鱼", "생선", "ปลา"],
  mustard: ["mustard", "mostaza", "moutarde", "senf", "senfsauce", "senape", "mostarda", "マスタード", "겨자", "芥末", "มัสตาร์ด"],
  sulfites: ["sulfite", "sulfites", "sulphite", "sulphites", "sulfit", "sulfito", "sulfitos", "亜硫酸塩", "아황산염", "亚硫酸盐", "ซัลไฟต์"],
  mango: ["mango", "mangue", "manga", "マンゴー", "망고", "芒果", "มะม่วง"]
};

const vaguePrepPatterns = [
  "house sauce",
  "signature sauce",
  "dressing",
  "marinade",
  "broth",
  "batter",
  "fried",
  "shared fryer",
  "shared grill",
  "wok-tossed",
  "spice mix",
  "garnish"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Sift-Analysis-Failure"
};

const scanResultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "createdAt",
    "imageUri",
    "restaurantName",
    "profileId",
    "scanSummary",
    "dishes",
    "restaurantMessage",
    "imageQuality",
    "transparency"
  ],
  properties: {
    id: { type: "string" },
    createdAt: { type: "string" },
    imageUri: { type: ["string", "null"] },
    restaurantName: { type: ["string", "null"] },
    profileId: { type: "string" },
    scanSummary: {
      type: "object",
      additionalProperties: false,
      required: ["overallRisk", "summary", "limitations"],
      properties: {
        overallRisk: {
          type: "string",
          enum: ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]
        },
        summary: { type: "string" },
        limitations: { type: "string" }
      }
    },
    dishes: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "dishName",
          "menuDescription",
          "riskLevel",
          "possibleAllergens",
          "hiddenRiskIngredients",
          "crossContactConcerns",
          "evidenceConfidence",
          "riskBasis",
          "reason",
          "questionsToAsk",
          "questionsToAskUserLanguage",
          "conservativeLanguage",
          "transparency"
        ],
        properties: {
          id: { type: "string" },
          dishName: { type: "string" },
          menuDescription: { type: ["string", "null"] },
          riskLevel: {
            type: "string",
            enum: ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]
          },
          possibleAllergens: { type: "array", items: { type: "string" } },
          hiddenRiskIngredients: { type: "array", items: { type: "string" } },
          crossContactConcerns: { type: "array", items: { type: "string" } },
          evidenceConfidence: { type: "string", enum: ["high", "medium", "low"] },
          riskBasis: {
            type: "array",
            minItems: 1,
            items: {
              type: "string",
              enum: [
                "visible_text",
                "common_pattern",
                "unknown_ingredient",
                "cross_contact",
                "translation_uncertain",
                "image_uncertain"
              ]
            }
          },
          reason: { type: "string" },
          questionsToAsk: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          questionsToAskUserLanguage: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          conservativeLanguage: { type: "string" },
          transparency: {
            type: "object",
            additionalProperties: false,
            required: ["visibleMenuText", "profileFactors", "commonRiskPatterns", "uncertainty"],
            properties: {
              visibleMenuText: { type: "array", maxItems: 5, items: { type: "string" } },
              profileFactors: { type: "array", maxItems: 5, items: { type: "string" } },
              commonRiskPatterns: { type: "array", maxItems: 5, items: { type: "string" } },
              uncertainty: { type: "array", maxItems: 5, items: { type: "string" } }
            }
          }
        }
      }
    },
    restaurantMessage: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["english", "translated", "language", "userLanguageText", "userLanguage"],
      properties: {
        english: { type: "string" },
        translated: { type: ["string", "null"] },
        language: { type: ["string", "null"] },
        userLanguageText: { type: ["string", "null"] },
        userLanguage: { type: ["string", "null"] }
      }
    },
    imageQuality: {
      type: "object",
      additionalProperties: false,
      required: ["readability", "issues", "needsRetake"],
      properties: {
        readability: { type: "string", enum: ["clear", "partially_clear", "poor"] },
        issues: { type: "array", items: { type: "string" } },
        needsRetake: { type: "boolean" }
      }
    },
    transparency: {
      type: "object",
      additionalProperties: false,
      required: ["checked", "limitations", "sourceReferences", "webSearchQueries"],
      properties: {
        checked: { type: "array", maxItems: 6, items: { type: "string" } },
        limitations: { type: "array", maxItems: 6, items: { type: "string" } },
        sourceReferences: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "uri", "source"],
            properties: {
              title: { type: "string" },
              uri: { type: "string" },
              source: { type: ["string", "null"] }
            }
          }
        },
        webSearchQueries: { type: "array", items: { type: "string" } }
      }
    }
  }
};

// Provider-facing schema. Server-owned identity and transparency fields are
// normalized and validated after inference to keep Gemini's schema tractable.
const modelScanResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["restaurantName", "scanSummary", "dishes", "restaurantMessage", "imageQuality"],
  properties: {
    restaurantName: { type: "string" },
    scanSummary: {
      type: "object",
      additionalProperties: false,
      required: ["overallRisk", "summary", "limitations"],
      properties: {
        overallRisk: {
          type: "string",
          enum: ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]
        },
        summary: { type: "string" },
        limitations: { type: "string" }
      }
    },
    dishes: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "dishName",
          "menuDescription",
          "riskLevel",
          "possibleAllergens",
          "hiddenRiskIngredients",
          "crossContactConcerns",
          "evidenceConfidence",
          "riskBasis",
          "reason",
          "questionsToAsk",
          "questionsToAskUserLanguage",
          "conservativeLanguage"
        ],
        properties: {
          dishName: { type: "string" },
          menuDescription: { type: "string" },
          riskLevel: {
            type: "string",
            enum: ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]
          },
          possibleAllergens: { type: "array", maxItems: 12, items: { type: "string" } },
          hiddenRiskIngredients: { type: "array", maxItems: 12, items: { type: "string" } },
          crossContactConcerns: { type: "array", maxItems: 8, items: { type: "string" } },
          evidenceConfidence: { type: "string", enum: ["high", "medium", "low"] },
          riskBasis: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: {
              type: "string",
              enum: [
                "visible_text",
                "common_pattern",
                "unknown_ingredient",
                "cross_contact",
                "translation_uncertain",
                "image_uncertain"
              ]
            }
          },
          reason: { type: "string" },
          questionsToAsk: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          questionsToAskUserLanguage: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          conservativeLanguage: { type: "string" }
        }
      }
    },
    restaurantMessage: {
      type: "object",
      additionalProperties: false,
      required: ["english", "translated", "language", "userLanguageText", "userLanguage"],
      properties: {
        english: { type: "string" },
        translated: { type: "string" },
        language: { type: "string" },
        userLanguageText: { type: "string" },
        userLanguage: { type: "string" }
      }
    },
    imageQuality: {
      type: "object",
      additionalProperties: false,
      required: ["readability", "issues", "needsRetake"],
      properties: {
        readability: { type: "string", enum: ["clear", "partially_clear", "poor"] },
        issues: { type: "array", maxItems: 8, items: { type: "string" } },
        needsRetake: { type: "boolean" }
      }
    }
  }
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
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    const parsedBody = await readBoundedJsonBody<Partial<AnalyzeMenuRequest>>(request);
    if (!parsedBody.ok) {
      return jsonResponse({ error: "Invalid analysis request." }, parsedBody.status);
    }

    const body = parsedBody.value;
    if (!isValidRequest(body)) {
      return jsonResponse({ error: "Invalid analysis request." }, 400);
    }

    const entitlement = await resolveEntitlement(auth.userId, body.testPlanId);
    const quota = await claimMenuScanQuota(auth.userId, entitlement.planId, entitlement.scanLimit);
    if (!quota.allowed) {
      await recordAnalysisEvent({
        requestId,
        provider: null,
        model: null,
        outcome: "quota_rejected",
        failureCode: "monthly_quota_reached",
        latencyMs: Date.now() - requestStartedAt,
        imageBytes: estimateBase64Bytes(body.imageBase64),
        dishCount: null,
        imageReadability: null,
        planId: entitlement.planId
      });
      return jsonResponse(
        {
          error: "Monthly scan limit reached.",
          scanCount: quota.scanCount,
          scanLimit: quota.scanLimit,
          monthStart: quota.monthStart
        },
        429
      );
    }

    const provider = getAnalysisProvider();
    const configuredModel = getConfiguredModel(provider);

    try {
      const analysis = await analyzeMenuWithRetry(body);
      const scanResult = verifyScanResultRisk(sanitizeScanResult(
        mergeAnalysisSources(
          normalizeScanResult(parseModelJson(analysis.text), body.profile.id),
          analysis
        )
      ), body.profile);
      const validationError = validateScanResult(scanResult);

      if (validationError) {
        console.error("Invalid model response", requestId, validationError, analysis.provider, analysis.model);
        const fallback = withAnalysisMetadata(
          createFallbackScanResult(body.profile.id, analysis.model),
          requestId
        );
        await recordAnalysisEvent({
          requestId,
          provider: analysis.provider,
          model: analysis.model,
          outcome: "fallback",
          failureCode: `invalid_model_response:${validationError}`.slice(0, 80),
          latencyMs: Date.now() - requestStartedAt,
          imageBytes: estimateBase64Bytes(body.imageBase64),
          usage: analysis.usage,
          dishCount: fallback.dishes.length,
          imageReadability: fallback.imageQuality.readability,
          planId: entitlement.planId
        });
        return jsonResponse(fallback, 200, {
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
        imageBytes: estimateBase64Bytes(body.imageBase64),
        usage: analysis.usage,
        dishCount: responseResult.dishes.length,
        imageReadability: responseResult.imageQuality.readability,
        planId: entitlement.planId
      });
      return jsonResponse(responseResult);
    } catch (error) {
      const failureCode = getProviderFailureCode(error);
      console.error("Menu analysis provider failure", requestId, failureCode);
      const fallback = withAnalysisMetadata(
        createFallbackScanResult(body.profile.id, configuredModel),
        requestId
      );
      await recordAnalysisEvent({
        requestId,
        provider,
        model: configuredModel,
        outcome: "fallback",
        failureCode,
        latencyMs: Date.now() - requestStartedAt,
        imageBytes: estimateBase64Bytes(body.imageBase64),
        dishCount: fallback.dishes.length,
        imageReadability: fallback.imageQuality.readability,
        planId: entitlement.planId
      });
      return jsonResponse(fallback, 200, {
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
  | { ok: false };

type EntitlementResult = {
  planId: SubscriptionPlanId;
  scanLimit: number;
};

type QuotaResult = {
  allowed: boolean;
  scanCount: number;
  scanLimit: number;
  monthStart: string;
};

async function authenticateRequest(request: Request): Promise<AuthResult> {
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return { ok: false };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("Supabase auth environment is not configured.");
    return { ok: false };
  }

  const response = await fetch(`${trimTrailingSlash(supabaseUrl)}/auth/v1/user`, {
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return { ok: false };
  }

  const user = await response.json();
  const userId = readString(user?.id);
  return userId ? { ok: true, userId } : { ok: false };
}

async function resolveEntitlement(
  userId: string,
  testPlanId?: SubscriptionPlanId
): Promise<EntitlementResult> {
  const requestedTestPlan = isTestEntitlementSyncEnabled() && isPlanId(testPlanId) ? testPlanId : null;
  const rpcName = requestedTestPlan ? "sift_set_test_entitlement" : "sift_get_or_create_entitlement";
  const params = requestedTestPlan
    ? { p_user_id: userId, p_plan_id: requestedTestPlan }
    : { p_user_id: userId };
  const entitlement = await callSupabaseRpc<{ plan_id?: string }>(rpcName, params);
  const planId = isPlanId(entitlement?.plan_id) ? entitlement.plan_id : "free";

  return {
    planId,
    scanLimit: planScanLimits[planId]
  };
}

async function claimMenuScanQuota(
  userId: string,
  planId: SubscriptionPlanId,
  scanLimit: number
): Promise<QuotaResult> {
  const quota = await callSupabaseRpc<{
    allowed?: boolean;
    scan_count?: number;
    scan_limit?: number;
    month_start?: string;
  }>("sift_claim_menu_scan", {
    p_user_id: userId,
    p_plan_id: planId,
    p_scan_limit: scanLimit
  });

  return {
    allowed: quota?.allowed === true,
    scanCount: Number(quota?.scan_count ?? 0),
    scanLimit: Number(quota?.scan_limit ?? scanLimit),
    monthStart: readString(quota?.month_start)
  };
}

async function callSupabaseRpc<T>(functionName: string, params: Record<string, unknown>): Promise<T | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment is not configured.");
  }

  const response = await fetch(`${trimTrailingSlash(supabaseUrl)}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(params)
  });

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

function isTestEntitlementSyncEnabled() {
  return Deno.env.get("ALLOW_TEST_ENTITLEMENT_SYNC") === "true";
}

class ProviderRequestError extends Error {
  constructor(
    readonly provider: AnalysisProvider,
    readonly status: number | null,
    readonly failureCode: string,
    readonly retryAfterMs = 250
  ) {
    super(failureCode);
  }
}

async function analyzeMenuWithRetry(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const startedAt = Date.now();

  try {
    return await analyzeMenu(request);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    if (
      !(error instanceof ProviderRequestError) ||
      error.status === null ||
      !retryableProviderStatuses.has(error.status) ||
      elapsedMs > maxImmediateRetryElapsedMs
    ) {
      throw error;
    }

    await delay(Math.min(Math.max(error.retryAfterMs, 0), 1_000));
    return analyzeMenu(request);
  }
}

async function analyzeMenu(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const provider = getAnalysisProvider();

  if (provider === "nvidia") {
    return analyzeWithNvidia(request);
  }

  if (provider === "gemini") {
    return analyzeWithGemini(request);
  }

  return analyzeWithOpenAi(request);
}

function getAnalysisProvider(): AnalysisProvider {
  const provider = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase();
  if (provider === "gemini") {
    return "gemini";
  }

  return provider === "nvidia" ? "nvidia" : "openai";
}

function getConfiguredModel(provider: AnalysisProvider) {
  if (provider === "gemini") {
    return Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";
  }

  if (provider === "nvidia") {
    return Deno.env.get("NVIDIA_MODEL") ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
  }

  return Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";
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
      reasoning: { effort: Deno.env.get("OPENAI_REASONING_EFFORT") ?? "low" },
      max_output_tokens: Number(Deno.env.get("OPENAI_MAX_OUTPUT_TOKENS") ?? 3500),
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
            {
              type: "input_image",
              image_url: `data:${request.mimeType};base64,${request.imageBase64}`
            }
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
      `openai_http_${response.status}`,
      readRetryAfterMs(response)
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

  const baseUrl = trimTrailingSlash(Deno.env.get("NVIDIA_BASE_URL") ?? "https://integrate.api.nvidia.com/v1");
  const model = Deno.env.get("NVIDIA_MODEL") ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${nvidiaKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: Number(Deno.env.get("NVIDIA_TEMPERATURE") ?? 0.1),
      max_tokens: Number(Deno.env.get("NVIDIA_MAX_TOKENS") ?? 3500),
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
            {
              type: "image_url",
              image_url: {
                url: `data:${request.mimeType};base64,${request.imageBase64}`
              }
            }
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
      `nvidia_http_${response.status}`,
      readRetryAfterMs(response)
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
            parts: [
              {
                text: buildUserPrompt(request)
              },
              {
                inlineData: {
                  mimeType: request.mimeType,
                  data: request.imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: buildGeminiGenerationConfig(),
        ...(Deno.env.get("GEMINI_ENABLE_GROUNDING") === "true"
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
      [`gemini_http_${response.status}`, errorPreview.classification].filter(Boolean).join(":").slice(0, 80),
      readRetryAfterMs(response)
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
  const baseConfig = {
    maxOutputTokens: Number(Deno.env.get("GEMINI_MAX_OUTPUT_TOKENS") ?? 6000),
    thinkingConfig: {
      thinkingLevel: getGeminiThinkingLevel()
    }
  };

  if (Deno.env.get("GEMINI_USE_RESPONSE_SCHEMA") === "false") {
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

function toGeminiOpenApiSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toGeminiOpenApiSchema);
  }

  if (!isRecord(value)) {
    return value;
  }

  const converted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "additionalProperties" || key === "minItems" || key === "maxItems") {
      continue;
    }

    converted[key] = key === "type" && typeof entry === "string"
      ? entry.toUpperCase()
      : toGeminiOpenApiSchema(entry);
  }

  return converted;
}

function getGeminiThinkingLevel() {
  const value = Deno.env.get("GEMINI_THINKING_LEVEL")?.trim().toLowerCase();
  return value === "minimal" || value === "low" || value === "high" ? value : "medium";
}

function buildSystemPrompt() {
  return [
    "You are Sift, an allergy-aware restaurant menu risk assistant.",
    "Your job is to analyze visible menu text from an image and identify possible allergen risks for the provided user profile.",
    "You are not a doctor, restaurant, kitchen worker, or food safety certifier.",
    "You cannot verify ingredients, preparation, staff practices, suppliers, substitutions, or cross-contact.",
    "Never write: safe to eat, safe for you, you can eat this, probably fine, guarantee, guaranteed, completely safe, allergen-free, safe option, safe choice, safe meal, safe dish, ok to eat, no risk, zero risk, riskless, nothing to worry about, definitely safe, or risk-free.",
    "Use conservative wording such as: low risk based on visible menu text, ask staff before ordering, avoid unless staff can clearly confirm, or not enough information.",
    "For severe allergies, escalate any reasonable hidden ingredient or cross-contact concern.",
    "For a severe allergy, if the visible dish name or description directly lists that allergen or an unmistakable derivative such as tahini for sesame, use avoid_unless_confirmed.",
    "Do not label an otherwise benign dish high_risk or avoid_unless_confirmed solely because a different dish on the same menu contains the allergen; use ask_staff for plausible shared-kitchen uncertainty unless the benign dish has its own direct evidence.",
    "Treat sauces, broths, marinades, dressings, oils, spice mixes, garnishes, batters, coatings, desserts, shared fryers, shared woks, shared grills, and vague descriptions as risk signals.",
    "If text is blurry, materially cut off, too small or distant to read confidently, translated poorly, unreadable, or ingredients are not listed, mark affected dishes unclear or ask_staff.",
    "Set imageQuality.readability to poor and needsRetake to true whenever multiple dish names or descriptions are cropped, the menu is distant enough that text must be guessed, glare or blur obscures ingredients, or only fragments are readable. Do this even if a few words can still be inferred.",
    "For low_risk, still include confirmation language when allergies are severe.",
    "Questions must be specific, short, and usable with restaurant staff.",
    "Preserve each dish name exactly as printed on the menu whenever it is readable, even when the explanatory text is translated into another language.",
    "For each dish, write questionsToAsk in the target restaurant language when provided. If no target restaurant language is provided, use the user's preferred language.",
    "For each dish, write questionsToAskUserLanguage in the user's preferred language as a direct translation/reference for the user.",
    "If a concrete target restaurant language is requested, restaurantMessage.translated must be a simple polite restaurant-facing message in that language.",
    "Only set restaurantMessage.translated to null when no restaurant language is requested, the restaurant language is explicitly unknown/not sure, or the requested restaurant language is English.",
    "Set restaurantMessage.userLanguageText to the same restaurant-facing allergy message translated into the user's preferred language. If the user's preferred language is English, this may match english.",
    "Set restaurantMessage.language to the restaurant language name and restaurantMessage.userLanguage to the user's preferred language name when known.",
    "For each dish, set evidenceConfidence to high, medium, or low based on visible text clarity and ingredient specificity.",
    "For each dish, set riskBasis to one or more of: visible_text, common_pattern, unknown_ingredient, cross_contact, translation_uncertain, image_uncertain.",
    "Set imageQuality.needsRetake to true when readability is poor or the image is too blurry/cut off to analyze reliably.",
    "Do not expose hidden chain-of-thought and do not invent citations, URLs, or web-search claims.",
    "Use restaurantName as a short 1-4 word saved-scan title, not necessarily a literal restaurant name. Summarize the whole menu theme, not individual dishes. Examples: Japanese menu, Mexican menu, Steak and seafood, Cafe breakfast.",
    "If no useful menu theme is visible, set restaurantName to Menu scan.",
    "Return only JSON matching the provided schema.",
    "Use camelCase keys exactly as specified: restaurantName, scanSummary, overallRisk, dishName, riskLevel, possibleAllergens, hiddenRiskIngredients, crossContactConcerns, evidenceConfidence, riskBasis, questionsToAsk, questionsToAskUserLanguage, conservativeLanguage, restaurantMessage, imageQuality, needsRetake.",
    `Required JSON schema: ${JSON.stringify(modelScanResultSchema)}`
  ].join("\n");
}

function buildUserPrompt(request: AnalyzeMenuRequest) {
  return JSON.stringify({
    task: "Analyze this menu image for possible allergen risk.",
    appName: "Sift",
    userProfile: request.profile,
    userLanguage: request.profile.preferredLanguage,
    restaurantLanguage: request.restaurantLanguage ?? request.profile.restaurantLanguage ?? null,
    outputRequirements: {
      oneCardPerVisibleDishWhenPossible: true,
      keepSummariesShort: true,
      keepReasonsUnderTwoSentences: true,
      createShortScanTitleInRestaurantName: true,
      includeCommonHiddenIngredientPatterns: true,
      includeCrossContactWhenRelevant: true,
      includeEvidenceConfidence: true,
      includeRiskBasis: true,
      includeRestaurantFacingMessage: true,
      includeUserFacingEvidence: true,
      doNotExposeHiddenChainOfThought: true,
      questionsToAskLanguage: "restaurant language when known; otherwise user language",
      questionsToAskUserLanguage: "translate each staff question into the user's preferred language",
      restaurantMessageTranslatedLanguage: "restaurant language when known",
      restaurantMessageTranslatedRequired: true,
      restaurantMessageUserLanguageText: "user preferred language",
      limitationsText: "Visible menu text and common ingredient patterns only.",
      evidenceConfidenceValues: ["high", "medium", "low"],
      riskBasisValues: ["visible_text", "common_pattern", "unknown_ingredient", "cross_contact", "translation_uncertain", "image_uncertain"],
      riskLevels: ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]
    }
  });
}

function isValidRequest(value: Partial<AnalyzeMenuRequest>): value is AnalyzeMenuRequest {
  const maxImageBase64Length = Number(Deno.env.get("MAX_IMAGE_BASE64_LENGTH") ?? defaultMaxImageBase64Length);

  if (!Number.isFinite(maxImageBase64Length) || maxImageBase64Length <= 100) {
    return false;
  }

  if (
    !value ||
    !isValidProfile(value.profile) ||
    !isAllowedMimeType(value.mimeType) ||
    typeof value.imageBase64 !== "string" ||
    value.imageBase64.length <= 100 ||
    value.imageBase64.length > maxImageBase64Length ||
    !isBase64ImagePayload(value.imageBase64)
  ) {
    return false;
  }

  if (
    value.restaurantLanguage !== undefined &&
    (!readString(value.restaurantLanguage) || readString(value.restaurantLanguage).length > maxLanguageLength)
  ) {
    return false;
  }

  if (value.testPlanId !== undefined && !isPlanId(value.testPlanId)) {
    return false;
  }

  return true;
}

type BoundedJsonBody<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413 };

async function readBoundedJsonBody<T>(request: Request): Promise<BoundedJsonBody<T>> {
  const maxImageBase64Length = Number(Deno.env.get("MAX_IMAGE_BASE64_LENGTH") ?? defaultMaxImageBase64Length);
  const maxRequestBytes = maxImageBase64Length + 50_000;
  const contentLength = request.headers.get("content-length");

  if (!Number.isFinite(maxImageBase64Length) || maxImageBase64Length <= 100) {
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    receivedBytes += value.byteLength;
    if (receivedBytes > maxRequestBytes) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancellation errors; the request is already rejected.
      }
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

function isDeclaredRequestTooLarge(request: Request) {
  const maxImageBase64Length = Number(Deno.env.get("MAX_IMAGE_BASE64_LENGTH") ?? defaultMaxImageBase64Length);
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }

  const parsedLength = Number(contentLength);
  return (
    !Number.isFinite(maxImageBase64Length) ||
    maxImageBase64Length <= 100 ||
    !Number.isFinite(parsedLength) ||
    parsedLength < 0 ||
    parsedLength > maxImageBase64Length + 50_000
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

function validateScanResult(value: ScanResult): string | null {
  if (!isRecord(value)) {
    return "result_not_object";
  }

  if (containsBannedSafetyLanguage(value)) {
    return "banned_safety_language";
  }

  if (!readString(value.id) || !isValidDateString(value.createdAt) || !readString(value.profileId)) {
    return "missing_result_identity";
  }

  if (!isRecord(value.scanSummary) || !riskLevels.has(value.scanSummary.overallRisk)) {
    return "invalid_summary";
  }

  if (!readString(value.scanSummary.summary) || !readString(value.scanSummary.limitations)) {
    return "incomplete_summary";
  }

  if (!hasConservativeUncertaintyText(value.scanSummary.limitations)) {
    return "summary_missing_uncertainty";
  }

  if (!Array.isArray(value.dishes) || value.dishes.length === 0) {
    return "missing_dishes";
  }

  for (const dish of value.dishes) {
    const error = validateDish(dish);
    if (error) {
      return error;
    }
  }

  if (!isRecord(value.imageQuality) || !readabilityValues.has(value.imageQuality.readability)) {
    return "invalid_image_quality";
  }

  if (!Array.isArray(value.imageQuality.issues) || typeof value.imageQuality.needsRetake !== "boolean") {
    return "invalid_image_quality_issues";
  }

  if (!isRecord(value.transparency) || !isStringArray(value.transparency.checked) || !isStringArray(value.transparency.limitations)) {
    return "invalid_transparency";
  }

  if (!Array.isArray(value.transparency.sourceReferences)) {
    return "invalid_transparency_sources";
  }

  if (value.transparency.sourceReferences.some((source) => !isRecord(source) || !isHttpsUrl(source.uri))) {
    return "invalid_transparency_source_uri";
  }

  if (value.restaurantMessage && !readString(value.restaurantMessage.english)) {
    return "invalid_restaurant_message";
  }

  if (
    value.restaurantMessage &&
    value.restaurantMessage.translated &&
    !readString(value.restaurantMessage.userLanguageText)
  ) {
    return "missing_user_language_restaurant_message";
  }

  return null;
}

function validateDish(dish: unknown): string | null {
  if (!isRecord(dish)) {
    return "dish_not_object";
  }

  if (!readString(dish.id) || !readString(dish.dishName) || !riskLevels.has(dish.riskLevel as RiskLevel)) {
    return "dish_missing_identity";
  }

  if (!readString(dish.reason) || !readString(dish.conservativeLanguage)) {
    return "dish_missing_reason";
  }

  if (
    dish.riskLevel === "low_risk" &&
    !hasConservativeUncertaintyText(`${readString(dish.reason)} ${readString(dish.conservativeLanguage)}`)
  ) {
    return "low_risk_missing_confirmation_language";
  }

  if (
    !isStringArray(dish.possibleAllergens) ||
    !isStringArray(dish.hiddenRiskIngredients) ||
    !isStringArray(dish.crossContactConcerns) ||
    !evidenceConfidenceValues.has(dish.evidenceConfidence as EvidenceConfidence) ||
    !isRiskBasisArray(dish.riskBasis) ||
    !isStringArray(dish.questionsToAsk) ||
    !isStringArray(dish.questionsToAskUserLanguage) ||
    dish.questionsToAsk.length === 0 ||
    !isRecord(dish.transparency)
  ) {
    return "dish_invalid_arrays";
  }

  if (dish.questionsToAskUserLanguage.length === 0) {
    return "dish_missing_user_language_questions";
  }

  if (
    !isStringArray(dish.transparency.visibleMenuText) ||
    !isStringArray(dish.transparency.profileFactors) ||
    !isStringArray(dish.transparency.commonRiskPatterns) ||
    !isStringArray(dish.transparency.uncertainty)
  ) {
    return "dish_invalid_transparency";
  }

  return null;
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

function normalizeScanResult(value: Record<string, unknown>, profileId: string): ScanResult {
  const scanSummary = readRecord(value.scanSummary) ?? readRecord(value.scan_summary);
  const restaurantMessage = readRecord(value.restaurantMessage) ?? readRecord(value.restaurant_message);
  const imageQuality = readRecord(value.imageQuality) ?? readRecord(value.image_quality);
  const transparency = readRecord(value.transparency);

  return {
    id: readString(value.id) || `scan-${Date.now()}`,
    createdAt: readString(value.createdAt ?? value.created_at) || new Date().toISOString(),
    imageUri: null,
    restaurantName: readString(value.restaurantName ?? value.restaurant_name) || null,
    profileId,
    scanSummary: {
      overallRisk: riskLevels.has(readString(scanSummary?.overallRisk ?? scanSummary?.overall_risk) as RiskLevel)
        ? readString(scanSummary?.overallRisk ?? scanSummary?.overall_risk) as RiskLevel
        : "unclear",
      summary: readString(scanSummary?.summary) || "We could not analyze this menu clearly.",
      limitations:
        readString(scanSummary?.limitations) ||
        "Visible menu text and common ingredient patterns only."
    },
    dishes: Array.isArray(value.dishes)
      ? ensureUniqueDishIds(value.dishes.map((dish, index) => normalizeDish(dish, index)))
      : [createUnclearDish()],
    restaurantMessage: restaurantMessage
      ? {
          english: readString(restaurantMessage.english),
          translated:
            typeof restaurantMessage.translated === "string"
              ? restaurantMessage.translated
              : null,
          language:
            typeof restaurantMessage.language === "string"
              ? restaurantMessage.language
              : null,
          userLanguageText:
            typeof restaurantMessage.userLanguageText === "string"
              ? restaurantMessage.userLanguageText
              : typeof restaurantMessage.user_language_text === "string"
                ? restaurantMessage.user_language_text
                : readString(restaurantMessage.english) || null,
          userLanguage:
            typeof restaurantMessage.userLanguage === "string"
              ? restaurantMessage.userLanguage
              : typeof restaurantMessage.user_language === "string"
                ? restaurantMessage.user_language
                : null
        }
      : null,
    imageQuality: {
      readability: readabilityValues.has(imageQuality?.readability as ImageReadability)
        ? imageQuality!.readability as ImageReadability
        : "poor",
      issues: isStringArray(imageQuality?.issues) ? imageQuality!.issues : [],
      needsRetake:
        typeof imageQuality?.needsRetake === "boolean"
          ? imageQuality.needsRetake
          : !readabilityValues.has(imageQuality?.readability as ImageReadability) || imageQuality?.readability === "poor"
    },
    transparency: {
      checked: readStringArray(transparency?.checked).length > 0
        ? readStringArray(transparency?.checked)
        : ["Menu photo", "Allergy profile", "Common ingredient and preparation patterns"],
      limitations: readStringArray(transparency?.limitations).length > 0
        ? readStringArray(transparency?.limitations)
        : ["Sift cannot verify full ingredients, staff practices, or kitchen cross-contact."],
      sourceReferences: readSourceReferences(transparency?.sourceReferences),
      webSearchQueries: readStringArray(transparency?.webSearchQueries)
    }
  };
}

function normalizeDish(value: unknown, index: number): ScanResult["dishes"][number] {
  const dish: Record<string, unknown> = isRecord(value) ? value : {};
  const questionsToAsk =
    readStringArray(dish.questionsToAsk ?? dish.questions_to_ask).length > 0
      ? readStringArray(dish.questionsToAsk ?? dish.questions_to_ask)
      : ["Can you confirm whether this dish contains any of my listed allergens?"];
  const questionsToAskUserLanguage =
    readStringArray(dish.questionsToAskUserLanguage ?? dish.questions_to_ask_user_language).length > 0
      ? readStringArray(dish.questionsToAskUserLanguage ?? dish.questions_to_ask_user_language)
      : questionsToAsk;

  return {
    id: readString(dish.id) || `dish-${index + 1}`,
    dishName: readString(dish.dishName) || readString(dish.dish_name) || `Dish ${index + 1}`,
    menuDescription:
      typeof dish.menuDescription === "string"
        ? dish.menuDescription
        : typeof dish.menu_description === "string"
          ? dish.menu_description
          : null,
    riskLevel: riskLevels.has(dish.riskLevel as RiskLevel)
      ? dish.riskLevel as RiskLevel
      : riskLevels.has(dish.risk_level as RiskLevel)
        ? dish.risk_level as RiskLevel
        : "unclear",
    possibleAllergens: readStringArray(dish.possibleAllergens ?? dish.possible_allergens),
    hiddenRiskIngredients: readStringArray(dish.hiddenRiskIngredients ?? dish.hidden_risk_ingredients),
    crossContactConcerns: readStringArray(dish.crossContactConcerns ?? dish.cross_contact_concerns),
    evidenceConfidence: readEvidenceConfidence(dish.evidenceConfidence ?? dish.evidence_confidence),
    riskBasis: readRiskBasisArray(dish.riskBasis ?? dish.risk_basis),
    reason: readString(dish.reason) || "The model did not provide enough reliable detail.",
    questionsToAsk,
    questionsToAskUserLanguage,
    conservativeLanguage:
      readString(dish.conservativeLanguage ?? dish.safe_language) ||
      "Not enough information. Ask staff before ordering.",
    transparency: normalizeDishTransparency(dish)
  };
}

function ensureUniqueDishIds(dishes: ScanResult["dishes"]): ScanResult["dishes"] {
  const seen = new Map<string, number>();

  return dishes.map((dish, index) => {
    const baseId = dish.id || `dish-${index + 1}`;
    const seenCount = seen.get(baseId) ?? 0;
    seen.set(baseId, seenCount + 1);

    return {
      ...dish,
      id: seenCount === 0 ? baseId : `${baseId}-${seenCount + 1}`
    };
  });
}

function normalizeDishTransparency(dish: Record<string, unknown>): ScanResult["dishes"][number]["transparency"] {
  const transparency = readRecord(dish.transparency);
  return {
    visibleMenuText: readStringArray(transparency?.visibleMenuText).length > 0
      ? readStringArray(transparency?.visibleMenuText)
      : [readString(dish.dishName), readString(dish.menuDescription)].filter(Boolean),
    profileFactors: readStringArray(transparency?.profileFactors),
    commonRiskPatterns: readStringArray(transparency?.commonRiskPatterns),
    uncertainty: readStringArray(transparency?.uncertainty).length > 0
      ? readStringArray(transparency?.uncertainty)
      : ["Menu descriptions may omit sauces, oils, marinades, garnishes, and kitchen preparation details."]
  };
}

function createUnclearDish(): ScanResult["dishes"][number] {
  return {
    id: "unclear-menu",
    dishName: "Menu image unclear",
    menuDescription: null,
    riskLevel: "unclear",
    possibleAllergens: [],
    hiddenRiskIngredients: [],
    crossContactConcerns: [],
    evidenceConfidence: "low",
    riskBasis: ["image_uncertain", "unknown_ingredient"],
    reason: "The image or model response did not provide enough reliable menu detail.",
    questionsToAsk: [
      "Can you confirm whether this dish contains any of my listed allergens?"
    ],
    questionsToAskUserLanguage: [
      "Can you confirm whether this dish contains any of my listed allergens?"
    ],
    conservativeLanguage: "Not enough information. Retake the photo or ask staff directly.",
    transparency: {
      visibleMenuText: ["Menu image unclear"],
      profileFactors: [],
      commonRiskPatterns: ["Ingredients, sauces, oils, and preparation details could not be read."],
      uncertainty: ["The image or model response did not provide enough reliable menu detail."]
    }
  };
}

function createFallbackScanResult(profileId: string, analysisModel: string | null = null): ScanResult {
  return {
    id: `scan-unclear-${Date.now()}`,
    createdAt: new Date().toISOString(),
    imageUri: null,
    restaurantName: null,
    profileId,
    analysisSource: "fallback",
    analysisModel,
    scanSummary: {
      overallRisk: "unclear",
      summary: "We could not analyze this menu clearly. Please retake the photo or ask staff directly.",
      limitations: "Visible menu text and common ingredient patterns only."
    },
    dishes: [createUnclearDish()],
    restaurantMessage: null,
    imageQuality: {
      readability: "poor",
      issues: ["analysis_failed"],
      needsRetake: true
    },
    transparency: {
      checked: ["Menu photo", "Allergy profile"],
      limitations: ["Sift could not extract enough reliable menu detail from this scan."],
      sourceReferences: [],
      webSearchQueries: []
    }
  };
}

function withAnalysisMetadata(scanResult: ScanResult, requestId: string): ScanResult {
  return {
    ...scanResult,
    analysisRequestId: requestId
  };
}

function mergeAnalysisSources(scanResult: ScanResult, analysis: AnalysisOutput): ScanResult {
  const transparency = scanResult.transparency ?? {
    checked: ["Menu photo", "Allergy profile", "Common ingredient and preparation patterns"],
    limitations: ["Sift cannot verify full ingredients, staff practices, or kitchen cross-contact."],
    sourceReferences: [],
    webSearchQueries: []
  };

  return {
    ...scanResult,
    transparency: {
      ...transparency,
      sourceReferences:
        analysis.provider === "gemini" && analysis.sourceReferences
          ? analysis.sourceReferences
          : transparency.sourceReferences,
      webSearchQueries:
        analysis.provider === "gemini" && analysis.webSearchQueries
          ? analysis.webSearchQueries
          : transparency.webSearchQueries
    }
  };
}

function sanitizeScanResult(scanResult: ScanResult): ScanResult {
  return rewriteBannedSafetyLanguage(scanResult) as ScanResult;
}

function verifyScanResultRisk(scanResult: ScanResult, profile: UserProfile): ScanResult {
  const poorImage = scanResult.imageQuality.readability === "poor";
  const hasSevereAllergy = profile.allergies.some((allergy) => allergy.severity === "severe");

  const dishes = scanResult.dishes.map((dish) => {
    let nextDish = {
      ...dish,
      possibleAllergens: uniqueStrings(dish.possibleAllergens),
      hiddenRiskIngredients: uniqueStrings(dish.hiddenRiskIngredients),
      crossContactConcerns: uniqueStrings(dish.crossContactConcerns),
      riskBasis: uniqueRiskBasis(dish.riskBasis),
      evidenceConfidence: evidenceConfidenceValues.has(dish.evidenceConfidence)
        ? dish.evidenceConfidence
        : "low"
    };
    const dishText = buildDishSearchText(nextDish);
    const vaguePrepMatches = matchPatterns(dishText, vaguePrepPatterns);

    for (const allergy of profile.allergies) {
      const patterns = patternsForAllergy(allergy);
      if (patterns.length === 0) {
        continue;
      }

      const matchedPatterns = matchPatterns(dishText, patterns);
      if (matchedPatterns.length === 0) {
        continue;
      }

      const sensitive = allergy.severity === "severe" || allergy.avoidCrossContact;
      const directMatches = matchedPatterns.filter((pattern) => isDirectAllergenPattern(allergy, pattern));
      const targetRisk: RiskLevel =
        directMatches.length > 0
          ? sensitive
            ? "avoid_unless_confirmed"
            : "high_risk"
          : sensitive
            ? "ask_staff"
            : "ask_staff";

      nextDish = {
        ...nextDish,
        riskLevel: escalateRisk(nextDish.riskLevel, targetRisk),
        possibleAllergens: uniqueStrings([...nextDish.possibleAllergens, allergy.name]),
        hiddenRiskIngredients: uniqueStrings([...nextDish.hiddenRiskIngredients, ...matchedPatterns]),
        riskBasis: uniqueRiskBasis([
          ...nextDish.riskBasis,
          directMatches.length > 0 ? "visible_text" : "common_pattern"
        ]),
        transparency: appendDishTransparency(nextDish.transparency, {
          visibleMenuText: matchedPatterns,
          profileFactors: [`${allergy.name}: ${allergy.severity}${allergy.avoidCrossContact ? ", cross-contact sensitive" : ""}`],
          commonRiskPatterns: matchedPatterns,
          uncertainty: ["Sift escalated this result with deterministic allergen pattern checks."]
        })
      };
    }

    if (vaguePrepMatches.length > 0 && (hasSevereAllergy || profile.allergies.some((allergy) => allergy.avoidCrossContact))) {
      nextDish = {
        ...nextDish,
        riskLevel: escalateRisk(nextDish.riskLevel, "ask_staff"),
        hiddenRiskIngredients: uniqueStrings([...nextDish.hiddenRiskIngredients, ...vaguePrepMatches]),
        crossContactConcerns: uniqueStrings([...nextDish.crossContactConcerns, ...vaguePrepMatches]),
        riskBasis: uniqueRiskBasis([...nextDish.riskBasis, "unknown_ingredient", "cross_contact"]),
        transparency: appendDishTransparency(nextDish.transparency, {
          visibleMenuText: vaguePrepMatches,
          profileFactors: profile.allergies
            .filter((allergy) => allergy.severity === "severe" || allergy.avoidCrossContact)
            .map((allergy) => `${allergy.name}: ${allergy.severity}${allergy.avoidCrossContact ? ", cross-contact sensitive" : ""}`),
          commonRiskPatterns: vaguePrepMatches,
          uncertainty: ["Vague preparation terms can hide sauces, oils, shared equipment, or omitted ingredients."]
        })
      };
    }

    if ((poorImage || (hasSevereAllergy && nextDish.evidenceConfidence === "low")) && nextDish.riskLevel === "low_risk") {
      nextDish = {
        ...nextDish,
        riskLevel: poorImage ? "unclear" : "ask_staff",
        riskBasis: uniqueRiskBasis([...nextDish.riskBasis, poorImage ? "image_uncertain" : "unknown_ingredient"]),
        transparency: appendDishTransparency(nextDish.transparency, {
          uncertainty: [
            poorImage
              ? "Image quality is too poor to support a low-risk result."
              : "Low confidence is not enough to support low-risk language for a severe allergy profile."
          ]
        })
      };
    }

    return nextDish;
  });

  const materiallyTruncatedDishCount = dishes.filter((dish) =>
    /(^|\s)(?:\.{3}|…)/u.test(`${dish.dishName} ${dish.menuDescription ?? ""}`)
  ).length;
  const inferredPoorImage = poorImage || materiallyTruncatedDishCount >= 2;
  const imageQuality = {
    ...scanResult.imageQuality,
    readability: inferredPoorImage ? "poor" as const : scanResult.imageQuality.readability,
    issues: materiallyTruncatedDishCount >= 2
      ? uniqueStrings([...scanResult.imageQuality.issues, "Multiple menu entries are cut off."])
      : scanResult.imageQuality.issues,
    needsRetake: scanResult.imageQuality.needsRetake === true || inferredPoorImage
  };
  const overallRisk = inferredPoorImage ? "unclear" : recomputeOverallRisk(dishes);

  return {
    ...scanResult,
    dishes,
    imageQuality,
    scanSummary: {
      ...scanResult.scanSummary,
      overallRisk
    },
    transparency: {
      checked: scanResult.transparency?.checked ?? ["Menu photo", "Allergy profile", "Common ingredient and preparation patterns"],
      limitations: scanResult.transparency?.limitations ?? ["Sift cannot verify full ingredients, staff practices, or kitchen cross-contact."],
      sourceReferences: scanResult.transparency?.sourceReferences ?? [],
      webSearchQueries: scanResult.transparency?.webSearchQueries ?? []
    }
  };
}

function buildDishSearchText(dish: ScanResult["dishes"][number]) {
  return [
    dish.dishName,
    dish.menuDescription,
    ...(dish.transparency?.visibleMenuText ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

function patternsForAllergy(allergy: Allergy) {
  const allergyText = normalizeForMatch(`${allergy.name} ${allergy.notes ?? ""}`);
  const patternGroups = Array.from(new Set([
    ...Object.keys(allergenRiskPatterns),
    ...Object.keys(directAllergenPatterns)
  ])).map((key) => [
    key,
    uniqueStrings([
      ...(allergenRiskPatterns[key] ?? []),
      ...(directAllergenPatterns[key] ?? [])
    ])
  ] as const);
  const patterns = patternGroups
    .filter(([key, values]) => {
      const normalizedKey = normalizeForMatch(key);
      return (
        allergyText.includes(normalizedKey) ||
        normalizedKey.includes(allergyText) ||
        values.some((pattern) => allergyText.includes(normalizeForMatch(pattern)))
      );
    })
    .flatMap(([, values]) => values);

  return uniqueStrings([allergy.name, ...patterns]);
}

function matchPatterns(text: string, patterns: string[]) {
  const normalizedText = normalizeForMatch(text);
  const paddedText = ` ${normalizedText} `;
  return uniqueStrings(
    patterns.filter((pattern) => {
      const normalizedPattern = normalizeForMatch(pattern);
      if (!normalizedPattern) {
        return false;
      }

      return /[^a-z0-9 ]/u.test(normalizedPattern)
        ? normalizedText.includes(normalizedPattern)
        : paddedText.includes(` ${normalizedPattern} `);
    })
  );
}

function isDirectAllergenPattern(allergy: Allergy, pattern: string) {
  const allergyName = normalizeForMatch(allergy.name);
  const normalizedPattern = normalizeForMatch(pattern);
  const allergyText = normalizeForMatch(`${allergy.name} ${allergy.notes ?? ""}`);
  const matchingGroups = Object.entries(directAllergenPatterns)
    .filter(([key]) => {
      const normalizedKey = normalizeForMatch(key);
      return allergyText.includes(normalizedKey) || normalizedKey.includes(allergyName);
    })
    .flatMap(([, values]) => values.map(normalizeForMatch));

  return (
    allergyName === normalizedPattern ||
    allergyName.includes(normalizedPattern) ||
    normalizedPattern.includes(allergyName) ||
    matchingGroups.includes(normalizedPattern)
  );
}

function appendDishTransparency(
  transparency: ScanResult["dishes"][number]["transparency"],
  patch: Partial<NonNullable<ScanResult["dishes"][number]["transparency"]>>
) {
  return {
    visibleMenuText: uniqueStrings([...(transparency?.visibleMenuText ?? []), ...(patch.visibleMenuText ?? [])]).slice(0, 5),
    profileFactors: uniqueStrings([...(transparency?.profileFactors ?? []), ...(patch.profileFactors ?? [])]).slice(0, 5),
    commonRiskPatterns: uniqueStrings([...(transparency?.commonRiskPatterns ?? []), ...(patch.commonRiskPatterns ?? [])]).slice(0, 5),
    uncertainty: uniqueStrings([...(transparency?.uncertainty ?? []), ...(patch.uncertainty ?? [])]).slice(0, 5)
  };
}

function recomputeOverallRisk(dishes: ScanResult["dishes"]) {
  return dishes.reduce<RiskLevel>(
    (highest, dish) => (riskRank[dish.riskLevel] > riskRank[highest] ? dish.riskLevel : highest),
    "low_risk"
  );
}

function escalateRisk(current: RiskLevel, target: RiskLevel) {
  return riskRank[target] > riskRank[current] ? target : current;
}

function rewriteBannedSafetyLanguage(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/safe to eat/gi, "low risk based on visible menu text")
      .replace(/safe option/gi, "lower concern option based on visible menu text")
      .replace(/safe choice/gi, "lower concern choice based on visible menu text")
      .replace(/safe meal/gi, "lower concern meal based on visible menu text")
      .replace(/safe dish/gi, "lower concern dish based on visible menu text")
      .replace(/safe for (you|the user|this allergy)/gi, "low risk based on visible menu text")
      .replace(/you can eat/gi, "ask staff to confirm before ordering")
      .replace(/ok to eat/gi, "ask staff to confirm before ordering")
      .replace(/probably fine/gi, "low risk based on visible menu text, but confirm with staff")
      .replace(/\bguarantee(?:d|s|ing)?\b/gi, "confirm")
      .replace(/completely safe/gi, "low risk based on visible menu text")
      .replace(/definitely safe/gi, "low risk based on visible menu text")
      .replace(/no risk/gi, "no obvious risk based on visible menu text")
      .replace(/zero risk/gi, "no obvious risk based on visible menu text")
      .replace(/riskless/gi, "lower risk based on visible menu text")
      .replace(/risk[- ]free/gi, "lower risk based on visible menu text")
      .replace(/nothing to worry about/gi, "confirm details with staff before ordering")
      .replace(/allergen[- ]free/gi, "without the listed allergen based on available information");
  }

  if (Array.isArray(value)) {
    return value.map(rewriteBannedSafetyLanguage);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "uri" ? item : rewriteBannedSafetyLanguage(item)
      ])
    );
  }

  return value;
}

function containsBannedSafetyLanguage(value: unknown): boolean {
  const bannedPatterns = [
    /safe to eat/i,
    /safe option/i,
    /safe choice/i,
    /safe meal/i,
    /safe dish/i,
    /safe for (you|the user|this allergy)/i,
    /you can eat/i,
    /ok to eat/i,
    /probably fine/i,
    /\bguarantee(?:d|s|ing)?\b/i,
    /completely safe/i,
    /definitely safe/i,
    /no risk/i,
    /zero risk/i,
    /riskless/i,
    /nothing to worry about/i,
    /risk[- ]free/i,
    /allergen[- ]free/i
  ];

  if (typeof value === "string") {
    return bannedPatterns.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some(containsBannedSafetyLanguage);
  }

  if (isRecord(value)) {
    return Object.entries(value).some(([key, item]) => key !== "uri" && containsBannedSafetyLanguage(item));
  }

  return false;
}

function hasConservativeUncertaintyText(value: unknown): boolean {
  const text = readString(value).toLowerCase();
  return [
    "visible menu",
    "visible text",
    "confirm",
    "ask staff",
    "cannot verify",
    "cannot confirm",
    "not confirmed",
    "unclear",
    "uncertain",
    "cross-contact",
    "kitchen"
  ].some((phrase) => text.includes(phrase));
}

function isValidDateString(value: unknown): boolean {
  const text = readString(value);
  if (!text) {
    return false;
  }

  return Number.isFinite(Date.parse(text));
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

function isAllowedMimeType(value: unknown): value is AnalyzeMenuRequest["mimeType"] {
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRiskBasisArray(value: unknown): value is RiskBasis[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => riskBasisValues.has(item as RiskBasis));
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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
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

function getProviderFailureCode(error: unknown) {
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

function readRetryAfterMs(response: Response) {
  const value = response.headers.get("retry-after");
  if (!value) {
    return 250;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000);
  }

  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : 250;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function readErrorPreview(response: Response) {
  const text = await response.text();
  return {
    status: response.status,
    statusText: response.statusText,
    classification: classifyProviderError(text),
    bodyPreview: redactSensitiveText(text).slice(0, 500)
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
  timeoutMs = Number(Deno.env.get("AI_PROVIDER_TIMEOUT_MS") ?? defaultProviderTimeoutMs)
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
