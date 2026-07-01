import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "../types/allergy";
import { ScanResult } from "../types/scan";

const keys = {
  onboardingComplete: "sift:onboardingComplete",
  profile: "sift:profile",
  scanHistory: "sift:scanHistory",
  restaurantLanguage: "sift:restaurantLanguage"
};

export type StoredAppState = {
  onboardingComplete: boolean;
  profile: UserProfile | null;
  scanHistory: ScanResult[];
  restaurantLanguage: string | null;
};

export async function loadStoredAppState(): Promise<StoredAppState> {
  const [onboardingComplete, profile, scanHistory, restaurantLanguage] = await Promise.all([
    AsyncStorage.getItem(keys.onboardingComplete),
    AsyncStorage.getItem(keys.profile),
    AsyncStorage.getItem(keys.scanHistory),
    AsyncStorage.getItem(keys.restaurantLanguage)
  ]);

  return {
    onboardingComplete: onboardingComplete === "true",
    profile: profile ? JSON.parse(profile) : null,
    scanHistory: scanHistory ? JSON.parse(scanHistory) : [],
    restaurantLanguage
  };
}

export async function saveOnboardingComplete(value: boolean) {
  await AsyncStorage.setItem(keys.onboardingComplete, String(value));
}

export async function saveProfile(profile: UserProfile) {
  await AsyncStorage.setItem(keys.profile, JSON.stringify(profile));
  if (profile.restaurantLanguage) {
    await AsyncStorage.setItem(keys.restaurantLanguage, profile.restaurantLanguage);
  }
}

export async function saveScanHistory(scanHistory: ScanResult[]) {
  await AsyncStorage.setItem(keys.scanHistory, JSON.stringify(scanHistory));
}

export async function clearScanHistory() {
  await AsyncStorage.removeItem(keys.scanHistory);
}
