type AllergySeverity = "mild" | "moderate" | "severe";
type RiskLevel = "low_risk" | "ask_staff" | "high_risk" | "avoid_unless_confirmed" | "unclear";
type ImageReadability = "clear" | "partially_clear" | "poor";

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
};

type AnalysisProvider = "openai" | "nvidia";

type AnalysisOutput = {
  model: string;
  provider: AnalysisProvider;
  text: string;
};

type ScanResult = {
  id: string;
  createdAt: string;
  imageUri?: string | null;
  restaurantName?: string | null;
  profileId: string;
  analysisSource?: "ai";
  analysisModel?: string | null;
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
    reason: string;
    questionsToAsk: string[];
    conservativeLanguage: string;
  }>;
  restaurantMessage?: {
    english: string;
    translated?: string | null;
    language?: string | null;
  } | null;
  imageQuality: {
    readability: ImageReadability;
    issues: string[];
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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
    "imageQuality"
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
          "reason",
          "questionsToAsk",
          "conservativeLanguage"
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
          reason: { type: "string" },
          questionsToAsk: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          conservativeLanguage: { type: "string" }
        }
      }
    },
    restaurantMessage: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["english", "translated", "language"],
      properties: {
        english: { type: "string" },
        translated: { type: ["string", "null"] },
        language: { type: ["string", "null"] }
      }
    },
    imageQuality: {
      type: "object",
      additionalProperties: false,
      required: ["readability", "issues"],
      properties: {
        readability: { type: "string", enum: ["clear", "partially_clear", "poor"] },
        issues: { type: "array", items: { type: "string" } }
      }
    }
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json() as Partial<AnalyzeMenuRequest>;
    if (!isValidRequest(body)) {
      return jsonResponse({ error: "Invalid analysis request." }, 400);
    }

    const analysis = await analyzeMenu(body);
    const scanResult = normalizeScanResult(
      JSON.parse(extractJsonText(analysis.text)) as Partial<ScanResult>,
      body.profile.id
    );
    const validationError = validateScanResult(scanResult);

    if (validationError) {
      console.error("Invalid model response", validationError, analysis.provider, analysis.model);
      return jsonResponse({ error: "Menu analysis returned an invalid response." }, 502);
    }

    return jsonResponse({
      ...scanResult,
      imageUri: null,
      analysisSource: "ai",
      analysisModel: analysis.model
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "We could not analyze this menu clearly." }, 500);
  }
});

async function analyzeMenu(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const provider = getAnalysisProvider();

  if (provider === "nvidia") {
    return analyzeWithNvidia(request);
  }

  return analyzeWithOpenAi(request);
}

function getAnalysisProvider(): AnalysisProvider {
  const provider = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase();
  return provider === "nvidia" ? "nvidia" : "openai";
}

async function analyzeWithOpenAi(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    throw new Error("OpenAI analysis service is not configured.");
  }

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
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
          schema: scanResultSchema
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
    console.error("OpenAI analysis failed", response.status, await response.text());
    throw new Error("OpenAI menu analysis failed.");
  }

  const data = await response.json();
  return {
    model,
    provider: "openai",
    text: extractOpenAiOutputText(data)
  };
}

