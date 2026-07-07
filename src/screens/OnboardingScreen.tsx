import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, Plus } from "lucide-react-native";
import { Allergy, AllergySeverity, UserProfile } from "../types/allergy";
import { AuthSession } from "../types/auth";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { commonAllergens } from "../constants/commonAllergens";
import { AllergyChip } from "../components/AllergyChip";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { isAppleSignInAvailable } from "../services/authService";
import { useI18n } from "../i18n/I18nProvider";

type OnboardingStep = "welcome" | "safety" | "account" | "profile" | "scanTips" | "plus";
type OnboardingGraphicVariant = OnboardingStep;

type OnboardingScreenProps = {
  authError?: string | null;
  authLoading?: boolean;
  authSession: AuthSession | null;
  profile: UserProfile;
  onComplete: (profile: UserProfile) => void | Promise<void>;
  onSignInWithApple: () => Promise<boolean>;
};

const steps: OnboardingStep[] = ["welcome", "safety", "account", "profile", "scanTips", "plus"];
const onboardingAllergens = commonAllergens.slice(0, 10);
const severities: AllergySeverity[] = ["mild", "moderate", "severe"];

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
  authError,
  authLoading = false,
  authSession,
  profile,
  onComplete,
  onSignInWithApple
}: OnboardingScreenProps) {
  const { t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [appleAvailable, setAppleAvailable] = useState(false);
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

  useEffect(() => {
    let mounted = true;
    isAppleSignInAvailable()
      .then((available) => {
        if (mounted) {
          setAppleAvailable(available);
        }
      })
      .catch(() => {
        if (mounted) {
          setAppleAvailable(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeStep = steps[stepIndex];
  const profileReady = selectedAllergens.length > 0;
  const canUsePrimaryAction =
    activeStep !== "account" && (activeStep !== "profile" || profileReady);
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
      case "account":
        return {
          body: t("onboarding.accountBody"),
          title: t("onboarding.accountTitle")
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
    if (activeStep === "profile" && !profileReady) {
      return;
    }

    if (activeStep === "plus") {
      await onComplete(buildProfile());
      return;
    }

    setStepIndex((currentIndex) => Math.min(currentIndex + 1, steps.length - 1));
  };

  const handleAppleSignIn = async () => {
    if (authLoading) {
      return;
    }

    const signedIn = await onSignInWithApple();
    if (signedIn) {
      setStepIndex((currentIndex) => Math.min(currentIndex + 1, steps.length - 1));
    }
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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Text style={styles.brand}>{t("common.sift")}</Text>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>

        <View style={styles.hero}>
          <OnboardingGraphic variant={activeStep} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
        </View>

        {activeStep === "account" && (
          <AccountStep
            appleAvailable={appleAvailable}
            authError={authError}
            authLoading={authLoading}
            authSession={authSession}
            onContinue={() => setStepIndex((currentIndex) => Math.min(currentIndex + 1, steps.length - 1))}
            onSignIn={handleAppleSignIn}
          />
        )}

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
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {steps.map((step, index) => (
            <View key={step} style={[styles.dot, index === stepIndex && styles.activeDot]} />
          ))}
        </View>

        {activeStep !== "account" && (
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
        )}
      </View>
    </SafeAreaView>
  );
}

function AccountStep({
  appleAvailable,
  authError,
  authLoading,
  authSession,
  onContinue,
  onSignIn
}: {
  appleAvailable: boolean;
  authError?: string | null;
  authLoading: boolean;
  authSession: AuthSession | null;
  onContinue: () => void;
  onSignIn: () => void;
}) {
  const { t } = useI18n();

  if (authSession) {
    return (
      <AnimatedPressable accessibilityRole="button" onPress={onContinue} style={styles.button}>
        <Text style={styles.buttonText}>{t("onboarding.continue")}</Text>
        <ArrowRight color={colors.textInverse} size={16} strokeWidth={2.1} />
      </AnimatedPressable>
    );
  }

  return (
    <View style={styles.accountActions}>
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          cornerRadius={999}
          onPress={onSignIn}
          style={styles.appleButton}
        />
      ) : (
        <View style={styles.unavailable}>
          <Text style={styles.unavailableTitle}>{t("login.appleUnavailableTitle")}</Text>
          <Text style={styles.unavailableText}>{t("login.appleUnavailableBody")}</Text>
        </View>
      )}
      {authLoading && <ActivityIndicator color={colors.primary} />}
      {authError && <Text style={styles.error}>{authError}</Text>}
    </View>
  );
}

function OnboardingGraphic({ variant }: { variant: OnboardingGraphicVariant }) {
  if (variant === "welcome") {
    return (
      <View style={styles.graphicStage}>
        <View style={styles.menuSheet}>
          <View style={styles.menuLineWide} />
          <View style={styles.menuLine} />
          <View style={styles.scanLine} />
          <View style={styles.riskPreview}>
            <View style={styles.riskPillTeal} />
            <View style={styles.riskPillAmber} />
          </View>
        </View>
      </View>
    );
  }

  if (variant === "safety") {
    return (
      <View style={styles.graphicStage}>
        <View style={styles.limitationCard}>
          <View style={styles.knownPanel}>
            <View style={styles.menuLineWide} />
            <View style={styles.menuLine} />
            <Text style={styles.graphicCaption}>Visible menu</Text>
          </View>
          <View style={styles.unknownPanel}>
            <View style={styles.fadedBlock} />
            <Text style={styles.graphicCaptionMuted}>Kitchen details</Text>
          </View>
        </View>
      </View>
    );
  }

  if (variant === "account") {
    return (
      <View style={styles.graphicStage}>
        <View style={styles.accountCard}>
          <View style={styles.avatarDot} />
          <View style={styles.accountLines}>
            <View style={styles.menuLineWide} />
            <View style={styles.menuLine} />
          </View>
        </View>
        <View style={styles.connectorLine} />
        <View style={styles.scanCardMini}>
          <View style={styles.scanLineMini} />
          <View style={styles.riskPillTeal} />
        </View>
      </View>
    );
  }

  if (variant === "profile") {
    return (
      <View style={styles.graphicStage}>
        <View style={styles.profileCardGraphic}>
          <Text style={styles.profileGraphicName}>Me</Text>
          <View style={styles.graphicChipRow}>
            <View style={styles.graphicChip} />
            <View style={styles.graphicChipShort} />
          </View>
          <View style={styles.graphicSeverity} />
        </View>
      </View>
    );
  }

  if (variant === "scanTips") {
    return (
      <View style={styles.graphicStage}>
        <View style={styles.phoneFrame}>
          <View style={styles.cameraMenu}>
            <View style={styles.menuLineWide} />
            <View style={styles.menuLine} />
            <View style={styles.menuLineShort} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.graphicStage}>
      <View style={styles.plusCardGraphic}>
        <View style={styles.plusRowGraphic} />
        <View style={styles.plusRowGraphic} />
        <View style={styles.plusRowGraphicShort} />
      </View>
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
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
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
  accountActions: {
    alignItems: "center",
    gap: 14
  },
  appleButton: {
    height: 52,
    width: "100%"
  },
  unavailable: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 16,
    width: "100%"
  },
  unavailableTitle: {
    color: colors.ink,
    ...typography.label,
    textAlign: "center"
  },
  unavailableText: {
    color: colors.inkMuted,
    ...typography.bodySmall,
    textAlign: "center"
  },
  error: {
    color: colors.high,
    ...typography.bodySmall,
    textAlign: "center"
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
    width: "100%"
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
  scanLine: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 4,
    marginVertical: 8,
    width: "100%"
  },
  riskPreview: {
    flexDirection: "row",
    gap: 8
  },
  riskPillTeal: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 20,
    width: 72
  },
  riskPillAmber: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    height: 20,
    width: 58
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
  graphicCaption: {
    color: colors.primaryDark,
    ...typography.badge
  },
  graphicCaptionMuted: {
    color: colors.inkSubtle,
    ...typography.badge,
    textAlign: "center"
  },
  accountCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 14,
    padding: 18,
    width: 210
  },
  avatarDot: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    width: 48
  },
  accountLines: {
    flex: 1,
    gap: 9
  },
  connectorLine: {
    backgroundColor: colors.primaryMuted,
    height: 22,
    width: 3
  },
  scanCardMini: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 14,
    width: 150
  },
  scanLineMini: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 4,
    width: "86%"
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
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 10,
    width: "100%"
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
    padding: 18
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
