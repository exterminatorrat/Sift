type Allergy = {
  id: string;
  name: string;
  severity: "mild" | "moderate" | "severe";
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const scanResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "createdAt", "profileId", "scanSummary", "dishes", "imageQuality"],
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
          questionsToAsk: { type: "array", items: { type: "string" } },
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
      return jsonResponse({ error: "OPENAI_API_KEY is not configured" }, 500);
    }

    const body = await request.json() as Partial<AnalyzeMenuRequest>;
    if (!isValidRequest(body)) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.5";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: "low" },
        text: {
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
      const errorText = await response.text();
      return jsonResponse({ error: "OpenAI analysis failed", detail: errorText }, 502);
    }

    const data = await response.json();
    const outputText = extractOutputText(data);
    const scanResult = JSON.parse(outputText);

    if (containsBannedSafetyLanguage(scanResult)) {
      return jsonResponse({ error: "Model response contained banned safety language" }, 502);
    }

    return jsonResponse({
      ...scanResult,
      id: scanResult.id || `scan-${Date.now()}`,
      createdAt: scanResult.createdAt || new Date().toISOString(),
      profileId: body.profile.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

function buildSystemPrompt() {
  return [
    "You are Sift, an allergy-aware menu risk assistant.",
    "Analyze visible restaurant menu text and possible hidden allergen risks from a menu image.",
    "You are not a doctor, restaurant, or food safety certifier.",
    "You cannot guarantee whether a dish is safe.",
    "Never say 'safe to eat' or 'safe'. Use 'low risk based on visible menu text' instead.",
    "Always be conservative for severe allergies and cross-contact sensitivity.",
    "Escalate risk for sauces, broths, marinades, oils, garnishes, shared fryers, shared equipment, and unclear descriptions.",
    "If the image is blurry, cut off, too vague, or ingredients are not visible, mark results as unclear.",
    "Generate short, specific questions the user can ask restaurant staff.",
    "Return only JSON matching the provided schema."
  ].join("\n");
}

function buildUserPrompt(request: AnalyzeMenuRequest) {
  return JSON.stringify({
    task: "Analyze this menu image for allergy risk.",
    profile: request.profile,
    restaurantLanguage: request.restaurantLanguage ?? request.profile.restaurantLanguage ?? null,
    outputNotes: {
      useCamelCaseFields: true,
      keepReasonsShort: true,
      includeRestaurantFacingMessage: true,
      limitations: "Visible menu text and common ingredient patterns only."
    }
  });
}

function isValidRequest(value: Partial<AnalyzeMenuRequest>): value is AnalyzeMenuRequest {
  return Boolean(
    value.profile &&
      Array.isArray(value.profile.allergies) &&
      value.imageBase64 &&
      value.mimeType
  );
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
  if (typeof value === "string") {
    return /safe to eat|you can eat this|probably fine/i.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(containsBannedSafetyLanguage);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(containsBannedSafetyLanguage);
  }

  return false;
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
