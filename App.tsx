import React, { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black
} from "@expo-google-fonts/inter";
import {
  SourceSerif4_400Regular,
  SourceSerif4_500Medium,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold
} from "@expo-google-fonts/source-serif-4";
import { UserProfile } from "./src/types/allergy";
import { PreparedMenuImage } from "./src/types/image";
import { RootStackParamList } from "./src/types/navigation";
import { ScanResult } from "./src/types/scan";
import { AuthSession } from "./src/types/auth";
import { LoadingAnalysis } from "./src/components/LoadingAnalysis";
import { createDefaultProfile } from "./src/services/mockAnalysisService";
import { analyzeMenuImage, createUnclearScanResult } from "./src/services/aiAnalysisService";
import { loadAuthSession, signInWithApple, signOut } from "./src/services/authService";
import { captureMenuImage, pickMenuImage } from "./src/services/imageService";
import {
  clearScanHistory,
  loadStoredAppState,
  saveOnboardingComplete,
  saveProfiles,
  saveScanHistory
} from "./src/services/storageService";
import { addScanToHistory } from "./src/utils/scanHistory";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ScanCaptureScreen } from "./src/screens/ScanCaptureScreen";
import { ImagePreviewScreen } from "./src/screens/ImagePreviewScreen";
import { AnalysisLoadingScreen } from "./src/screens/AnalysisLoadingScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { DishDetailScreen } from "./src/screens/DishDetailScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import {
  HelpSupportScreen,
  LanguageTranslationScreen,
  SafetyDisclaimerScreen,
  SubscriptionScreen
} from "./src/screens/SettingsDetailScreens";
import { I18nProvider } from "./src/i18n/I18nProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();
type MainTab = "home" | "history" | "profile";

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    SourceSerif4_400Regular,
    SourceSerif4_500Medium,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold
  });
  const [isReady, setIsReady] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [profiles, setProfiles] = useState<UserProfile[]>([createDefaultProfile()]);
  const [activeProfileId, setActiveProfileId] = useState(createDefaultProfile().id);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [pendingImage, setPendingImage] = useState<PreparedMenuImage | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const profile = profiles.find((item) => item.id === activeProfileId) ?? profiles[0] ?? createDefaultProfile();

  useEffect(() => {
    let mounted = true;

    Promise.all([loadStoredAppState(), loadAuthSession()])
      .then(([stored, storedAuthSession]) => {
        if (!mounted) {
          return;
        }

        setAuthSession(storedAuthSession);
        setOnboardingComplete(stored.onboardingComplete);
        const nextProfiles = stored.profiles.length > 0 ? stored.profiles : [stored.profile ?? createDefaultProfile()];
        setProfiles(nextProfiles);
        setActiveProfileId(stored.activeProfileId ?? nextProfiles[0].id);
        setScanHistory(stored.scanHistory);
      })
      .catch(() => {
        if (mounted) {
          const defaultProfile = createDefaultProfile();
          setProfiles([defaultProfile]);
          setActiveProfileId(defaultProfile.id);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persistScanHistory = useCallback(async (nextHistory: ScanResult[]) => {
    setScanHistory(nextHistory);
    await saveScanHistory(nextHistory);
  }, []);

  const deleteScan = useCallback(
    async (scanId: string) => {
      const nextHistory = scanHistory.filter((scan) => scan.id !== scanId);
      await persistScanHistory(nextHistory);
    },
    [persistScanHistory, scanHistory]
  );

  const persistProfiles = useCallback(async (nextProfiles: UserProfile[], nextActiveProfileId: string) => {
    setProfiles(nextProfiles);
    setActiveProfileId(nextActiveProfileId);
    await saveProfiles(nextProfiles, nextActiveProfileId);
  }, []);

  if (!isReady || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoadingAnalysis />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <I18nProvider language={profile.preferredLanguage}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={!authSession ? "Login" : onboardingComplete ? "Home" : "Onboarding"}
            screenOptions={{ animation: "none", headerShown: false }}
          >
          <Stack.Screen name="Login">
            {({ navigation }) => (
              <LoginScreen
                error={authError}
                loading={authLoading}
                onSignInWithApple={async () => {
                  setAuthLoading(true);
                  setAuthError(null);
                  try {
                    const nextAuthSession = await signInWithApple();
                    setAuthSession(nextAuthSession);
                    navigation.replace(onboardingComplete ? "Home" : "Onboarding");
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Could not sign in with Apple.";
                    setAuthError(message);
                  } finally {
                    setAuthLoading(false);
                  }
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Onboarding">
            {({ navigation }) => (
              <OnboardingScreen
                onGetStarted={async () => {
                  setOnboardingComplete(true);
                  setMainTab("profile");
                  await saveOnboardingComplete(true);
                  navigation.replace("Home");
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Home">
            {({ navigation }) => (
              mainTab === "history" ? (
                <HistoryScreen
                  scans={scanHistory}
                  onBack={() => setMainTab("home")}
                  onOpenScan={(scanId) => navigation.navigate("Results", { scanId, from: "history" })}
                  onDeleteScan={(scanId) => {
                    void deleteScan(scanId);
                  }}
                  onOpenProfile={() => setMainTab("profile")}
                />
              ) : mainTab === "profile" ? (
                <ProfileScreen
                  profile={profile}
                  profiles={profiles}
                  activeProfileId={activeProfileId}
                  onChangeProfile={async (nextProfile) => {
                    const nextProfiles = profiles.some((item) => item.id === nextProfile.id)
                      ? profiles.map((item) => (item.id === nextProfile.id ? nextProfile : item))
                      : [...profiles, nextProfile];
                    await persistProfiles(nextProfiles, nextProfile.id);
                  }}
                  onSelectProfile={async (profileId, currentProfile) => {
                    const nextProfiles = profiles.map((item) =>
                      item.id === currentProfile.id ? currentProfile : item
                    );
                    await persistProfiles(nextProfiles, profileId);
                  }}
                  onCreateProfile={async (currentProfile) => {
                    const profileNumber = profiles.length + 1;
                    const nextProfile: UserProfile = {
                      ...createDefaultProfile(),
                      id: `profile-${Date.now()}`,
                      name: `Profile ${profileNumber}`
                    };
                    const nextProfiles = profiles.map((item) =>
                      item.id === currentProfile.id ? currentProfile : item
                    );
                    await persistProfiles([...nextProfiles, nextProfile], nextProfile.id);
                  }}
                  onDeleteProfile={async (profileId, currentProfile) => {
                    const savedCurrentProfiles = profiles.map((item) =>
                      item.id === currentProfile.id && item.id !== profileId ? currentProfile : item
                    );
                    const remainingProfiles = savedCurrentProfiles.filter((item) => item.id !== profileId);
                    const nextProfiles =
                      remainingProfiles.length > 0
                        ? remainingProfiles
                        : [
                            {
                              ...createDefaultProfile(),
                              id: `profile-${Date.now()}`,
                              name: "Profile 1"
                            }
                          ];
                    const nextActiveProfileId =
                      profileId === activeProfileId ? nextProfiles[0].id : activeProfileId;

                    await persistProfiles(nextProfiles, nextActiveProfileId);
                  }}
                  onDone={() => setMainTab("home")}
                  onHome={() => setMainTab("home")}
                  onOpenHistory={() => setMainTab("history")}
                />
              ) : (
                <HomeScreen
                  profile={profile}
                  recentScans={scanHistory}
                  onOpenProfile={() => setMainTab("profile")}
                  onOpenSettings={() => navigation.navigate("Settings")}
                  onOpenHistory={() => setMainTab("history")}
                  onOpenScan={(scanId) => navigation.navigate("Results", { scanId })}
                  onStartScan={() => {
                    if (profile.allergies.length === 0) {
                      setMainTab("profile");
                      return;
                    }
                    setScanError(null);
                    void selectImageFromCamera(navigation.navigate);
                  }}
                  onUploadPhoto={async () => {
                    if (profile.allergies.length === 0) {
                      setMainTab("profile");
                      return;
                    }
                    await selectImageFromLibrary(navigation.navigate);
                  }}
                />
              )
            )}
          </Stack.Screen>

          <Stack.Screen name="ScanCapture">
            {({ navigation }) => (
              <ScanCaptureScreen
                error={scanError}
                onBack={() => navigation.goBack()}
                onTakePhoto={async () => selectImageFromCamera(navigation.navigate)}
                onUploadPhoto={async () => selectImageFromLibrary(navigation.navigate)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ImagePreview">
            {({ navigation }) => (
              <ImagePreviewScreen
                image={pendingImage}
                onBack={() => {
                  setMainTab("home");
                  navigation.navigate("Home");
                }}
                onRetake={async () => {
                  await selectImageFromCamera(navigation.navigate);
                }}
                onUsePhoto={() => navigation.replace("AnalysisLoading")}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="AnalysisLoading">
            {({ navigation }) => (
              <AnalysisLoadingScreen
                onAnalyze={async () => {
                  const scanResult = await analyzePendingImage();
                  const nextHistory = addScanToHistory(scanHistory, scanResult);
                  await persistScanHistory(nextHistory);
                  navigation.replace("Results", { scanId: scanResult.id });
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Results" options={{ animation: "slide_from_right" }}>
            {({ navigation, route }) => {
              const scanResult = scanHistory.find((scan) => scan.id === route.params.scanId);
              const returnToHistory = route.params.from === "history";

              if (!scanResult) {
                return (
                  <HistoryScreen
                    scans={scanHistory}
                    onBack={() => {
                      setMainTab("home");
                      navigation.navigate("Home");
                    }}
                    onOpenScan={(scanId) => navigation.replace("Results", { scanId })}
                    onDeleteScan={(scanId) => {
                      void deleteScan(scanId);
                    }}
                    onOpenProfile={() => {
                      setMainTab("profile");
                      navigation.navigate("Home");
                    }}
                  />
                );
              }

              return (
                <ResultsScreen
                  scanResult={scanResult}
                  onBack={() => {
                    setMainTab(returnToHistory ? "history" : "home");
                    navigation.navigate("Home");
                  }}
                  onOpenHistory={() => {
                    setMainTab("history");
                    navigation.navigate("Home");
                  }}
                  onOpenDish={(dish) =>
                    navigation.navigate("DishDetail", {
                      scanId: scanResult.id,
                      dishId: dish.id
                    })
                  }
                />
              );
            }}
          </Stack.Screen>

          <Stack.Screen name="DishDetail" options={{ animation: "slide_from_right" }}>
            {({ navigation, route }) => {
              const scanResult = scanHistory.find((scan) => scan.id === route.params.scanId);
              const dish = scanResult?.dishes.find((item) => item.id === route.params.dishId);

              if (!scanResult || !dish) {
                return (
                  <HistoryScreen
                    scans={scanHistory}
                    onBack={() => {
                      setMainTab("home");
                      navigation.navigate("Home");
                    }}
                    onOpenScan={(scanId) => navigation.replace("Results", { scanId })}
                    onDeleteScan={(scanId) => {
                      void deleteScan(scanId);
                    }}
                    onOpenProfile={() => {
                      setMainTab("profile");
                      navigation.navigate("Home");
                    }}
                  />
                );
              }

              return (
                <DishDetailScreen
                  dish={dish}
                  profile={profile}
                  restaurantMessage={scanResult.restaurantMessage}
                  onBack={() => navigation.goBack()}
                />
              );
            }}
          </Stack.Screen>

          <Stack.Screen name="Settings" options={{ animation: "slide_from_right" }}>
            {({ navigation }) => (
              <SettingsScreen
                scanCount={scanHistory.length}
                onBack={() => navigation.goBack()}
                onOpenSubscription={() => navigation.navigate("SettingsSubscription")}
                onOpenLanguage={() => navigation.navigate("SettingsLanguage")}
                onOpenSafety={() => navigation.navigate("SettingsSafety")}
                onOpenHelp={() => navigation.navigate("SettingsHelp")}
                onClearHistory={async () => {
                  setScanHistory([]);
                  await clearScanHistory();
                }}
                onLogout={async () => {
                  await signOut();
                  setAuthSession(null);
                  setOnboardingComplete(false);
                  setMainTab("home");
                  await saveOnboardingComplete(false);
                  navigation.replace("Login");
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="SettingsSubscription" options={{ animation: "slide_from_right" }}>
            {({ navigation }) => (
              <SubscriptionScreen
                onBack={() => navigation.goBack()}
                onOpenSupport={() => navigation.navigate("SettingsHelp")}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="SettingsLanguage" options={{ animation: "slide_from_right" }}>
            {({ navigation }) => (
              <LanguageTranslationScreen
                profile={profile}
                onBack={() => navigation.goBack()}
                onChangeProfile={async (nextProfile) => {
                  const nextProfiles = profiles.some((item) => item.id === nextProfile.id)
                    ? profiles.map((item) => (item.id === nextProfile.id ? nextProfile : item))
                    : [...profiles, nextProfile];
                  await persistProfiles(nextProfiles, nextProfile.id);
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="SettingsSafety" options={{ animation: "slide_from_right" }}>
            {({ navigation }) => <SafetyDisclaimerScreen onBack={() => navigation.goBack()} />}
          </Stack.Screen>

          <Stack.Screen name="SettingsHelp" options={{ animation: "slide_from_right" }}>
            {({ navigation }) => <HelpSupportScreen onBack={() => navigation.goBack()} />}
          </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </I18nProvider>
    </SafeAreaProvider>
  );

  async function selectImageFromCamera(
    navigate: <RouteName extends keyof RootStackParamList>(
      screen: RouteName,
      params?: RootStackParamList[RouteName]
    ) => void
  ) {
    try {
      setScanError(null);
      const image = await captureMenuImage();
      if (image) {
        setPendingImage(image);
        navigate("ImagePreview");
      }
    } catch (error) {
      handleImageError(error, navigate);
    }
  }

  async function selectImageFromLibrary(
    navigate: <RouteName extends keyof RootStackParamList>(
      screen: RouteName,
      params?: RootStackParamList[RouteName]
    ) => void
  ) {
    try {
      setScanError(null);
      const image = await pickMenuImage();
      if (image) {
        setPendingImage(image);
        navigate("ImagePreview");
      }
    } catch (error) {
      handleImageError(error, navigate);
    }
  }

  function handleImageError(
    error: unknown,
    navigate: <RouteName extends keyof RootStackParamList>(
      screen: RouteName,
      params?: RootStackParamList[RouteName]
    ) => void
  ) {
    const message = error instanceof Error ? error.message : "Could not open the image picker.";
    setScanError(message);
    navigate("ScanCapture");
  }

  async function analyzePendingImage() {
    if (!pendingImage) {
      Alert.alert("No image selected", "Please choose a menu photo first.");
      return createUnclearScanResult(profile);
    }

    try {
      return await analyzeMenuImage({
        profile,
        image: pendingImage,
        restaurantLanguage: profile.restaurantLanguage
      });
    } catch {
      return createUnclearScanResult(profile, pendingImage.uri);
    } finally {
      setPendingImage(null);
    }
  }
}
