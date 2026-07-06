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
};

export type ImageQuality = {
  readability: "clear" | "partially_clear" | "poor";
  issues: string[];
};

export type DishRisk = {
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
  scanSummary: ScanSummary;
  dishes: DishRisk[];
  restaurantMessage?: RestaurantMessage;
  imageQuality: ImageQuality;
};
