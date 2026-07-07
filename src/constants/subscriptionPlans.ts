import { ScanResult } from "../types/scan";
import { SubscriptionPlanId } from "../types/subscription";
import { TranslationKey } from "../i18n/translations";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  label: string;
  nameKey: TranslationKey;
  priceKey: TranslationKey;
  bodyKey: TranslationKey;
  scanLimit: number;
  profileLimit: number;
  historyLimit: number;
  features: {
    translationCards: boolean;
    voicePlayback: boolean;
  };
  featureKeys: TranslationKey[];
  comingSoonKeys?: TranslationKey[];
};

export const defaultSubscriptionPlanId: SubscriptionPlanId = "free";

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    label: "Free",
    nameKey: "subscription.free",
    priceKey: "subscription.freePrice",
    bodyKey: "subscription.freeBody",
    scanLimit: 3,
    profileLimit: 1,
    historyLimit: 5,
    features: {
      translationCards: false,
      voicePlayback: false
    },
    featureKeys: [
      "subscription.feature.freeScans",
      "subscription.feature.freeProfiles",
      "subscription.feature.freeHistory",
      "subscription.feature.basicRisk"
    ]
  },
  {
    id: "plus",
    label: "Plus",
    nameKey: "subscription.plus",
    priceKey: "subscription.plusPrice",
    bodyKey: "subscription.plusBody",
    scanLimit: 50,
    profileLimit: 3,
    historyLimit: 50,
    features: {
      translationCards: true,
      voicePlayback: true
    },
    featureKeys: [
      "subscription.feature.plusScans",
      "subscription.feature.plusProfiles",
      "subscription.feature.plusHistory",
      "subscription.feature.translationCards",
      "subscription.feature.voicePlayback"
    ]
  },
  {
    id: "pro",
    label: "Pro",
    nameKey: "subscription.pro",
    priceKey: "subscription.proPrice",
    bodyKey: "subscription.proBody",
    scanLimit: 200,
    profileLimit: 5,
    historyLimit: 200,
    features: {
      translationCards: true,
      voicePlayback: true
    },
    featureKeys: [
      "subscription.feature.proScans",
      "subscription.feature.proProfiles",
      "subscription.feature.proHistory",
      "subscription.feature.translationCards",
      "subscription.feature.voicePlayback"
    ],
    comingSoonKeys: ["subscription.feature.travelTools"]
  },
  {
    id: "family",
    label: "Family",
    nameKey: "subscription.family",
    priceKey: "subscription.familyPrice",
    bodyKey: "subscription.familyBody",
    scanLimit: 500,
    profileLimit: 8,
    historyLimit: 500,
    features: {
      translationCards: true,
      voicePlayback: true
    },
    featureKeys: [
      "subscription.feature.familyScans",
      "subscription.feature.familyProfiles",
      "subscription.feature.familyHistory",
      "subscription.feature.translationCards",
      "subscription.feature.voicePlayback"
    ],
    comingSoonKeys: ["subscription.feature.familySupport"]
  }
];

export const subscriptionPlanById = subscriptionPlans.reduce(
  (plans, plan) => ({
    ...plans,
    [plan.id]: plan
  }),
  {} as Record<SubscriptionPlanId, SubscriptionPlan>
);

export function isSubscriptionPlanId(value: unknown): value is SubscriptionPlanId {
  return value === "free" || value === "plus" || value === "pro" || value === "family";
}

export function getSubscriptionPlan(planId: SubscriptionPlanId) {
  return subscriptionPlanById[planId];
}

export function getMonthlyScanCount(scanHistory: ScanResult[], now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();

  return scanHistory.filter((scan) => {
    const createdAt = new Date(scan.createdAt);

    return (
      !Number.isNaN(createdAt.getTime()) &&
      createdAt.getFullYear() === year &&
      createdAt.getMonth() === month
    );
  }).length;
}
