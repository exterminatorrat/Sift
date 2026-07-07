import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, Plus } from "lucide-react-native";
import { Allergy, AllergySeverity, UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { commonAllergens } from "../constants/commonAllergens";
import { AllergyChip } from "../components/AllergyChip";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { useI18n } from "../i18n/I18nProvider";

type OnboardingStep = "welcome" | "safety" | "profile" | "scanTips" | "plus";
type OnboardingGraphicVariant = OnboardingStep;

type OnboardingScreenProps = {
  profile: UserProfile;
  onComplete: (profile: UserProfile) => void | Promise<void>;
};

const steps: OnboardingStep[] = ["welcome", "safety", "profile", "scanTips", "plus"];
const onboardingAllergens = commonAllergens.slice(0, 10);
const severities: AllergySeverity[] = ["mild", "moderate", "severe"];
const DOT_PITCH = 15;
const DOT_TRACK_WIDTH = 24 + (steps.length - 1) * DOT_PITCH;

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
  const dotProgress = useRef(new Animated.Value(0)).current;
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
      case "scanTips":
        return {
          body: t("onboarding.scanTipsBody"),
          title: t("onboarding.scanTipsTitle")
        };
      case "plus":
        return {
          body: t("onboarding.plusBody"),
          title: t("onboarding.plusTitle")
        };
    }
  }, [activeStep, t]);

  const primaryLabel = useMemo(() => {
    switch (activeStep) {
      case "safety":
        return t("onboarding.iUnderstand");
      case "profile":
        return t("onboarding.createProfile");
      case "plus":
        return t("onboarding.continueFree");
      default:
        return t("onboarding.continue");
    }
  }, [activeStep, t]);

  const moveNext = async () => {
    if (transitioning || (activeStep === "profile" && !profileReady)) {
      return;
    }

    if (activeStep === "plus") {
      await onComplete(buildProfile());
      return;
    }

    goToStep(Math.min(stepIndex + 1, steps.length - 1));
  };

  const goToStep = (nextIndex: number) => {
    if (nextIndex === stepIndex || transitioning) {
      return;
    }

    const direction = nextIndex > stepIndex ? 1 : -1;
    setTransitionDirection(direction);
    setTransitioning(true);
    Animated.spring(dotProgress, {
      damping: 18,
      mass: 0.7,
      stiffness: 180,
      toValue: nextIndex,
      useNativeDriver: true
    }).start();
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

  const activeDotTranslateX = dotProgress.interpolate({
    inputRange: steps.map((_, index) => index),
    outputRange: steps.map((_, index) => index * DOT_PITCH)
  });

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Text style={styles.brand}>{t("common.sift")}</Text>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
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
          <View style={styles.hero}>
            <OnboardingGraphic variant={activeStep} />
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>
          </View>

          {activeStep === "profile" && (
            <View style={styles.profileSetup}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("onboarding.profileNameLabel")}</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
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
                    onPress={() => toggleAllergen(allergen)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.addRow}>
              <TextInput
                value={customAllergen}
                onChangeText={setCustomAllergen}
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

            {selectedAllergens.length > 0 && (
              <View style={styles.selectedPreview}>
                {selectedAllergens.map((allergen) => (
                  <View key={allergen} style={styles.selectedPill}>
                    <Text style={styles.selectedPillText}>{allergen}</Text>
                  </View>
                ))}
              </View>
            )}

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

          {activeStep === "scanTips" && (
            <View style={styles.tipStack}>
              <TipPill label={t("onboarding.tipReadable")} />
              <TipPill label={t("onboarding.tipDescriptions")} />
              <TipPill label={t("onboarding.tipNoGlare")} />
            </View>
          )}

          {activeStep === "plus" && (
            <View style={styles.plusStack}>
              <PlusFeature label={t("onboarding.plusFeatureScans")} />
              <PlusFeature label={t("onboarding.plusFeatureTranslations")} />
              <PlusFeature label={t("onboarding.plusFeatureFamily")} />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dotsTrack}>
          {steps.map((step, index) => (
            <View key={step} style={[styles.dot, { left: index * DOT_PITCH + 8.5 }]} />
          ))}
          <Animated.View
            style={[
              styles.activeDot,
              {
                transform: [{ translateX: activeDotTranslateX }]
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
  return (
    <View style={styles.graphicStage}>
      <View style={styles.artHalo} />
      {variant === "welcome" && (
        <View style={styles.artCluster}>
          <View style={[styles.menuSheet, styles.menuSheetBack]} />
          <View style={styles.menuSheet}>
            <View style={styles.foldedCorner} />
            <View style={styles.menuLineWide} />
            <View style={styles.menuLine} />
            <View style={styles.scanBeam} />
            <View style={styles.floatingRiskCard}>
              <View style={styles.riskDotTeal} />
              <View style={styles.riskCardLines}>
                <View style={styles.riskLineWide} />
                <View style={styles.riskLineShort} />
              </View>
            </View>
          </View>
        </View>
      )}

      {variant === "safety" && (
        <View style={styles.limitationCard}>
          <View style={styles.knownPanel}>
            <View style={styles.menuLineWide} />
            <View style={styles.menuLine} />
            <View style={styles.safeBoundaryLine} />
            <Text style={styles.graphicCaption}>Visible menu</Text>
          </View>
          <View style={styles.unknownPanel}>
            <View style={styles.fadedBlock} />
            <View style={styles.fadedSmallBlock} />
            <Text style={styles.graphicCaptionMuted}>Kitchen details</Text>
          </View>
        </View>
      )}

      {variant === "profile" && (
        <View style={styles.profileCardGraphic}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarDot} />
            <Text style={styles.profileGraphicName}>Me</Text>
          </View>
          <View style={styles.graphicChipRow}>
            <View style={styles.graphicChip} />
            <View style={styles.graphicChipShort} />
          </View>
          <View style={styles.graphicSeverity}>
            <View style={styles.graphicSeverityFill} />
          </View>
        </View>
      )}

      {variant === "scanTips" && (
        <View style={styles.phoneFrame}>
          <View style={styles.cameraMenu}>
            <View style={styles.cameraScanFrame} />
            <View style={styles.menuLineWide} />
            <View style={styles.menuLine} />
            <View style={styles.menuLineShort} />
          </View>
        </View>
      )}

      {variant === "plus" && (
        <View style={styles.plusCardGraphic}>
          <View style={styles.plusHeaderMark} />
          <View style={styles.plusRowGraphic} />
          <View style={styles.plusRowGraphic} />
          <View style={styles.plusRowGraphicShort} />
        </View>
      )}
    </View>
  );
}

function TipPill({ label }: { label: string }) {
  return (
    <View style={styles.tipPill}>
      <Text style={styles.tipPillText}>{label}</Text>
    </View>
  );
}

function PlusFeature({ label }: { label: string }) {
  return (
    <View style={styles.plusFeature}>
      <View style={styles.plusFeatureDot} />
      <Text style={styles.plusFeatureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 24,
    padding: 24,
    paddingBottom: 150,
    paddingTop: 18
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  brand: {
    color: colors.primaryDark,
    ...typography.pageTitle
  },
  progressLabel: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "uppercase"
  },
  hero: {
    alignItems: "center",
    minHeight: 198,
    justifyContent: "center"
  },
  copy: {
    alignItems: "center",
    gap: 14
  },
  title: {
    color: colors.primaryDark,
    ...typography.display,
    fontSize: 38,
    lineHeight: 45,
    maxWidth: 342,
    textAlign: "center"
  },
  body: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    maxWidth: 342,
    textAlign: "center"
  },
  stepPane: {
    gap: 24
  },
  footer: {
    backgroundColor: colors.background,
    bottom: 0,
    gap: 18,
    left: 0,
    padding: 24,
    paddingTop: 12,
    position: "absolute",
    right: 0
  },
  dotsTrack: {
    alignSelf: "center",
    height: 24,
    position: "relative",
    width: DOT_TRACK_WIDTH
  },
  dot: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 7,
    opacity: 0.5,
    position: "absolute",
    top: 8.5,
    width: 7
  },
  activeDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    left: 0,
    opacity: 1,
    position: "absolute",
    top: 8,
    width: 24
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
  buttonDisabled: {
    backgroundColor: colors.disabled
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.button
  },
  profileSetup: {
    gap: 18
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
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    ...typography.bodyLarge,
    height: 48,
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
    height: 48,
    justifyContent: "center",
    width: 48
  },
  selectedPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  selectedPill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  selectedPillText: {
    color: colors.primaryDark,
    ...typography.badge
  },
  segmented: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 10,
    flexDirection: "row",
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 38
  },
  segmentActive: {
    backgroundColor: colors.surfaceWarm
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
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    padding: 16
  },
  switchCopy: {
    flex: 1,
    gap: 4
  },
  switchTitle: {
    color: colors.ink,
    ...typography.label
  },
  switchBody: {
    color: colors.inkMuted,
    ...typography.caption
  },
  tipStack: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center"
  },
  tipPill: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tipPillText: {
    color: colors.inkMuted,
    ...typography.badge
  },
  plusStack: {
    gap: 10
  },
  plusFeature: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 16
  },
  plusFeatureDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    width: 8
  },
  plusFeatureText: {
    color: colors.ink,
    ...typography.body
  },
  graphicStage: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    position: "relative",
    width: "100%"
  },
  artHalo: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 178,
    opacity: 0.52,
    position: "absolute",
    width: 178
  },
  artCluster: {
    alignItems: "center",
    justifyContent: "center"
  },
  menuSheet: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    gap: 12,
    minHeight: 150,
    padding: 22,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    width: 230
  },
  menuSheetBack: {
    height: 138,
    opacity: 0.58,
    position: "absolute",
    transform: [{ rotate: "-5deg" }, { translateY: 6 }],
    width: 210
  },
  foldedCorner: {
    backgroundColor: colors.accentSoft,
    borderBottomLeftRadius: 12,
    height: 34,
    position: "absolute",
    right: 0,
    top: 0,
    width: 34
  },
  menuLineWide: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 9,
    opacity: 0.55,
    width: "72%"
  },
  menuLine: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 8,
    width: "55%"
  },
  menuLineShort: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 8,
    width: "38%"
  },
  scanBeam: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 4,
    marginVertical: 8,
    width: "100%"
  },
  floatingRiskCard: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    marginTop: 2,
    padding: 10,
    width: 138
  },
  riskDotTeal: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 10,
    width: 10
  },
  riskCardLines: {
    flex: 1,
    gap: 6
  },
  riskLineWide: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    height: 7,
    width: "100%"
  },
  riskLineShort: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 7,
    width: "70%"
  },
  limitationCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 140,
    overflow: "hidden",
    width: 260
  },
  knownPanel: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 18
  },
  unknownPanel: {
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    flex: 1,
    gap: 12,
    justifyContent: "center",
    opacity: 0.74,
    padding: 18
  },
  fadedBlock: {
    backgroundColor: colors.borderStrong,
    borderRadius: 16,
    height: 48,
    opacity: 0.35,
    width: 66
  },
  fadedSmallBlock: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 9,
    opacity: 0.3,
    width: 74
  },
  safeBoundaryLine: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 3,
    width: "82%"
  },
  graphicCaption: {
    color: colors.primaryDark,
    ...typography.badge
  },
  graphicCaptionMuted: {
    color: colors.inkSubtle,
    ...typography.badge,
    textAlign: "center"
  },
  avatarDot: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    width: 48
  },
  profileCardGraphic: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    padding: 22,
    width: 230
  },
  profileTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  profileGraphicName: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  graphicChipRow: {
    flexDirection: "row",
    gap: 8
  },
  graphicChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 28,
    width: 86
  },
  graphicChipShort: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 28,
    width: 68
  },
  graphicSeverity: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 10,
    width: "100%"
  },
  graphicSeverityFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: "100%",
    width: "78%"
  },
  phoneFrame: {
    backgroundColor: colors.ink,
    borderRadius: 34,
    padding: 12,
    width: 150
  },
  cameraMenu: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: 22,
    gap: 12,
    minHeight: 152,
    overflow: "hidden",
    padding: 18
  },
  cameraScanFrame: {
    borderColor: colors.primaryMuted,
    borderRadius: 14,
    borderWidth: 2,
    bottom: 18,
    left: 16,
    opacity: 0.72,
    position: "absolute",
    right: 16,
    top: 18
  },
  plusCardGraphic: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 20,
    width: 230
  },
  plusHeaderMark: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 34,
    marginBottom: 4,
    width: 34
  },
  plusRowGraphic: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 28,
    width: "100%"
  },
  plusRowGraphicShort: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 28,
    width: "72%"
  }
});
