import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { Check, Plus, Save, Trash2 } from "lucide-react-native";
import { Allergy, AllergySeverity, UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { commonAllergens } from "../constants/commonAllergens";
import { AllergyChip } from "../components/AllergyChip";
import { PrimaryButton } from "../components/PrimaryButton";
import { BottomNavBar } from "../components/BottomNavBar";
import { useI18n } from "../i18n/I18nProvider";
import { TranslationKey } from "../i18n/translations";
import { AnimatedPressable } from "../components/AnimatedPressable";

type ProfileScreenProps = {
  profile: UserProfile;
  profiles: UserProfile[];
  activeProfileId: string;
  onChangeProfile: (profile: UserProfile) => void | Promise<void>;
  onSelectProfile: (profileId: string, currentProfile: UserProfile) => void;
  onCreateProfile: (currentProfile: UserProfile) => void;
  onDeleteProfile: (profileId: string, currentProfile: UserProfile) => void | Promise<void>;
  onDone: () => void;
  onHome?: () => void;
  onOpenHistory?: () => void;
};

const severities: AllergySeverity[] = ["mild", "moderate", "severe"];

const severityLabelKeys: Record<AllergySeverity, TranslationKey> = {
  mild: "severity.mild",
  moderate: "severity.moderate",
  severe: "severity.severe"
};

const allergenLabelKeys: Record<string, TranslationKey> = {
  Dairy: "allergen.dairy",
  Egg: "allergen.egg",
  Fish: "allergen.fish",
  Mango: "allergen.mango",
  Mustard: "allergen.mustard",
  Peanut: "allergen.peanut",
  Sesame: "allergen.sesame",
  Shellfish: "allergen.shellfish",
  Soy: "allergen.soy",
  Sulfites: "allergen.sulfites",
  "Tree nuts": "allergen.treeNuts",
  "Wheat/gluten": "allergen.wheatGluten"
};

export function ProfileScreen({
  profile,
  profiles,
  activeProfileId,
  onChangeProfile,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onDone,
  onHome,
  onOpenHistory
}: ProfileScreenProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [customAllergen, setCustomAllergen] = useState("");
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);
  const savedNoticeProgress = useRef(new Animated.Value(0)).current;
  const savedNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(profile);
    setCustomAllergen("");
  }, [profile]);

  useEffect(() => {
    return () => {
      if (savedNoticeTimeout.current) {
        clearTimeout(savedNoticeTimeout.current);
      }
    };
  }, []);

  const showSavedNotice = () => {
    if (savedNoticeTimeout.current) {
      clearTimeout(savedNoticeTimeout.current);
    }

    setSavedNoticeVisible(true);
    savedNoticeProgress.setValue(0);
    Animated.timing(savedNoticeProgress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

    savedNoticeTimeout.current = setTimeout(() => {
      Animated.timing(savedNoticeProgress, {
        toValue: 0,
        duration: 210,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) {
          setSavedNoticeVisible(false);
        }
      });
    }, 1700);
  };

  const save = async () => {
    await onChangeProfile(draft);
    showSavedNotice();
  };

  const confirmDeleteProfile = (profileId: string, profileName: string) => {
    Alert.alert(t("profile.deleteProfileTitle"), t("profile.deleteProfileBody", { name: profileName || t("profile.profileFallback") }), [
      { text: t("settings.cancel"), style: "cancel" },
      {
        text: t("history.deleteScan"),
        style: "destructive",
        onPress: () => {
          void onDeleteProfile(profileId, draft);
        }
      }
    ]);
  };

  const selectProfile = (profileId: string) => {
    if (profileId === activeProfileId) {
      return;
    }

    onSelectProfile(profileId, draft);
  };

  const getAllergyByName = (name: string) =>
    draft.allergies.find((allergy) => allergy.name.toLowerCase() === name.toLowerCase());

  const addAllergy = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const exists = draft.allergies.some(
      (allergy) => allergy.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      setCustomAllergen("");
      return;
    }

    const nextAllergy: Allergy = {
      id: `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: trimmedName,
      severity: "severe",
      avoidCrossContact: true
    };

    setDraft((current) => ({
      ...current,
      allergies: [...current.allergies, nextAllergy]
    }));
    setCustomAllergen("");
  };

  const toggleQuickAllergen = (name: string) => {
    const selectedAllergy = draft.allergies.find(
      (allergy) => allergy.name.toLowerCase() === name.toLowerCase()
    );

    if (selectedAllergy) {
      removeAllergy(selectedAllergy.id);
      return;
    }

    addAllergy(name);
  };

  const updateAllergy = (id: string, patch: Partial<Allergy>) => {
    setDraft((current) => ({
      ...current,
      allergies: current.allergies.map((allergy) =>
        allergy.id === id ? { ...allergy, ...patch } : allergy
      )
    }));
  };

  const removeAllergy = (id: string) => {
    setDraft((current) => ({
      ...current,
      allergies: current.allergies.filter((allergy) => allergy.id !== id)
    }));
  };

  const savedNoticeTranslateY = savedNoticeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0]
  });

  const formatAllergenName = (name: string) => {
    const key = allergenLabelKeys[name];
    return key ? t(key) : name;
  };

  const formatSeverity = (severity: AllergySeverity) => t(severityLabelKeys[severity]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{t("profile.title")}</Text>
          <Text style={styles.subtitle}>{t("profile.body")}</Text>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>{t("profile.savedProfiles")}</Text>
            <AnimatedPressable
              accessibilityRole="button"
              style={styles.newProfileButton}
              onPress={() => onCreateProfile(draft)}
            >
              <Plus color={colors.primary} size={16} strokeWidth={2.4} />
              <Text style={styles.newProfileText}>{t("profile.new")}</Text>
            </AnimatedPressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profileSwitcher}
          >
            {profiles.map((savedProfile) => {
              const active = savedProfile.id === activeProfileId;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={savedProfile.id}
                  onPress={() => selectProfile(savedProfile.id)}
                  style={[styles.profilePill, active && styles.profilePillActive]}
                >
                  <View style={styles.profilePillHeader}>
                    <Text style={[styles.profilePillName, active && styles.profilePillNameActive]}>
                      {savedProfile.name || t("profile.profileFallback")}
                    </Text>
                    <Pressable
                      accessibilityLabel={t("profile.deleteProfileBody", {
                        name: savedProfile.name || t("profile.profileFallback")
                      })}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmDeleteProfile(savedProfile.id, savedProfile.name);
                      }}
                    >
                      <Trash2 color={colors.inkSubtle} size={14} strokeWidth={2.1} />
                    </Pressable>
                  </View>
                  <Text style={styles.profilePillMeta}>
                    {t("profile.allergiesCount", { count: savedProfile.allergies.length })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t("profile.profileName")}</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder={t("profile.profileNamePlaceholder")}
            placeholderTextColor={colors.inkSubtle}
            style={styles.input}
          />
        </View>

        <View style={styles.languageRow}>
          <View style={styles.languageField}>
            <Text style={styles.label}>{t("profile.yourLanguage")}</Text>
            <TextInput
              value={draft.preferredLanguage}
              onChangeText={(preferredLanguage) =>
                setDraft((current) => ({ ...current, preferredLanguage }))
              }
              placeholder={t("profile.yourLanguagePlaceholder")}
              placeholderTextColor={colors.inkSubtle}
              style={styles.input}
            />
          </View>
          <View style={styles.languageField}>
            <Text style={styles.label}>{t("profile.restaurantLanguage")}</Text>
            <TextInput
              value={draft.restaurantLanguage ?? ""}
              onChangeText={(restaurantLanguage) =>
                setDraft((current) => ({ ...current, restaurantLanguage }))
              }
              placeholder={t("profile.restaurantLanguagePlaceholder")}
              placeholderTextColor={colors.inkSubtle}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>{t("profile.commonAllergens")}</Text>
            <Text style={styles.sectionMeta}>
              {t("profile.selectedCount", { count: draft.allergies.length })}
            </Text>
          </View>
          <View style={styles.quickList}>
            {commonAllergens.map((name) => {
              const selectedAllergy = getAllergyByName(name);
              const selected = Boolean(selectedAllergy);

              return (
                <View key={name} style={[styles.quickRow, selected && styles.quickRowActive]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => toggleQuickAllergen(name)}
                    style={styles.quickRowTop}
                  >
                    <View style={styles.quickBody}>
                      <Text style={styles.quickName}>{formatAllergenName(name)}</Text>
                      {selectedAllergy && (
                        <Text style={styles.quickMeta}>
                          {t("profile.severityMeta", {
                            severity: formatSeverity(selectedAllergy.severity)
                          })}
                          {selectedAllergy.avoidCrossContact ? ` - ${t("profile.crossContactMeta")}` : ""}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.quickMark, selected && styles.quickMarkActive]}>
                      {selected && <Check color={colors.textInverse} size={15} strokeWidth={2.5} />}
                    </View>
                  </Pressable>

                  {selectedAllergy && (
                    <>
                      <View style={styles.quickSegments}>
                        {severities.map((severity) => {
                          const active = selectedAllergy.severity === severity;
                          return (
                            <Pressable
                              accessibilityRole="button"
                              key={severity}
                              onPress={() => updateAllergy(selectedAllergy.id, { severity })}
                              style={[styles.quickSegment, active && styles.quickSegmentActive]}
                            >
                              <Text
                                style={[
                                  styles.quickSegmentText,
                                  active && styles.quickSegmentTextActive
                                ]}
                              >
                                {formatSeverity(severity)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <View style={styles.specificsField}>
                        <Text style={styles.specificsLabel}>{t("profile.customDetails")}</Text>
                        <TextInput
                          value={selectedAllergy.notes ?? ""}
                          onChangeText={(notes) => updateAllergy(selectedAllergy.id, { notes })}
                          placeholder={t("profile.customDetailsPlaceholder")}
                          placeholderTextColor={colors.inkSubtle}
                          style={styles.specificsInput}
                          multiline
                        />
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.addRow}>
          <TextInput
            value={customAllergen}
            onChangeText={setCustomAllergen}
            placeholder={t("profile.customAllergen")}
            placeholderTextColor={colors.inkSubtle}
            style={[styles.input, styles.addInput]}
          />
          <PrimaryButton label={t("profile.add")} icon={Plus} onPress={() => addAllergy(customAllergen)} />
        </View>

        {draft.allergies.length > 0 && (
          <View style={styles.allergyList}>
            <Text style={styles.label}>{t("profile.selectedDetails")}</Text>
            {draft.allergies.map((allergy) => {
              const commonAllergen = commonAllergens.some(
                (name) => name.toLowerCase() === allergy.name.toLowerCase()
              );

              return (
                <View key={allergy.id} style={styles.allergyCard}>
                  <View style={styles.allergyHeader}>
                    <AllergyChip
                      label={formatAllergenName(allergy.name)}
                      severity={allergy.severity}
                      onRemove={() => removeAllergy(allergy.id)}
                    />
                  </View>

                  <View style={styles.segmented}>
                    {severities.map((severity) => {
                      const active = allergy.severity === severity;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={severity}
                          onPress={() => updateAllergy(allergy.id, { severity })}
                          style={[styles.segment, active && styles.segmentActive]}
                        >
                          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                            {formatSeverity(severity)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.switchRow}>
                    <View style={styles.switchText}>
                      <Text style={styles.switchTitle}>{t("profile.crossContactSensitive")}</Text>
                      <Text style={styles.switchBody}>{t("profile.crossContactBody")}</Text>
                    </View>
                    <Switch
                      value={allergy.avoidCrossContact}
                      onValueChange={(avoidCrossContact) =>
                        updateAllergy(allergy.id, { avoidCrossContact })
                      }
                      trackColor={{ false: colors.borderStrong, true: colors.primarySoft }}
                      thumbColor={allergy.avoidCrossContact ? colors.primary : colors.inkSubtle}
                    />
                  </View>

                  {!commonAllergen && (
                    <TextInput
                      value={allergy.notes ?? ""}
                      onChangeText={(notes) => updateAllergy(allergy.id, { notes })}
                      placeholder={t("profile.customDetailsLongPlaceholder")}
                      placeholderTextColor={colors.inkSubtle}
                      style={[styles.input, styles.notesInput]}
                      multiline
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      {onHome && onOpenHistory && (
        <BottomNavBar
          active="profile"
          onHome={onHome}
          onHistory={onOpenHistory}
          onProfile={() => undefined}
        />
      )}
      <AnimatedPressable
        accessibilityLabel={t("profile.saveProfile")}
        accessibilityRole="button"
        onPress={() => {
          void save();
        }}
        scaleTo={0.92}
        style={styles.floatingSave}
      >
        <Save color={colors.textInverse} size={23} strokeWidth={2.2} />
      </AnimatedPressable>
      {savedNoticeVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: savedNoticeProgress,
              transform: [{ translateY: savedNoticeTranslateY }]
            }
          ]}
        >
          <Text style={styles.toastText}>{t("profile.savedToast")}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
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
    paddingTop: 18,
    paddingBottom: 154
  },
  header: {
    alignItems: "center",
    gap: 12
  },
  title: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    textAlign: "center"
  },
  subtitle: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    maxWidth: 320,
    textAlign: "center"
  },
  fieldGroup: {
    gap: 12
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  newProfileButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  newProfileText: {
    color: colors.primary,
    ...typography.badge
  },
  profileSwitcher: {
    gap: 8,
    paddingRight: 20
  },
  profilePill: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
    minWidth: 132,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  profilePillHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  profilePillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong
  },
  profilePillName: {
    color: colors.ink,
    ...typography.label,
    fontFamily: typography.label.fontFamily,
    fontWeight: "600"
  },
  profilePillNameActive: {
    color: colors.primary
  },
  profilePillMeta: {
    color: colors.inkSubtle,
    ...typography.badge
  },
  languageRow: {
    flexDirection: "row",
    gap: 10
  },
  languageField: {
    flex: 1,
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
    minHeight: 48,
    paddingHorizontal: 13
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  sectionMeta: {
    color: colors.inkSubtle,
    ...typography.badge
  },
  quickList: {
    gap: 10
  },
  quickRow: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  quickRowActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted
  },
  quickRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  quickBody: {
    flex: 1,
    gap: 3
  },
  quickName: {
    color: colors.ink,
    ...typography.label,
    fontSize: 16
  },
  quickMeta: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "capitalize"
  },
  quickMark: {
    borderColor: colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  quickMarkActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  quickSegments: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    marginHorizontal: 16,
    padding: 4
  },
  quickSegment: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 34,
    justifyContent: "center"
  },
  quickSegmentActive: {
    backgroundColor: colors.surfaceWarm,
    elevation: 1,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4
  },
  quickSegmentText: {
    color: colors.inkMuted,
    ...typography.badge,
    textTransform: "capitalize"
  },
  quickSegmentTextActive: {
    color: colors.primaryDark
  },
  specificsField: {
    gap: 7,
    marginBottom: 16,
    marginHorizontal: 16
  },
  specificsLabel: {
    color: colors.inkSubtle,
    ...typography.badge,
    fontSize: 11,
    textTransform: "uppercase"
  },
  specificsInput: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    ...typography.bodySmall,
    lineHeight: 20,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingTop: 10,
    textAlignVertical: "top"
  },
  addRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  addInput: {
    flex: 1
  },
  allergyList: {
    gap: 12
  },
  allergyCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    padding: 14
  },
  allergyHeader: {
    alignItems: "flex-start"
  },
  segmented: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    flexDirection: "row",
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 36,
    justifyContent: "center"
  },
  segmentActive: {
    backgroundColor: colors.surfaceWarm
  },
  segmentText: {
    color: colors.inkMuted,
    ...typography.badge,
    textTransform: "capitalize"
  },
  segmentTextActive: {
    color: colors.primary
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between"
  },
  switchText: {
    flex: 1,
    gap: 2
  },
  switchTitle: {
    color: colors.ink,
    ...typography.label
  },
  switchBody: {
    color: colors.inkMuted,
    ...typography.caption
  },
  notesInput: {
    minHeight: 70,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  floatingSave: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 104,
    elevation: 10,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 58
  },
  toast: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 116,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: "absolute"
  },
  toastText: {
    color: colors.textInverse,
    ...typography.label
  }
});
