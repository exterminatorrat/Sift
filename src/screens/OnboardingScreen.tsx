import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
import { colors } from "../constants/colors";

const onboardingPlate = require("../../assets/onboarding-plate.png");

type OnboardingScreenProps = {
  onGetStarted: () => void;
};

export function OnboardingScreen({ onGetStarted }: OnboardingScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.imageFrame}>
          <Image source={onboardingPlate} resizeMode="cover" style={styles.image} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.headline}>Know what to{"\n"}ask before you{"\n"}eat.</Text>
          <Text style={styles.body}>
            Sift helps you navigate menus with confidence, filtering for your unique dietary needs
            in a soft, quiet space.
          </Text>
        </View>

        <Pressable accessibilityRole="button" onPress={onGetStarted} style={styles.button}>
          <Text style={styles.buttonText}>Get Started</Text>
          <ArrowRight color={colors.surface} size={16} strokeWidth={2.1} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  imageFrame: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 280,
    overflow: "hidden",
    width: 280
  },
  image: {
    height: "100%",
    width: "100%"
  },
  copy: {
    alignItems: "center",
    marginTop: 80
  },
  headline: {
    color: colors.primaryDark,
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 0,
    lineHeight: 40,
    textAlign: "center"
  },
  body: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26,
    marginTop: 24,
    maxWidth: 342,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 128,
    minHeight: 52,
    paddingHorizontal: 32
  },
  buttonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 18
  }
});
