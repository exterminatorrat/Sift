import React, { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UserProfile } from "./src/types/allergy";
import { PreparedMenuImage } from "./src/types/image";
import { RootStackParamList } from "./src/types/navigation";
import { ScanResult } from "./src/types/scan";
import { LoadingAnalysis } from "./src/components/LoadingAnalysis";
import { createDefaultProfile } from "./src/services/mockAnalysisService";
import { analyzeMenuImage, createUnclearScanResult } from "./src/services/aiAnalysisService";
import { captureMenuImage, pickMenuImage } from "./src/services/imageService";
import {
  clearScanHistory,
  loadStoredAppState,
  saveOnboardingComplete,
  saveProfile,
  saveScanHistory
} from "./src/services/storageService";
import { addScanToHistory } from "./src/utils/scanHistory";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ScanCaptureScreen } from "./src/screens/ScanCaptureScreen";
import { ImagePreviewScreen } from "./src/screens/ImagePreviewScreen";
import { AnalysisLoadingScreen } from "./src/screens/AnalysisLoadingScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { DishDetailScreen } from "./src/screens/DishDetailScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(createDefaultProfile());
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [pendingImage, setPendingImage] = useState<PreparedMenuImage | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    loadStoredAppState()
      .then((stored) => {
        if (!mounted) {
          return;
        }

        setOnboardingComplete(stored.onboardingComplete);
        setProfile(stored.profile ?? createDefaultProfile());
        setScanHistory(stored.scanHistory);
      })
      .catch(() => {
        if (mounted) {
          setProfile(createDefaultProfile());
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

  if (!isReady) {
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
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={onboardingComplete ? "Home" : "Onboarding"}
          screenOptions={{ animation: "none", headerShown: false }}
        >
          <Stack.Screen name="Onboarding">
            {({ navigation }) => (
              <OnboardingScreen
                onGetStarted={async () => {
                  setOnboardingComplete(true);
                  await saveOnboardingComplete(true);
                  navigation.replace("Profile");
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Home">
            {({ navigation }) => (
              <HomeScreen
                profile={profile}
                onOpenProfile={() => navigation.replace("Profile")}
                onOpenSettings={() => navigation.navigate("Settings")}
                onOpenHistory={() => navigation.replace("History")}
                onStartScan={() => {
                  if (profile.allergies.length === 0) {
                    navigation.replace("Profile");
                    return;
                  }
                  setScanError(null);
                  void selectImageFromCamera(navigation.navigate);
                }}
                onUploadPhoto={async () => {
                  if (profile.allergies.length === 0) {
                    navigation.replace("Profile");
                    return;
                  }
                  await selectImageFromLibrary(navigation.navigate);
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Profile">
            {({ navigation }) => (
              <ProfileScreen
                profile={profile}
                onChangeProfile={async (nextProfile) => {
                  setProfile(nextProfile);
                  await saveProfile(nextProfile);
                }}
                onDone={() => navigation.replace("Home")}
                onHome={() => navigation.replace("Home")}
                onOpenHistory={() => navigation.replace("History")}
              />
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
                onRetake={async () => selectImageFromCamera(navigation.navigate)}
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

          <Stack.Screen name="Results">
            {({ navigation, route }) => {
              const scanResult = scanHistory.find((scan) => scan.id === route.params.scanId);

              if (!scanResult) {
                return (
                  <HistoryScreen
                    scans={scanHistory}
                    onBack={() => navigation.replace("Home")}
                    onOpenScan={(scanId) => navigation.replace("Results", { scanId })}
                    onOpenProfile={() => navigation.replace("Profile")}
                  />
                );
              }

              return (
                <ResultsScreen
                  scanResult={scanResult}
                  profile={profile}
                  onBack={() => navigation.navigate("Home")}
                  onOpenHistory={() => navigation.replace("History")}
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

          <Stack.Screen name="DishDetail">
            {({ navigation, route }) => {
              const scanResult = scanHistory.find((scan) => scan.id === route.params.scanId);
              const dish = scanResult?.dishes.find((item) => item.id === route.params.dishId);

              if (!scanResult || !dish) {
                return (
                  <HistoryScreen
                    scans={scanHistory}
                    onBack={() => navigation.replace("Home")}
                    onOpenScan={(scanId) => navigation.replace("Results", { scanId })}
                    onOpenProfile={() => navigation.replace("Profile")}
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

          <Stack.Screen name="History">
            {({ navigation }) => (
              <HistoryScreen
                scans={scanHistory}
                onBack={() => navigation.replace("Home")}
                onOpenScan={(scanId) => navigation.navigate("Results", { scanId })}
                onOpenProfile={() => navigation.replace("Profile")}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Settings">
            {({ navigation }) => (
              <SettingsScreen
                scanCount={scanHistory.length}
                onBack={() => navigation.goBack()}
                onEditProfile={() => navigation.navigate("Profile")}
                onClearHistory={async () => {
                  setScanHistory([]);
                  await clearScanHistory();
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
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
