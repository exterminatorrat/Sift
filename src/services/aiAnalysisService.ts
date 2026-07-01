import { UserProfile } from "../types/allergy";
import { PreparedMenuImage } from "../types/image";
import { ScanResult } from "../types/scan";
import { getMockScanResult } from "./mockAnalysisService";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const ANALYSIS_MODE = process.env.EXPO_PUBLIC_ANALYSIS_MODE ?? "mock";

export type AnalyzeMenuRequest = {
  profile: UserProfile;
  image: PreparedMenuImage;
  restaurantLanguage?: string;
};

export async function analyzeMenuImage(request: AnalyzeMenuRequest): Promise<ScanResult> {
  if (ANALYSIS_MODE !== "supabase" || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return withImageUri(getMockScanResult(request.profile), request.image.uri);
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-menu`, {
    method: "POST",
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
  if (!isScanResult(scanResult)) {
    throw new Error("Menu analysis returned an invalid response.");
  }

  return withImageUri(scanResult, request.image.uri);
}

export function createUnclearScanResult(profile: UserProfile, imageUri?: string): ScanResult {
  return {
    id: `scan-error-${Date.now()}`,
    createdAt: new Date().toISOString(),
    imageUri,
    profileId: profile.id,
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
        conservativeLanguage: "Not enough information. Retake the photo or ask staff directly."
      }
    ],
    imageQuality: {
      readability: "poor",
      issues: ["analysis_failed"]
    }
  };
}

function withImageUri(scanResult: ScanResult, imageUri?: string): ScanResult {
  return {
    ...scanResult,
    id: scanResult.id || `scan-${Date.now()}`,
    createdAt: scanResult.createdAt || new Date().toISOString(),
    imageUri
  };
}

function isScanResult(value: unknown): value is ScanResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ScanResult>;
  return Boolean(
    candidate.id &&
      candidate.scanSummary &&
      Array.isArray(candidate.dishes) &&
      candidate.imageQuality
  );
}
