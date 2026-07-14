import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Linking, StyleSheet } from "react-native";
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
import { SubscriptionPlanId } from "./src/types/subscription";
import { LoadingAnalysis } from "./src/components/LoadingAnalysis";
import {
  defaultSubscriptionPlanId,
  getMonthlyScanCount,
  getSubscriptionPlan
} from "./src/constants/subscriptionPlans";
import { createDefaultProfile } from "./src/services/mockAnalysisService";
import {
  analyzeMenuImages,
  createUnclearScanResult,
  ScanQuotaExceededError,
  ScanRateLimitExceededError
} from "./src/services/aiAnalysisService";
import {
  isAppleAccountRequired,
  isDurableAuthSession,
  loadAuthSession,
  signInWithApple,
  signOut
} from "./src/services/authService";
import { ImageAccessError, pickMenuImages } from "./src/services/imageService";
import {
  MAX_MENU_IMAGES_PER_SCAN,
  MAX_MENU_SCAN_BASE64_CHARACTERS
} from "./src/constants/menuScan";
import {
  clearScanHistory,
  loadStoredAppState,
  saveCameraGuideComplete,
  saveOnboardingComplete,
  saveProfiles,
  saveScanHistory,
  saveSubscriptionPlan
} from "./src/services/storageService";
import { addScanToHistory, normalizeStoredScanHistory, renameScanInHistory } from "./src/utils/scanHistory";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ScanCaptureScreen } from "./src/screens/ScanCaptureScreen";
import { CameraGuideScreen } from "./src/screens/CameraGuideScreen";
import { MenuCameraScreen } from "./src/screens/MenuCameraScreen";
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
  const [cameraGuideComplete, setCameraGuideComplete] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [profiles, setProfiles] = useState<UserProfile[]>([createDefaultProfile()]);
  const [activeProfileId, setActiveProfileId] = useState(createDefaultProfile().id);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [subscriptionPlanId, setSubscriptionPlanId] =
    useState<SubscriptionPlanId>(defaultSubscriptionPlanId);
  const [pendingImages, setPendingImages] = useState<PreparedMenuImage[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const profile = profiles.find((item) => item.id === activeProfileId) ?? profiles[0] ?? createDefaultProfile();
  const subscriptionPlan = getSubscriptionPlan(subscriptionPlanId);
  const monthlyScanCount = getMonthlyScanCount(scanHistory);
  const canStartScan = monthlyScanCount < subscriptionPlan.scanLimit;
  const canCreateProfile = profiles.length < subscriptionPlan.profileLimit;
  const hasRequiredAuth = !isAppleAccountRequired() || isDurableAuthSession(authSession);

  useEffect(() => {
    let mounted = true;

    Promise.all([loadStoredAppState(), loadAuthSession()])
      .then(([stored, storedAuthSession]) => {
        if (!mounted) {
          return;
        }

        setAuthSession(storedAuthSession);
        setOnboardingComplete(stored.onboardingComplete);
        setCameraGuideComplete(stored.cameraGuideComplete);
        const nextProfiles = stored.profiles.length > 0 ? stored.profiles : [stored.profile ?? createDefaultProfile()];
        setProfiles(nextProfiles);
        setActiveProfileId(stored.activeProfileId ?? nextProfiles[0].id);
        setScanHistory(normalizeStoredScanHistory(stored.scanHistory));
        setSubscriptionPlanId(stored.subscriptionPlan);
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

  const renameScan = useCallback(
    async (scanId: string, title: string) => {
      const nextHistory = renameScanInHistory(scanHistory, scanId, title);
      await persistScanHistory(nextHistory);
    },
    [persistScanHistory, scanHistory]
  );

  const persistProfiles = useCallback(async (nextProfiles: UserProfile[], nextActiveProfileId: string) => {
    setProfiles(nextProfiles);
    setActiveProfileId(nextActiveProfileId);
    await saveProfiles(nextProfiles, nextActiveProfileId);
  }, []);

  const persistSubscriptionPlan = useCallback(async (nextPlanId: SubscriptionPlanId) => {
    setSubscriptionPlanId(nextPlanId);
    await saveSubscriptionPlan(nextPlanId);
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
            initialRouteName={!hasRequiredAuth ? "Login" : !onboardingComplete ? "Onboarding" : "Home"}
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
                    const nextTab = profile.allergies.length === 0 ? "profile" : "home";
                    setAuthSession(nextAuthSession);
                    setMainTab(nextTab);
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
                profile={profile}
                onComplete={async (nextProfile) => {
                  const nextProfiles = profiles.some((item) => item.id === nextProfile.id)
                    ? profiles.map((item) => (item.id === nextProfile.id ? nextProfile : item))
                    : [...profiles, nextProfile];
                  await persistProfiles(nextProfiles, nextProfile.id);
                  setOnboardingComplete(true);
                  await saveOnboardingComplete(true);
                  setMainTab("home");
                  navigation.replace("Home");
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Home">
            {({ navigation }) => (
              <MainTabTransition
                activeTab={mainTab}
                tabs={{
                  history: (
                    <HistoryScreen
                      scans={scanHistory}
                      onBack={() => setMainTab("home")}
                      onOpenScan={(scanId) => navigation.navigate("Results", { scanId, from: "history" })}
                      onDeleteScan={(scanId) => {
                        void deleteScan(scanId);
                      }}
                      onRenameScan={(scanId, title) => {
                        void renameScan(scanId, title);
                      }}
                      onOpenProfile={() => setMainTab("profile")}
                    />
                  ),
                  home: (
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
                        openCameraFlow(navigation.navigate);
                      }}
                      onUploadPhoto={async () => {
                        if (profile.allergies.length === 0) {
                          setMainTab("profile");
                          return;
                        }
                        if (!canStartScan) {
                          showScanLimitAlert(navigation.navigate);
                          return;
                        }
                        await selectImagesFromLibrary(navigation.navigate);
                      }}
                    />
                  ),
                  profile: (
                    <ProfileScreen
                      canCreateProfile={canCreateProfile}
                      profile={profile}
                      profileLimit={subscriptionPlan.profileLimit}
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
                        if (!canCreateProfile) {
                          navigation.navigate("SettingsSubscription");
                          return;
                        }

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
                      onOpenSubscription={() => navigation.navigate("SettingsSubscription")}
                    />
                  )
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ScanCapture">
            {({ navigation }) => (
              <ScanCaptureScreen
                error={scanError}
                onBack={() => navigation.goBack()}
                onTakePhoto={() => openCameraFlow(navigation.navigate)}
                onUploadPhoto={async () => selectImagesFromLibrary(navigation.navigate)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="CameraGuide" options={{ animation: "slide_from_bottom" }}>
            {({ navigation, route }) => (
              <CameraGuideScreen
                onClose={() => {
                  if (route.params?.continueSession) {
                    navigation.replace("ImagePreview");
                    return;
                  }
                  navigation.goBack();
                }}
                onFinish={async () => {
                  setCameraGuideComplete(true);
                  await saveCameraGuideComplete(true).catch(() => undefined);
                  if (route.params?.replay) {
                    navigation.goBack();
                  } else {
                    navigation.replace("MenuCamera");
                  }
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="MenuCamera" options={{ animation: "fade" }}>
            {({ navigation }) => (
              <MenuCameraScreen
                images={pendingImages}
                maxImages={MAX_MENU_IMAGES_PER_SCAN}
                onBack={() => {
                  if (pendingImages.length > 0) {
                    navigation.replace("ImagePreview");
                    return;
                  }

                  navigation.goBack();
                }}
                onAddImage={(image) => {
                  const nextImages = [...pendingImages, image];
                  if (
                    nextImages.length > MAX_MENU_IMAGES_PER_SCAN ||
                    getImagesBase64Length(nextImages) > MAX_MENU_SCAN_BASE64_CHARACTERS
                  ) {
                    return false;
                  }

                  setPendingImages(nextImages);
                  return true;
                }}
                onComplete={() => navigation.replace("ImagePreview")}
                onOpenGuide={() => navigation.navigate("CameraGuide", { replay: true })}
                onRemoveImage={(index) => {
                  setPendingImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
                }}
                onUploadPhotos={() =>
                  selectImagesFromLibrary(navigation.navigate, {
                    append: true,
                    stayOnCurrentScreen: true
                  })
                }
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ImagePreview">
            {({ navigation }) => (
              <ImagePreviewScreen
                images={pendingImages}
                onBack={() => {
                  setPendingImages([]);
                  setMainTab("home");
                  navigation.navigate("Home");
                }}
                onAddPage={() => {
                  if (cameraGuideComplete) {
                    navigation.replace("MenuCamera");
                  } else {
                    navigation.replace("CameraGuide", { continueSession: true });
                  }
                }}
                onRemovePage={(index) => {
                  setPendingImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
                }}
                onUsePhotos={() => navigation.replace("AnalysisLoading")}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="AnalysisLoading">
            {({ navigation }) => (
              <AnalysisLoadingScreen
                imageUris={pendingImages.map((image) => image.uri)}
                onAnalyze={async () => {
                  let scanResult: ScanResult;
                  try {
                    scanResult = await analyzePendingImages();
                  } catch (error) {
                    if (error instanceof ScanRateLimitExceededError) {
                      showScanRateLimitAlert(error.retryAfterSeconds);
                      navigation.replace("ImagePreview");
                      return;
                    } else if (error instanceof ScanQuotaExceededError) {
                      showScanLimitAlert(navigation.navigate);
                      setMainTab("home");
                      navigation.replace("Home");
                      return;
                    }
                    throw error;
                  }

                  const nextHistory = addScanToHistory(scanHistory, scanResult, subscriptionPlan.historyLimit);
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
                    if (returnToHistory) {
                      navigation.goBack();
                      return;
                    }

                    setMainTab("home");
                    navigation.navigate("Home");
                  }}
                  onDeleteScan={async (scanId) => {
                    if (returnToHistory) {
                      navigation.goBack();
                      await deleteScan(scanId);
                      return;
                    }

                    setMainTab("home");
                    navigation.navigate("Home");
                    await deleteScan(scanId);
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
                  onRenameScan={(scanId, title) => {
                    void renameScan(scanId, title);
                  }}
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
                  restaurantLanguage={scanResult.restaurantMessage?.language ?? profile.restaurantLanguage}
                  showVoiceTools={subscriptionPlan.features.voicePlayback}
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
                currentPlanId={subscriptionPlanId}
                monthlyScanCount={monthlyScanCount}
                onBack={() => navigation.goBack()}
                onOpenSupport={() => navigation.navigate("SettingsHelp")}
                onSelectPlan={(planId) => {
                  void persistSubscriptionPlan(planId);
                }}
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

  function openCameraFlow(
    navigate: <RouteName extends keyof RootStackParamList>(
      screen: RouteName,
      params?: RootStackParamList[RouteName]
    ) => void
  ) {
    if (!canStartScan) {
      showScanLimitAlert(navigate);
      return;
    }

    setScanError(null);
    setPendingImages([]);
    if (cameraGuideComplete) {
      navigate("MenuCamera");
    } else {
      navigate("CameraGuide");
    }
  }

  async function selectImagesFromLibrary(
    navigate: <RouteName extends keyof RootStackParamList>(
      screen: RouteName,
      params?: RootStackParamList[RouteName]
    ) => void,
    options: {
      append?: boolean;
      onSelected?: () => void;
      stayOnCurrentScreen?: boolean;
    } = {}
  ) {
    if (!canStartScan) {
      showScanLimitAlert(navigate);
      return;
    }

    try {
      setScanError(null);
      const existingImages = options.append ? pendingImages : [];
      const remainingSlots = MAX_MENU_IMAGES_PER_SCAN - existingImages.length;
      if (remainingSlots <= 0) {
        Alert.alert(
          "Four pages already added",
          "Remove a page before adding another menu photo."
        );
        return;
      }

      const selectedImages = await pickMenuImages(remainingSlots);
      if (selectedImages.length === 0) {
        return;
      }

      const merged = mergeMenuImages(existingImages, selectedImages);
      const addedCount = merged.images.length - existingImages.length;
      if (addedCount === 0) {
        Alert.alert(
          "Photos are too large",
          "Choose fewer menu pages or take new photos closer to the menu."
        );
        return;
      }

      setPendingImages(merged.images);

      if (merged.rejectedCount > 0) {
        Alert.alert(
          "Some photos were not added",
          "Sift kept the pages that fit this scan. Review them before analysis."
        );
      }

      if (options.onSelected) {
        options.onSelected();
      } else if (!options.stayOnCurrentScreen) {
        navigate("ImagePreview");
      }
    } catch (error) {
      handleImageError(error);
    }
  }

  function handleImageError(error: unknown) {
    if (error instanceof ImageAccessError) {
      if (error.code === "camera_denied") {
        showPermissionAlert(
          "Camera access is off",
          "Enable camera access in Settings to scan a menu photo."
        );
        return;
      }

      if (error.code === "photo_library_denied") {
        showPermissionAlert(
          "Photo access is off",
          "Enable photo access in Settings or take a new menu photo instead."
        );
        return;
      }
    }

    Alert.alert("Could not open photos", "Please try again or choose a different menu photo.");
  }

  function showPermissionAlert(title: string, body: string) {
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings().catch(() => undefined) }
    ]);
  }

  async function analyzePendingImages() {
    if (pendingImages.length === 0) {
      Alert.alert("No images selected", "Please add at least one menu photo first.");
      return createUnclearScanResult(profile);
    }

    const selectedImages = [...pendingImages];
    const selectedImageUris = selectedImages.map((image) => image.uri);

    try {
      const scanResult = await analyzeMenuImages({
        profile,
        images: selectedImages,
        restaurantLanguage: profile.restaurantLanguage
      });
      setPendingImages([]);
      return scanResult;
    } catch (error) {
      if (error instanceof ScanRateLimitExceededError) {
        throw error;
      }

      setPendingImages([]);
      if (error instanceof ScanQuotaExceededError) {
        throw error;
      }

      return createUnclearScanResult(profile, selectedImageUris);
    }
  }

  function showScanRateLimitAlert(retryAfterSeconds: number) {
    const waitSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
    Alert.alert(
      "Please wait before scanning again",
      `Sift limits scans to protect reliability and prevent unexpected AI usage. Try again in about ${waitSeconds} seconds.`
    );
  }

  function showScanLimitAlert(
    navigate: <RouteName extends keyof RootStackParamList>(
      screen: RouteName,
      params?: RootStackParamList[RouteName]
    ) => void
  ) {
    Alert.alert(
      "Monthly scan limit reached",
      `Your ${subscriptionPlan.label} test plan includes ${subscriptionPlan.scanLimit} scans per month. Switch plans to keep testing.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "View plans", onPress: () => navigate("SettingsSubscription") }
      ]
    );
  }
}

function getImagesBase64Length(images: PreparedMenuImage[]) {
  return images.reduce((total, image) => total + image.base64.length, 0);
}

function mergeMenuImages(existing: PreparedMenuImage[], candidates: PreparedMenuImage[]) {
  const images = [...existing];
  let rejectedCount = 0;

  for (const candidate of candidates) {
    const nextImages = [...images, candidate];
    if (
      nextImages.length > MAX_MENU_IMAGES_PER_SCAN ||
      getImagesBase64Length(nextImages) > MAX_MENU_SCAN_BASE64_CHARACTERS
    ) {
      rejectedCount += 1;
      continue;
    }

    images.push(candidate);
  }

  return { images, rejectedCount };
}

const mainTabOrder: Record<MainTab, number> = {
  profile: 0,
  home: 1,
  history: 2
};

type MainTabTransitionProps = {
  activeTab: MainTab;
  tabs: Record<MainTab, React.ReactNode>;
};

function MainTabTransition({ activeTab, tabs }: MainTabTransitionProps) {
  const previousTab = useRef(activeTab);
  const animations = useRef(
    Object.fromEntries(
      (Object.keys(mainTabOrder) as MainTab[]).map((tab) => [
        tab,
        {
          opacity: new Animated.Value(tab === activeTab ? 1 : 0),
          translateX: new Animated.Value(0)
        }
      ])
    ) as Record<MainTab, { opacity: Animated.Value; translateX: Animated.Value }>
  ).current;

  useEffect(() => {
    if (previousTab.current === activeTab) {
      return;
    }

    const direction = mainTabOrder[activeTab] > mainTabOrder[previousTab.current] ? 1 : -1;
    const previousAnimation = animations[previousTab.current];
    const activeAnimation = animations[activeTab];
    previousTab.current = activeTab;
    activeAnimation.opacity.setValue(0);
    activeAnimation.translateX.setValue(direction * 12);

    Animated.parallel([
      Animated.timing(previousAnimation.opacity, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      }),
      Animated.timing(previousAnimation.translateX, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
        toValue: direction * -6,
        useNativeDriver: true
      }),
      Animated.timing(activeAnimation.opacity, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(activeAnimation.translateX, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      })
    ]).start();
  }, [activeTab, animations]);

  return (
    <Animated.View style={styles.mainTabHost}>
      {(Object.keys(mainTabOrder) as MainTab[]).map((tab) => {
        const animation = animations[tab];
        return (
          <Animated.View
            key={tab}
            pointerEvents={activeTab === tab ? "auto" : "none"}
            style={[
              styles.mainTabLayer,
              {
                opacity: animation.opacity,
                transform: [{ translateX: animation.translateX }],
                zIndex: activeTab === tab ? 1 : 0
              }
            ]}
          >
            {tabs[tab]}
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mainTabHost: {
    flex: 1
  },
  mainTabLayer: {
    ...StyleSheet.absoluteFillObject
  }
});
