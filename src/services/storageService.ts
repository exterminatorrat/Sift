import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  defaultSubscriptionPlanId,
  isSubscriptionPlanId
} from "../constants/subscriptionPlans";
import { UserProfile } from "../types/allergy";
import { ScanResult } from "../types/scan";
import { SubscriptionPlanId } from "../types/subscription";

const keys = {
  onboardingComplete: "sift:onboardingComplete",
  cameraGuideComplete: "sift:cameraGuideComplete",
  profile: "sift:profile",
  profiles: "sift:profiles",
  activeProfileId: "sift:activeProfileId",
  scanHistory: "sift:scanHistory",
  restaurantLanguage: "sift:restaurantLanguage",
  subscriptionPlan: "sift:subscriptionPlan"
};

export type StoredAppState = {
  onboardingComplete: boolean;
  cameraGuideComplete: boolean;
  profile: UserProfile | null;
  profiles: UserProfile[];
  activeProfileId: string | null;
  scanHistory: ScanResult[];
  restaurantLanguage: string | null;
  subscriptionPlan: SubscriptionPlanId;
};

export async function loadStoredAppState(): Promise<StoredAppState> {
  const [
    onboardingComplete,
    cameraGuideComplete,
    profile,
    profiles,
    activeProfileId,
    scanHistory,
    restaurantLanguage,
    subscriptionPlan
  ] = await Promise.all([
    AsyncStorage.getItem(keys.onboardingComplete),
    AsyncStorage.getItem(keys.cameraGuideComplete),
    AsyncStorage.getItem(keys.profile),
    AsyncStorage.getItem(keys.profiles),
    AsyncStorage.getItem(keys.activeProfileId),
    AsyncStorage.getItem(keys.scanHistory),
    AsyncStorage.getItem(keys.restaurantLanguage),
    AsyncStorage.getItem(keys.subscriptionPlan)
  ]);

  const legacyProfile = profile ? JSON.parse(profile) as UserProfile : null;
  const savedProfiles = profiles ? JSON.parse(profiles) as UserProfile[] : [];
  const normalizedProfiles = savedProfiles.length > 0 ? savedProfiles : legacyProfile ? [legacyProfile] : [];

  return {
    onboardingComplete: onboardingComplete === "true",
    cameraGuideComplete: cameraGuideComplete === "true",
    profile: legacyProfile,
    profiles: normalizedProfiles,
    activeProfileId: activeProfileId ?? normalizedProfiles[0]?.id ?? null,
    scanHistory: scanHistory ? JSON.parse(scanHistory) : [],
    restaurantLanguage,
    subscriptionPlan: isSubscriptionPlanId(subscriptionPlan) ? subscriptionPlan : defaultSubscriptionPlanId
  };
}

export async function saveOnboardingComplete(value: boolean) {
  await AsyncStorage.setItem(keys.onboardingComplete, String(value));
}

export async function saveCameraGuideComplete(value: boolean) {
  await AsyncStorage.setItem(keys.cameraGuideComplete, String(value));
}

export async function saveProfile(profile: UserProfile) {
  await AsyncStorage.setItem(keys.profile, JSON.stringify(profile));
  await saveProfiles([profile], profile.id);
  if (profile.restaurantLanguage) {
    await AsyncStorage.setItem(keys.restaurantLanguage, profile.restaurantLanguage);
  }
}

export async function saveProfiles(profiles: UserProfile[], activeProfileId: string) {
  await AsyncStorage.setItem(keys.profiles, JSON.stringify(profiles));
  await AsyncStorage.setItem(keys.activeProfileId, activeProfileId);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  if (activeProfile) {
    await AsyncStorage.setItem(keys.profile, JSON.stringify(activeProfile));
    if (activeProfile.restaurantLanguage) {
      await AsyncStorage.setItem(keys.restaurantLanguage, activeProfile.restaurantLanguage);
    }
  }
}

export async function saveScanHistory(scanHistory: ScanResult[]) {
  await AsyncStorage.setItem(keys.scanHistory, JSON.stringify(scanHistory));
}

export async function saveSubscriptionPlan(subscriptionPlan: SubscriptionPlanId) {
  await AsyncStorage.setItem(keys.subscriptionPlan, subscriptionPlan);
}

export async function clearScanHistory() {
  await AsyncStorage.removeItem(keys.scanHistory);
}
