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
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return jsonResponse({ error: "Analysis service is not configured." }, 500);
    }

    const body = await request.json() as Partial<AnalyzeMenuRequest>;
    if (!isValidRequest(body)) {
      return jsonResponse({ error: "Invalid analysis request." }, 400);
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
                text: buildUserPrompt(body)
              },
              {
                type: "input_image",
                image_url: `data:${body.mimeType};base64,${body.imageBase64}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      console.error("OpenAI analysis failed", response.status, await response.text());
      return jsonResponse({ error: "Menu analysis failed." }, 502);
    }

    const data = await response.json();
    const outputText = extractOutputText(data);
    const scanResult = JSON.parse(outputText) as ScanResult;
    const validationError = validateScanResult(scanResult);

    if (validationError) {
      console.error("Invalid model response", validationError);
      return jsonResponse({ error: "Menu analysis returned an invalid response." }, 502);
    }

    return jsonResponse({
      ...scanResult,
      id: scanResult.id || `scan-${Date.now()}`,
      createdAt: scanResult.createdAt || new Date().toISOString(),
      imageUri: null,
      profileId: body.profile.id,
      analysisSource: "ai",
      analysisModel: model
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "We could not analyze this menu clearly." }, 500);
  }
});

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
    "Return only JSON matching the provided schema."
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

function extractOutputText(data: any): string {
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
