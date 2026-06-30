import React, { useMemo, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { DishRisk } from "./src/types/scan";
import { UserProfile } from "./src/types/allergy";
import { getMockScanResult, mockProfile } from "./src/services/mockAnalysisService";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { DishDetailScreen } from "./src/screens/DishDetailScreen";

type Screen = "onboarding" | "profile" | "home" | "results" | "dishDetail";

export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [profile, setProfile] = useState<UserProfile>(mockProfile);
  const [selectedDish, setSelectedDish] = useState<DishRisk | null>(null);
  const scanResult = useMemo(() => getMockScanResult(profile), [profile]);

  const openDish = (dish: DishRisk) => {
    setSelectedDish(dish);
    setScreen("dishDetail");
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen === "onboarding" && (
        <OnboardingScreen onGetStarted={() => setScreen("profile")} />
      )}
      {screen === "profile" && (
        <ProfileScreen
          profile={profile}
          onChangeProfile={setProfile}
          onDone={() => setScreen("home")}
        />
      )}
      {screen === "home" && (
        <HomeScreen
          profile={profile}
          onOpenProfile={() => setScreen("profile")}
          onStartScan={() => setScreen("results")}
          onOpenHistory={() => setScreen("results")}
        />
      )}
      {screen === "results" && (
        <ResultsScreen
          scanResult={scanResult}
          profile={profile}
          onBack={() => setScreen("home")}
          onOpenDish={openDish}
        />
      )}
      {screen === "dishDetail" && selectedDish && (
        <DishDetailScreen
          dish={selectedDish}
          profile={profile}
          restaurantMessage={scanResult.restaurantMessage}
          onBack={() => setScreen("results")}
        />
      )}
    </SafeAreaProvider>
  );
}
