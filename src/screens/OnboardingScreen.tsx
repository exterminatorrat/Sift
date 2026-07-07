import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { useI18n } from "../i18n/I18nProvider";

const onboardingPlate = require("../../assets/onboarding-plate.png");

type OnboardingScreenProps = {
  onGetStarted: () => void;
};

export function OnboardingScreen({ onGetStarted }: OnboardingScreenProps) {
  const { t } = useI18n();
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = [
    {
      body: t("onboarding.scanBody"),
      eyebrow: t("onboarding.stepOne"),
      title: t("onboarding.scanTitle")
    },
    {
      body: t("onboarding.safetyBody"),
      eyebrow: t("onboarding.stepTwo"),
      title: t("onboarding.safetyTitle")
    },
    {
      body: t("onboarding.questionsBody"),
      eyebrow: t("onboarding.stepThree"),
      title: t("onboarding.questionsTitle")
    }
  ];
  const activeSlide = slides[slideIndex];
  const isFinalSlide = slideIndex === slides.length - 1;

  const handlePrimaryAction = () => {
    if (isFinalSlide) {
      onGetStarted();
      return;
    }

    setSlideIndex((currentIndex) => currentIndex + 1);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.brand}>{t("common.sift")}</Text>

        <View style={styles.imageFrame}>
          <Image source={onboardingPlate} resizeMode="cover" style={styles.image} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{activeSlide.eyebrow}</Text>
          <Text style={styles.headline}>{activeSlide.title}</Text>
          <Text style={styles.body}>{activeSlide.body}</Text>
        </View>

        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View
              key={slide.eyebrow}
              style={[styles.dot, index === slideIndex && styles.activeDot]}
            />
          ))}
        </View>

        <AnimatedPressable accessibilityRole="button" onPress={handlePrimaryAction} style={styles.button}>
          <Text style={styles.buttonText}>
            {isFinalSlide ? t("onboarding.getStarted") : t("onboarding.continue")}
          </Text>
          <ArrowRight color={colors.textInverse} size={16} strokeWidth={2.1} />
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
    justifyContent: "space-between",
    padding: 24,
    paddingBottom: 30,
    paddingTop: 18
  },
  brand: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    textAlign: "center"
  },
  imageFrame: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 242,
    overflow: "hidden",
    width: 242
  },
  image: {
    height: "100%",
    width: "100%"
  },
  copy: {
    alignItems: "center",
    minHeight: 188
  },
  eyebrow: {
    color: colors.inkSubtle,
    ...typography.badge,
    marginBottom: 14,
    textTransform: "uppercase"
  },
  headline: {
    color: colors.primaryDark,
    ...typography.title,
    maxWidth: 328,
    textAlign: "center"
  },
  body: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    marginTop: 18,
    maxWidth: 342,
    textAlign: "center"
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  dot: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 7,
    opacity: 0.5,
    width: 7
  },
  activeDot: {
    backgroundColor: colors.primary,
    opacity: 1,
    width: 22
  },
  button: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 32
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.label
  }
});
