import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "../types/allergy";
import { ScanResult } from "../types/scan";

const keys = {
  onboardingComplete: "sift:onboardingComplete",
  profile: "sift:profile",
  profiles: "sift:profiles",
  activeProfileId: "sift:activeProfileId",
  scanHistory: "sift:scanHistory",
  restaurantLanguage: "sift:restaurantLanguage"
};

export type StoredAppState = {
  onboardingComplete: boolean;
  profile: UserProfile | null;
  profiles: UserProfile[];
  activeProfileId: string | null;
  scanHistory: ScanResult[];
  restaurantLanguage: string | null;
};

export async function loadStoredAppState(): Promise<StoredAppState> {
  const [onboardingComplete, profile, profiles, activeProfileId, scanHistory, restaurantLanguage] = await Promise.all([
    AsyncStorage.getItem(keys.onboardingComplete),
    AsyncStorage.getItem(keys.profile),
    AsyncStorage.getItem(keys.profiles),
    AsyncStorage.getItem(keys.activeProfileId),
    AsyncStorage.getItem(keys.scanHistory),
    AsyncStorage.getItem(keys.restaurantLanguage)
  ]);

  const legacyProfile = profile ? JSON.parse(profile) as UserProfile : null;
  const savedProfiles = profiles ? JSON.parse(profiles) as UserProfile[] : [];
  const normalizedProfiles = savedProfiles.length > 0 ? savedProfiles : legacyProfile ? [legacyProfile] : [];

  return {
    onboardingComplete: onboardingComplete === "true",
    profile: legacyProfile,
    profiles: normalizedProfiles,
    activeProfileId: activeProfileId ?? normalizedProfiles[0]?.id ?? null,
    scanHistory: scanHistory ? JSON.parse(scanHistory) : [],
    restaurantLanguage
  };
}

export async function saveOnboardingComplete(value: boolean) {
  await AsyncStorage.setItem(keys.onboardingComplete, String(value));
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

export async function clearScanHistory() {
  await AsyncStorage.removeItem(keys.scanHistory);
}
