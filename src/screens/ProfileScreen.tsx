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
import { ChevronDown, Plus, Save, Trash2 } from "lucide-react-native";
import { Allergy, AllergySeverity, UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { commonAllergens } from "../constants/commonAllergens";
import { AllergyChip } from "../components/AllergyChip";
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
  const [expandedAllergyId, setExpandedAllergyId] = useState<string | null>(null);
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);
  const savedNoticeProgress = useRef(new Animated.Value(0)).current;
  const savedNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(profile);
    setCustomAllergen("");
    setExpandedAllergyId(null);
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

  const addAllergy = (name: string, expandAfterAdd = false) => {
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

    const nextAllergyId = `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const nextAllergy: Allergy = {
      id: nextAllergyId,
      name: trimmedName,
      severity: "severe",
      avoidCrossContact: true
    };

    setDraft((current) => ({
      ...current,
      allergies: [...current.allergies, nextAllergy]
    }));
    setCustomAllergen("");
    if (expandAfterAdd) {
      setExpandedAllergyId(nextAllergyId);
    }
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
    if (expandedAllergyId === id) {
      setExpandedAllergyId(null);
    }
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
          <View style={styles.chipGrid}>
            {commonAllergens.map((name) => {
              const selectedAllergy = getAllergyByName(name);
              const selected = Boolean(selectedAllergy);

              return (
                <AllergyChip
                  key={name}
                  label={formatAllergenName(name)}
                  selected={selected}
                  onPress={() => toggleQuickAllergen(name)}
                />
              );
            })}
          </View>
        </View>

        <View style={[styles.fieldGroup, styles.compactFieldGroup]}>
          <Text style={styles.label}>{t("profile.customAllergen")}</Text>
          <View style={styles.addRow}>
            <TextInput
              value={customAllergen}
              onChangeText={setCustomAllergen}
              placeholder={t("profile.customAllergen")}
              placeholderTextColor={colors.inkSubtle}
              style={[styles.input, styles.addInput]}
            />
            <AnimatedPressable
              accessibilityLabel={t("profile.add")}
              accessibilityRole="button"
              onPress={() => addAllergy(customAllergen, true)}
              style={styles.addButton}
            >
              <Plus color={colors.textInverse} size={20} strokeWidth={2.4} />
            </AnimatedPressable>
          </View>
        </View>

        {draft.allergies.length > 0 && (
          <View style={styles.allergyList}>
            <Text style={styles.label}>{t("profile.selectedDetails")}</Text>
            {draft.allergies.map((allergy) => {
              const expanded = expandedAllergyId === allergy.id;

              return (
                <View key={allergy.id} style={[styles.allergyCard, expanded && styles.allergyCardExpanded]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setExpandedAllergyId(expanded ? null : allergy.id)}
                    style={styles.allergyCardHeader}
                  >
                    <View style={styles.allergyHeaderText}>
                      <Text style={styles.allergyName}>{formatAllergenName(allergy.name)}</Text>
                      <View style={styles.allergyMetaRow}>
                        <View style={styles.severityPill}>
                          <Text style={styles.severityPillText}>{formatSeverity(allergy.severity)}</Text>
                        </View>
                        {allergy.avoidCrossContact && (
                          <View style={styles.crossContactPill}>
                            <Text style={styles.crossContactPillText}>{t("profile.crossContactMeta")}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable
                        accessibilityLabel={t("history.deleteScan")}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={(event) => {
                          event.stopPropagation();
                          removeAllergy(allergy.id);
                        }}
                      >
                        <Trash2 color={colors.inkSubtle} size={17} strokeWidth={2.1} />
                      </Pressable>
                      <ChevronDown
                        color={colors.inkSubtle}
                        size={19}
                        strokeWidth={2.1}
                        style={expanded && styles.chevronExpanded}
                      />
                    </View>
                  </Pressable>

                  {expanded && (
                    <View style={styles.expandedDetails}>
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

                      <View style={styles.notesField}>
                        <Text style={styles.notesLabel}>{t("profile.customDetails")}</Text>
                        <TextInput
                          value={allergy.notes ?? ""}
                          onChangeText={(notes) => updateAllergy(allergy.id, { notes })}
                          placeholder={t("profile.customDetailsLongPlaceholder")}
                          placeholderTextColor={colors.inkSubtle}
                          style={[styles.input, styles.notesInput]}
                          multiline
                        />
                      </View>
                    </View>
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
    gap: 18,
    padding: 24,
    paddingTop: 18,
    paddingBottom: 154
  },
  header: {
    alignItems: "center",
    gap: 8
  },
  title: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    textAlign: "center"
  },
  subtitle: {
    color: colors.inkMuted,
    ...typography.bodySmall,
    maxWidth: 320,
    textAlign: "center"
  },
  fieldGroup: {
    gap: 10
  },
  compactFieldGroup: {
    marginTop: -4
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
    gap: 8,
    rowGap: 8
  },
  sectionMeta: {
    color: colors.inkSubtle,
    ...typography.badge
  },
  addRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  addInput: {
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
  allergyList: {
    gap: 10
  },
  allergyCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  allergyCardExpanded: {
    borderColor: colors.primaryMuted
  },
  allergyCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  allergyHeaderText: {
    flex: 1,
    gap: 7
  },
  allergyName: {
    color: colors.ink,
    ...typography.bodyLarge,
    lineHeight: 22
  },
  allergyMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  severityPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  severityPillText: {
    color: colors.primaryDark,
    ...typography.badge,
    textTransform: "capitalize"
  },
  crossContactPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  crossContactPillText: {
    color: colors.accentMuted,
    ...typography.badge,
    textTransform: "capitalize"
  },
  cardActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  chevronExpanded: {
    transform: [{ rotate: "180deg" }]
  },
  expandedDetails: {
    borderTopColor: colors.borderSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
    padding: 14,
    paddingTop: 12
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
  notesField: {
    gap: 8
  },
  notesLabel: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "uppercase"
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
