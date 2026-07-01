import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Plus, UserRound } from "lucide-react-native";
import { Allergy, AllergySeverity, UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { commonAllergens } from "../constants/commonAllergens";
import { AllergyChip } from "../components/AllergyChip";
import { PrimaryButton } from "../components/PrimaryButton";
import { BottomNavBar } from "../components/BottomNavBar";

type ProfileScreenProps = {
  profile: UserProfile;
  profiles: UserProfile[];
  activeProfileId: string;
  onChangeProfile: (profile: UserProfile) => void;
  onSelectProfile: (profileId: string, currentProfile: UserProfile) => void;
  onCreateProfile: (currentProfile: UserProfile) => void;
  onDone: () => void;
  onHome?: () => void;
  onOpenHistory?: () => void;
};

const severities: AllergySeverity[] = ["mild", "moderate", "severe"];

export function ProfileScreen({
  profile,
  profiles,
  activeProfileId,
  onChangeProfile,
  onSelectProfile,
  onCreateProfile,
  onDone,
  onHome,
  onOpenHistory
}: ProfileScreenProps) {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [customAllergen, setCustomAllergen] = useState("");

  useEffect(() => {
    setDraft(profile);
    setCustomAllergen("");
  }, [profile]);

  const save = () => {
    onChangeProfile(draft);
    onDone();
  };

  const selectProfile = (profileId: string) => {
    if (profileId === activeProfileId) {
      return;
    }

    onSelectProfile(profileId, draft);
  };

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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <UserRound color={colors.primary} size={22} strokeWidth={2.2} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Allergy profile</Text>
            <Text style={styles.title}>Tell Sift what to watch for.</Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Saved profiles</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onCreateProfile(draft)}
              style={styles.newProfileButton}
            >
              <Plus color={colors.primary} size={16} strokeWidth={2.4} />
              <Text style={styles.newProfileText}>New</Text>
            </Pressable>
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
                  <Text style={[styles.profilePillName, active && styles.profilePillNameActive]}>
                    {savedProfile.name || "Profile"}
                  </Text>
                  <Text style={styles.profilePillMeta}>{savedProfile.allergies.length} allergies</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Profile name</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Me"
            placeholderTextColor={colors.inkSubtle}
            style={styles.input}
          />
        </View>

        <View style={styles.languageRow}>
          <View style={styles.languageField}>
            <Text style={styles.label}>Your language</Text>
            <TextInput
              value={draft.preferredLanguage}
              onChangeText={(preferredLanguage) =>
                setDraft((current) => ({ ...current, preferredLanguage }))
              }
              placeholder="English"
              placeholderTextColor={colors.inkSubtle}
              style={styles.input}
            />
          </View>
          <View style={styles.languageField}>
            <Text style={styles.label}>Restaurant language</Text>
            <TextInput
              value={draft.restaurantLanguage ?? ""}
              onChangeText={(restaurantLanguage) =>
                setDraft((current) => ({ ...current, restaurantLanguage }))
              }
              placeholder="Japanese"
              placeholderTextColor={colors.inkSubtle}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Quick add</Text>
          <View style={styles.chipGrid}>
            {commonAllergens.map((name) => (
              <AllergyChip
                key={name}
                label={name}
                selected={draft.allergies.some((allergy) => allergy.name === name)}
                onPress={() => toggleQuickAllergen(name)}
              />
            ))}
          </View>
        </View>

        <View style={styles.addRow}>
          <TextInput
            value={customAllergen}
            onChangeText={setCustomAllergen}
            placeholder="Custom allergen"
            placeholderTextColor={colors.inkSubtle}
            style={[styles.input, styles.addInput]}
          />
          <PrimaryButton label="Add" icon={Plus} onPress={() => addAllergy(customAllergen)} />
        </View>

        <View style={styles.allergyList}>
          {draft.allergies.map((allergy) => (
            <View key={allergy.id} style={styles.allergyCard}>
              <View style={styles.allergyHeader}>
                <AllergyChip
                  label={allergy.name}
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
                        {severity}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>Cross-contact sensitive</Text>
                  <Text style={styles.switchBody}>Ask about shared equipment and prep.</Text>
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

              <TextInput
                value={allergy.notes ?? ""}
                onChangeText={(notes) => updateAllergy(allergy.id, { notes })}
                placeholder="Notes, such as oils, traces, or tolerated forms"
                placeholderTextColor={colors.inkSubtle}
                style={[styles.input, styles.notesInput]}
                multiline
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Save profile" icon={Check} onPress={save} />
      </View>
      {onHome && onOpenHistory && (
        <BottomNavBar
          active="profile"
          onHome={onHome}
          onHistory={onOpenHistory}
          onProfile={() => undefined}
        />
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
    gap: 22,
    padding: 20,
    paddingBottom: 168
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  headerText: {
    flex: 1,
    gap: 4
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 31
  },
  fieldGroup: {
    gap: 10
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  newProfileButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 12
  },
  newProfileText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0
  },
  profileSwitcher: {
    gap: 8,
    paddingRight: 20
  },
  profilePill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
    minWidth: 116,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  profilePillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  profilePillName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0
  },
  profilePillNameActive: {
    color: colors.primary
  },
  profilePillMeta: {
    color: colors.inkSubtle,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0
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
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    fontSize: 16,
    letterSpacing: 0,
    minHeight: 48,
    paddingHorizontal: 13
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
  addInput: {
    flex: 1
  },
  allergyList: {
    gap: 12
  },
  allergyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    padding: 14
  },
  allergyHeader: {
    alignItems: "flex-start"
  },
  segmented: {
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: colors.surface
  },
  segmentText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
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
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  },
  switchBody: {
    color: colors.inkMuted,
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 18
  },
  notesInput: {
    minHeight: 70,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 98,
    left: 0,
    padding: 20,
    position: "absolute",
    right: 0
  }
});
