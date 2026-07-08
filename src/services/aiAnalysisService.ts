import { UserProfile } from "../types/allergy";
import { PreparedMenuImage } from "../types/image";
import { ScanResult } from "../types/scan";
import { validateScanResult } from "../utils/scanResultValidation";
import { getMockScanResult } from "./mockAnalysisService";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const ANALYSIS_MODE = process.env.EXPO_PUBLIC_ANALYSIS_MODE ?? "mock";
const ANALYSIS_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_ANALYSIS_TIMEOUT_MS ?? 45000);

export type AnalyzeMenuRequest = {
  profile: UserProfile;
  image: PreparedMenuImage;
  restaurantLanguage?: string;
};

export async function analyzeMenuImage(request: AnalyzeMenuRequest): Promise<ScanResult> {
  if (ANALYSIS_MODE !== "supabase" || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return withImageUri(
      getMockScanResult(request.profile),
      request.image.uri,
      "mock",
      request.profile.preferredLanguage
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-menu`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        profile: request.profile,
        imageBase64: request.image.base64,
        mimeType: request.image.mimeType,
        restaurantLanguage: request.restaurantLanguage
      })
    });

    if (!response.ok) {
      throw new Error("Menu analysis failed.");
    }

    const scanResult = await response.json();
    const validation = validateScanResult(scanResult);
    if (!validation.ok) {
      throw new Error(`Menu analysis returned an invalid response: ${validation.error}`);
    }

    return withImageUri(
      validation.value,
      request.image.uri,
      validation.value.analysisSource ?? "ai",
      request.profile.preferredLanguage
    );
  } catch {
    return createUnclearScanResult(request.profile, request.image.uri);
  } finally {
    clearTimeout(timeout);
  }
}

export function createUnclearScanResult(profile: UserProfile, imageUri?: string): ScanResult {
  return {
    id: `scan-error-${Date.now()}`,
    createdAt: new Date().toISOString(),
    imageUri,
    restaurantName: null,
    profileId: profile.id,
    analysisLanguage: profile.preferredLanguage,
    analysisSource: "fallback",
    scanSummary: {
      overallRisk: "unclear",
      summary: "We could not analyze this menu clearly. Please retake the photo or ask staff directly.",
      limitations: "Sift can only analyze visible menu text and common ingredient patterns."
    },
    dishes: [
      {
        id: "unclear-menu",
        dishName: "Menu image unclear",
        riskLevel: "unclear",
        possibleAllergens: [],
        hiddenRiskIngredients: [],
        crossContactConcerns: [],
        reason: "The image or model response did not provide enough reliable menu detail.",
        questionsToAsk: [
          "Can you confirm whether this dish contains any of my listed allergens?",
          "Can you confirm whether sauces, oils, broths, marinades, or garnishes contain these allergens?",
          "Is this prepared on shared equipment with my allergens?"
        ],
        questionsToAskUserLanguage: [
          "Can you confirm whether this dish contains any of my listed allergens?",
          "Can you confirm whether sauces, oils, broths, marinades, or garnishes contain these allergens?",
          "Is this prepared on shared equipment with my allergens?"
        ],
        conservativeLanguage: "Not enough information. Retake the photo or ask staff directly.",
        transparency: {
          visibleMenuText: ["Menu image or analysis result was unclear."],
          profileFactors: profile.allergies.map((allergy) => `${allergy.name}: ${allergy.severity}`),
          commonRiskPatterns: ["Sauces, oils, broths, marinades, and shared equipment could not be checked."],
          uncertainty: ["The image or model response did not provide enough reliable menu detail."]
        }
      }
    ],
    imageQuality: {
      readability: "poor",
      issues: ["analysis_failed"]
    },
    transparency: {
      checked: ["Menu photo", "Allergy profile"],
      limitations: ["Sift could not extract enough reliable menu detail from this scan."],
      sourceReferences: [],
      webSearchQueries: []
    }
  };
}

function withImageUri(
  scanResult: ScanResult,
  imageUri?: string,
  analysisSource?: ScanResult["analysisSource"],
  analysisLanguage?: string | null
): ScanResult {
  return {
    ...scanResult,
    id: scanResult.id || `scan-${Date.now()}`,
    createdAt: scanResult.createdAt || new Date().toISOString(),
    imageUri,
    analysisLanguage: analysisLanguage ?? scanResult.analysisLanguage ?? null,
    analysisSource: analysisSource ?? scanResult.analysisSource
  };
}
