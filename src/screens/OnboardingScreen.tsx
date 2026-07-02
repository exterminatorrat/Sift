import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
import { colors } from "../constants/colors";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { useI18n } from "../i18n/I18nProvider";

const onboardingPlate = require("../../assets/onboarding-plate.png");

type OnboardingScreenProps = {
  onGetStarted: () => void;
};

export function OnboardingScreen({ onGetStarted }: OnboardingScreenProps) {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.imageFrame}>
          <Image source={onboardingPlate} resizeMode="cover" style={styles.image} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.headline}>{t("onboarding.headline")}</Text>
          <Text style={styles.body}>{t("onboarding.body")}</Text>
          <Text style={styles.safety}>{t("onboarding.safety")}</Text>
        </View>

        <AnimatedPressable accessibilityRole="button" onPress={onGetStarted} style={styles.button}>
          <Text style={styles.buttonText}>{t("onboarding.getStarted")}</Text>
          <ArrowRight color={colors.surface} size={16} strokeWidth={2.1} />
        </AnimatedPressable>
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
  safety: {
    color: colors.inkSubtle,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: 14,
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