async function analyzeWithNvidia(request: AnalyzeMenuRequest): Promise<AnalysisOutput> {
  const nvidiaKey = Deno.env.get("NVIDIA_API_KEY");
  if (!nvidiaKey) {
    throw new Error("NVIDIA analysis service is not configured.");
  }

  const baseUrl = trimTrailingSlash(Deno.env.get("NVIDIA_BASE_URL") ?? "https://integrate.api.nvidia.com/v1");
  const model = Deno.env.get("NVIDIA_MODEL") ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
  const response = await fetch(`${baseUrl}/chat/completions`, {
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
    console.error("NVIDIA analysis failed", response.status, await response.text());
    throw new Error("NVIDIA menu analysis failed.");
  }

  const data = await response.json();
  return {
    model,
    provider: "nvidia",
    text: extractChatCompletionText(data)
  };
}

function buildSystemPrompt() {
  return [
    "You are Sift, an allergy-aware restaurant menu risk assistant.",
    "Your job is to analyze visible menu text from an image and identify possible allergen risks for the provided user profile.",
    "You are not a doctor, restaurant, kitchen worker, or food safety certifier.",
    "You cannot verify ingredients, preparation, staff practices, suppliers, substitutions, or cross-contact.",
    "Never write: safe to eat, safe for you, you can eat this, probably fine, guaranteed, completely safe, or allergen-free.",
    "Use conservative wording such as: low risk based on visible menu text, ask staff before ordering, avoid unless staff can clearly confirm, or not enough information.",
    "For severe allergies, escalate any reasonable hidden ingredient or cross-contact concern.",
    "Treat sauces, broths, marinades, dressings, oils, spice mixes, garnishes, batters, coatings, desserts, shared fryers, shared woks, shared grills, and vague descriptions as risk signals.",
    "If text is blurry, cut off, translated poorly, unreadable, or ingredients are not listed, mark affected dishes unclear or ask_staff.",
    "For low_risk, still include confirmation language when allergies are severe.",
    "Questions must be specific, short, and usable with restaurant staff.",
    "If a target restaurant language is requested, provide a simple polite translated restaurant message. If uncertain, keep translated null.",
    "Return only JSON matching the provided schema.",
    "Use camelCase keys exactly as specified: scanSummary, overallRisk, dishName, riskLevel, possibleAllergens, hiddenRiskIngredients, crossContactConcerns, questionsToAsk, conservativeLanguage, restaurantMessage, imageQuality.",
    `Required JSON schema: ${JSON.stringify(scanResultSchema)}`
  ].join("\n");
}

function buildUserPrompt(request: AnalyzeMenuRequest) {
  return JSON.stringify({
    task: "Analyze this menu image for possible allergen risk.",
    appName: "Sift",
    userProfile: request.profile,
    restaurantLanguage: request.restaurantLanguage ?? request.profile.restaurantLanguage ?? null,
    outputRequirements: {
      oneCardPerVisibleDishWhenPossible: true,
      keepSummariesShort: true,
      keepReasonsUnderTwoSentences: true,
      includeCommonHiddenIngredientPatterns: true,
      includeCrossContactWhenRelevant: true,
      includeRestaurantFacingMessage: true,
      limitationsText: "Visible menu text and common ingredient patterns only.",
      riskLevels: ["low_risk", "ask_staff", "high_risk", "avoid_unless_confirmed", "unclear"]
    }
  });
}

function isValidRequest(value: Partial<AnalyzeMenuRequest>): value is AnalyzeMenuRequest {
  return Boolean(
    value &&
      isRecord(value.profile) &&
      typeof value.profile.id === "string" &&
      Array.isArray(value.profile.allergies) &&
      value.profile.allergies.length > 0 &&
      typeof value.imageBase64 === "string" &&
      value.imageBase64.length > 100 &&
      isAllowedMimeType(value.mimeType)
  );
}

function validateScanResult(value: ScanResult): string | null {
  if (!isRecord(value)) {
    return "result_not_object";
  }

  if (containsBannedSafetyLanguage(value)) {
    return "banned_safety_language";
  }

  if (!readString(value.id) || !readString(value.createdAt) || !readString(value.profileId)) {
    return "missing_result_identity";
  }

  if (!isRecord(value.scanSummary) || !riskLevels.has(value.scanSummary.overallRisk)) {
    return "invalid_summary";
  }

  if (!readString(value.scanSummary.summary) || !readString(value.scanSummary.limitations)) {
    return "incomplete_summary";
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

  if (!Array.isArray(value.imageQuality.issues)) {
    return "invalid_image_quality_issues";
  }

  if (value.restaurantMessage && !readString(value.restaurantMessage.english)) {
    return "invalid_restaurant_message";
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
    !isStringArray(dish.possibleAllergens) ||
    !isStringArray(dish.hiddenRiskIngredients) ||
    !isStringArray(dish.crossContactConcerns) ||
    !isStringArray(dish.questionsToAsk) ||
    dish.questionsToAsk.length === 0
  ) {
    return "dish_invalid_arrays";
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

function normalizeScanResult(value: Partial<ScanResult>, profileId: string): ScanResult {
  return {
    id: readString(value.id) || `scan-${Date.now()}`,
    createdAt: readString(value.createdAt) || new Date().toISOString(),
    imageUri: null,
    restaurantName: typeof value.restaurantName === "string" ? value.restaurantName : null,
    profileId,
    scanSummary: {
      overallRisk: riskLevels.has(value.scanSummary?.overallRisk as RiskLevel)
        ? value.scanSummary!.overallRisk
        : "unclear",
      summary: readString(value.scanSummary?.summary) || "We could not analyze this menu clearly.",
      limitations:
        readString(value.scanSummary?.limitations) ||
        "Visible menu text and common ingredient patterns only."
    },
    dishes: Array.isArray(value.dishes)
      ? value.dishes.map((dish, index) => normalizeDish(dish, index))
      : [createUnclearDish()],
    restaurantMessage: value.restaurantMessage
      ? {
          english: readString(value.restaurantMessage.english),
          translated:
            typeof value.restaurantMessage.translated === "string"
              ? value.restaurantMessage.translated
              : null,
          language:
            typeof value.restaurantMessage.language === "string"
              ? value.restaurantMessage.language
              : null
        }
      : null,
    imageQuality: {
      readability: readabilityValues.has(value.imageQuality?.readability as ImageReadability)
        ? value.imageQuality!.readability
        : "poor",
      issues: isStringArray(value.imageQuality?.issues) ? value.imageQuality!.issues : []
    }
  };
}

function normalizeDish(value: unknown, index: number): ScanResult["dishes"][number] {
  const dish: Record<string, unknown> = isRecord(value) ? value : {};
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
    reason: readString(dish.reason) || "The model did not provide enough reliable detail.",
    questionsToAsk: readStringArray(dish.questionsToAsk ?? dish.questions_to_ask).length > 0
      ? readStringArray(dish.questionsToAsk ?? dish.questions_to_ask)
      : ["Can you confirm whether this dish contains any of my listed allergens?"],
    conservativeLanguage:
      readString(dish.conservativeLanguage ?? dish.safe_language) ||
      "Not enough information. Ask staff before ordering."
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
    reason: "The image or model response did not provide enough reliable menu detail.",
    questionsToAsk: [
      "Can you confirm whether this dish contains any of my listed allergens?"
    ],
    conservativeLanguage: "Not enough information. Retake the photo or ask staff directly."
  };
}

function containsBannedSafetyLanguage(value: unknown): boolean {
  const bannedPatterns = [
    /safe to eat/i,
    /safe for (you|the user|this allergy)/i,
    /you can eat/i,
    /probably fine/i,
    /guaranteed/i,
    /completely safe/i,
    /allergen[- ]free/i
  ];

  if (typeof value === "string") {
    return bannedPatterns.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some(containsBannedSafetyLanguage);
  }

  if (isRecord(value)) {
    return Object.values(value).some(containsBannedSafetyLanguage);
  }

  return false;
}

function isAllowedMimeType(value: unknown): value is AnalyzeMenuRequest["mimeType"] {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
