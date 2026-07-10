import { RiskLevel } from "./risk";

export type ScanSummary = {
  overallRisk: RiskLevel;
  summary: string;
  limitations: string;
};

export type RestaurantMessage = {
  english: string;
  translated?: string | null;
  language?: string | null;
  userLanguageText?: string | null;
  userLanguage?: string | null;
};

export type ImageQuality = {
  readability: "clear" | "partially_clear" | "poor";
  issues: string[];
  needsRetake?: boolean;
};

export type EvidenceConfidence = "high" | "medium" | "low";

export type RiskBasis =
  | "visible_text"
  | "common_pattern"
  | "unknown_ingredient"
  | "cross_contact"
  | "translation_uncertain"
  | "image_uncertain";

export type DishTransparency = {
  visibleMenuText: string[];
  profileFactors: string[];
  commonRiskPatterns: string[];
  uncertainty: string[];
};

export type SourceReference = {
  title: string;
  uri: string;
  source?: string | null;
};

export type ScanTransparency = {
  checked: string[];
  limitations: string[];
  sourceReferences: SourceReference[];
  webSearchQueries?: string[];
};

export type DishRisk = {
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
  transparency?: DishTransparency;
};

export type ScanResult = {
  id: string;
  createdAt: string;
  imageUri?: string | null;
  restaurantName?: string | null;
  profileId: string;
  analysisLanguage?: string | null;
  analysisSource?: "mock" | "ai" | "fallback";
  analysisModel?: string | null;
  analysisRequestId?: string | null;
  scanSummary: ScanSummary;
  dishes: DishRisk[];
  restaurantMessage?: RestaurantMessage;
  imageQuality: ImageQuality;
  transparency?: ScanTransparency;
};
