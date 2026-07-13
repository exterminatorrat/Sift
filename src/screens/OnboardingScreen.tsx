import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react-native";
import { Allergy, AllergySeverity, UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { commonAllergens } from "../constants/commonAllergens";
import { AllergyChip } from "../components/AllergyChip";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { useI18n } from "../i18n/I18nProvider";

type OnboardingStep = "welcome" | "safety" | "profile";
type OnboardingGraphicVariant = OnboardingStep;

type OnboardingScreenProps = {
  profile: UserProfile;
  onComplete: (profile: UserProfile) => void | Promise<void>;
};

const steps: OnboardingStep[] = ["welcome", "safety", "profile"];
const onboardingAllergens = commonAllergens.filter((allergen) =>
  ["Peanut", "Tree nuts", "Sesame", "Shellfish", "Dairy", "Egg", "Wheat/gluten", "Soy"].includes(allergen)
);
const severities: AllergySeverity[] = ["mild", "moderate", "severe"];
const DOT_PITCH = 15;
const DOT_ACTIVE_WIDTH = 24;
const DOT_TRACK_WIDTH = DOT_ACTIVE_WIDTH + (steps.length - 1) * DOT_PITCH;

function formatSeverity(severity: AllergySeverity, t: ReturnType<typeof useI18n>["t"]) {
  if (severity === "mild") {
    return t("severity.mild");
  }
  if (severity === "moderate") {
    return t("severity.moderate");
  }
  return t("severity.severe");
}

export function OnboardingScreen({
  profile,
  onComplete
}: OnboardingScreenProps) {
  const { t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const transition = useRef(new Animated.Value(1)).current;
  const activeDotLeft = useRef(new Animated.Value(0)).current;
  const activeDotWidth = useRef(new Animated.Value(DOT_ACTIVE_WIDTH)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const noticeProgress = useRef(new Animated.Value(0)).current;
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(profile.name || t("onboarding.profileNameDefault"));
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    profile.allergies.map((allergy) => allergy.name)
  );
  const [customAllergen, setCustomAllergen] = useState("");
  const [defaultSeverity, setDefaultSeverity] = useState<AllergySeverity>(
    profile.allergies[0]?.severity ?? "severe"
  );
  const [avoidCrossContact, setAvoidCrossContact] = useState(
    profile.allergies.length === 0 ? true : profile.allergies.some((allergy) => allergy.avoidCrossContact)
  );

  const activeStep = steps[stepIndex];
  const profileReady = selectedAllergens.length > 0;
  const canUsePrimaryAction = !transitioning && (activeStep !== "profile" || profileReady);
  const progressLabel = t("onboarding.stepProgress", {
    current: stepIndex + 1,
    total: steps.length
  });

  useEffect(() => {
    return () => {
      if (noticeTimeout.current) {
        clearTimeout(noticeTimeout.current);
      }
    };
  }, []);

  const showNotice = (message: string) => {
    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
    }

    setNoticeText(message);
    noticeProgress.setValue(0);
    Animated.timing(noticeProgress, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();

    noticeTimeout.current = setTimeout(() => {
      Animated.timing(noticeProgress, {
        duration: 180,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) {
          setNoticeText(null);
        }
      });
    }, 1500);
  };

  const revealFocusedInput = (target: number) => {
    setTimeout(() => {
      scrollViewRef.current
        ?.getScrollResponder()
        ?.scrollResponderScrollNativeHandleToKeyboard(target, 132, true);
    }, 140);
  };

  const copy = useMemo(() => {
    switch (activeStep) {
      case "welcome":
        return {
          body: t("onboarding.welcomeBody"),
          title: t("onboarding.welcomeTitle")
        };
      case "safety":
        return {
          body: t("onboarding.safetyBoundaryBody"),
          title: t("onboarding.safetyBoundaryTitle")
        };
      case "profile":
        return {
          body: t("onboarding.profileSetupBody"),
          title: t("onboarding.profileSetupTitle")
        };
    }
  }, [activeStep, t]);

  const primaryLabel = useMemo(() => {
    switch (activeStep) {
      case "safety":
        return t("onboarding.iUnderstand");
      case "profile":
        return t("onboarding.createProfile");
      default:
        return t("onboarding.continue");
    }
  }, [activeStep, t]);

  const moveNext = async () => {
    if (transitioning || (activeStep === "profile" && !profileReady)) {
      return;
    }

    if (activeStep === "profile") {
      Keyboard.dismiss();
      showNotice(t("profile.savedToast"));
      await new Promise((resolve) => setTimeout(resolve, 620));
      await onComplete(buildProfile());
      return;
    }

    goToStep(stepIndex + 1);
  };

  const goToStep = (nextIndex: number) => {
    if (nextIndex === stepIndex || transitioning) {
      return;
    }

    const direction = nextIndex > stepIndex ? 1 : -1;
    const currentDotLeft = stepIndex * DOT_PITCH;
    const nextDotLeft = nextIndex * DOT_PITCH;
    const stretchedDotLeft = Math.min(currentDotLeft, nextDotLeft);
    const stretchedDotWidth = DOT_ACTIVE_WIDTH + Math.abs(nextDotLeft - currentDotLeft);
    setTransitionDirection(direction);
    setTransitioning(true);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(activeDotLeft, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
          toValue: stretchedDotLeft,
          useNativeDriver: false
        }),
        Animated.timing(activeDotWidth, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
          toValue: stretchedDotWidth,
          useNativeDriver: false
        })
      ]),
      Animated.parallel([
        Animated.spring(activeDotLeft, {
          damping: 20,
          mass: 0.65,
          overshootClamping: true,
          stiffness: 220,
          toValue: nextDotLeft,
          useNativeDriver: false
        }),
        Animated.spring(activeDotWidth, {
          damping: 20,
          mass: 0.65,
          overshootClamping: true,
          stiffness: 220,
          toValue: DOT_ACTIVE_WIDTH,
          useNativeDriver: false
        })
      ])
    ]).start();
    Animated.timing(transition, {
      duration: 115,
      easing: Easing.in(Easing.cubic),
      toValue: 0,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (!finished) {
        setTransitioning(false);
        return;
      }

      setStepIndex(nextIndex);
      transition.setValue(0);
      Animated.timing(transition, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }).start(() => setTransitioning(false));
    });
  };

  const toggleAllergen = (name: string) => {
    setSelectedAllergens((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  };

  const addCustomAllergen = () => {
    const trimmed = customAllergen.trim();
    if (!trimmed || selectedAllergens.some((name) => name.toLowerCase() === trimmed.toLowerCase())) {
      setCustomAllergen("");
      return;
    }

    setSelectedAllergens((current) => [...current, trimmed]);
    setCustomAllergen("");
    Keyboard.dismiss();
    showNotice(t("profile.allergenAddedToast"));
  };

  const buildProfile = (): UserProfile => ({
    ...profile,
    allergies: selectedAllergens.map((name): Allergy => ({
      avoidCrossContact,
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name,
      severity: defaultSeverity
    })),
    name: profileName.trim() || t("onboarding.profileNameDefault")
  });

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ref={scrollViewRef}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>{t("common.sift")}</Text>
          <View style={styles.topActions}>
            {stepIndex > 0 && (
              <AnimatedPressable
                accessibilityLabel={t("common.back")}
                accessibilityRole="button"
                onPress={() => goToStep(stepIndex - 1)}
                scaleTo={0.9}
                style={styles.backButton}
              >
                <ArrowLeft color={colors.primaryDark} size={19} strokeWidth={2} />
              </AnimatedPressable>
            )}
            <Text style={styles.progressLabel}>{progressLabel}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.stepPane,
            {
              opacity: transition.interpolate({
                inputRange: [0, 1],
                outputRange: [0.42, 1]
              }),
              transform: [
                {
                  translateX: transition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [transitionDirection * 30, 0]
                  })
                },
                {
                  scale: transition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1]
                  })
                }
              ]
            }
          ]}
        >
          {activeStep !== "profile" && (
            <View style={[styles.hero, activeStep === "safety" && styles.safetyHero]}>
              <OnboardingGraphic variant={activeStep} />
            </View>
          )}

          <View style={[styles.copy, activeStep === "welcome" && styles.welcomeCopy]}>
            <Text style={[styles.title, activeStep === "welcome" && styles.welcomeTitle]}>{copy.title}</Text>
            <Text style={[styles.body, activeStep === "welcome" && styles.welcomeBody]}>{copy.body}</Text>
          </View>

          {activeStep === "profile" && (
            <View style={styles.profileSetup}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("onboarding.profileNameLabel")}</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                onFocus={(event) => revealFocusedInput(event.nativeEvent.target)}
                placeholder={t("onboarding.profileNameDefault")}
                placeholderTextColor={colors.inkSubtle}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("onboarding.chooseAllergies")}</Text>
              <View style={styles.chipGrid}>
                {onboardingAllergens.map((allergen) => (
                  <AllergyChip
                    key={allergen}
                    label={allergen}
                    selected={selectedAllergens.includes(allergen)}
                    showSelectedIcon
                    onPress={() => toggleAllergen(allergen)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.addRow}>
              <TextInput
                value={customAllergen}
                onChangeText={setCustomAllergen}
                onFocus={(event) => revealFocusedInput(event.nativeEvent.target)}
                placeholder={t("onboarding.customAllergen")}
                placeholderTextColor={colors.inkSubtle}
                style={[styles.input, styles.customInput]}
              />
              <AnimatedPressable
                accessibilityLabel={t("profile.add")}
                accessibilityRole="button"
                onPress={addCustomAllergen}
                scaleTo={0.92}
                style={styles.addButton}
              >
                <Plus color={colors.textInverse} size={20} strokeWidth={2.3} />
              </AnimatedPressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("onboarding.sensitivityLabel")}</Text>
              <View style={styles.segmented}>
                {severities.map((severity) => {
                  const active = severity === defaultSeverity;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={severity}
                      onPress={() => setDefaultSeverity(severity)}
                      style={[styles.segment, active && styles.segmentActive]}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {formatSeverity(severity, t)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>{t("onboarding.crossContactTitle")}</Text>
                <Text style={styles.switchBody}>{t("onboarding.crossContactBody")}</Text>
              </View>
              <Switch
                value={avoidCrossContact}
                onValueChange={setAvoidCrossContact}
                trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
                thumbColor={avoidCrossContact ? colors.primary : colors.inkSubtle}
              />
            </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {noticeText && (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              opacity: noticeProgress,
              transform: [
                {
                  translateY: noticeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.toastText}>{noticeText}</Text>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <View style={styles.dotsTrack}>
          {steps.map((step, index) => (
            <View key={step} style={[styles.dot, { left: index * DOT_PITCH + 8.5 }]} />
          ))}
          <Animated.View
            style={[
              styles.activeDot,
              {
                left: activeDotLeft,
                width: activeDotWidth
              }
            ]}
          />
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          disabled={!canUsePrimaryAction}
          onPress={() => {
            void moveNext();
          }}
          scaleTo={0.97}
          style={[styles.button, !canUsePrimaryAction && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{primaryLabel}</Text>
          <ArrowRight color={colors.textInverse} size={16} strokeWidth={2.1} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

function OnboardingGraphic({ variant }: { variant: OnboardingGraphicVariant }) {
  if (variant === "profile") {
    return null;
  }

  return (
    <Image
      accessible={false}
      resizeMode="contain"
      source={
        variant === "welcome"
          ? require("../assets/onboarding/menu-reveal.png")
          : require("../assets/onboarding/menu-evidence.png")
      }
      style={variant === "welcome" ? styles.welcomeArtwork : styles.safetyArtwork}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 18,
    padding: 24,
    paddingBottom: 142,
    paddingTop: 16
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40
  },
  topActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  brand: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    fontSize: 28
  },
  progressLabel: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "uppercase"
  },
  hero: {
    alignItems: "center",
    height: 292,
    justifyContent: "center"
  },
  safetyHero: {
    height: 300
  },
  welcomeArtwork: {
    height: "100%",
    width: "100%"
  },
  safetyArtwork: {
    height: "100%",
    width: "100%"
  },
  copy: {
    alignItems: "center",
    gap: 12
  },
  welcomeCopy: {
    alignItems: "flex-start"
  },
  title: {
    color: colors.primaryDark,
    ...typography.display,
    fontSize: 37,
    lineHeight: 43,
    maxWidth: 342,
    textAlign: "center"
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: 42,
    lineHeight: 48,
    textAlign: "left"
  },
  body: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    maxWidth: 342,
    textAlign: "center"
  },
  welcomeBody: {
    fontSize: 17,
    lineHeight: 27,
    textAlign: "left"
  },
  stepPane: {
    gap: 18
  },
  footer: {
    backgroundColor: colors.background,
    bottom: 0,
    gap: 14,
    left: 0,
    padding: 24,
    paddingTop: 10,
    position: "absolute",
    right: 0
  },
  toast: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 116,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: "absolute",
    zIndex: 2
  },
  toastText: {
    color: colors.textInverse,
    ...typography.label
  },
  dotsTrack: {
    alignSelf: "center",
    height: 22,
    position: "relative",
    width: DOT_TRACK_WIDTH
  },
  dot: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 7,
    opacity: 0.5,
    position: "absolute",
    top: 7.5,
    width: 7
  },
  activeDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    left: 0,
    opacity: 1,
    position: "absolute",
    top: 7,
    width: DOT_ACTIVE_WIDTH
  },
  button: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 32
  },
  buttonDisabled: {
    backgroundColor: colors.disabled
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.button,
    fontSize: 17
  },
  profileSetup: {
    gap: 16
  },
  fieldGroup: {
    gap: 10
  },
  label: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    ...typography.bodyLarge,
    height: 50,
    includeFontPadding: false,
    lineHeight: 22,
    paddingBottom: 0,
    paddingHorizontal: 13,
    paddingTop: 0,
    textAlignVertical: "center"
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  addRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  customInput: {
    flex: 1
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  segmented: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    overflow: "hidden"
  },
  segment: {
    alignItems: "center",
    borderRightColor: colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: "center",
    minHeight: 46
  },
  segmentActive: {
    backgroundColor: colors.primarySoft
  },
  segmentText: {
    color: colors.inkMuted,
    ...typography.badge
  },
  segmentTextActive: {
    color: colors.primaryDark
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    paddingVertical: 4
  },
  switchCopy: {
    flex: 1,
    gap: 4
  },
  switchTitle: {
    color: colors.ink,
    ...typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24
  },
  switchBody: {
    color: colors.inkMuted,
    ...typography.caption
  }
});
