import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  Settings,
  Upload,
  UserRound
} from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { AllergyChip } from "../components/AllergyChip";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { BottomNavBar } from "../components/BottomNavBar";

type HomeScreenProps = {
  profile: UserProfile;
  onOpenProfile: () => void;
  onStartScan: () => void;
  onUploadPhoto: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
};

export function HomeScreen({
  profile,
  onOpenProfile,
  onStartScan,
  onUploadPhoto,
  onOpenHistory,
  onOpenSettings
}: HomeScreenProps) {
  const hasAllergies = profile.allergies.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.profileGreeting}>{profile.name || "Profile"}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" onPress={onOpenSettings} style={styles.iconButton}>
              <Settings color={colors.primary} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        {hasAllergies ? (
          <View style={styles.allergyPanel}>
            <View style={styles.chipGrid}>
              {profile.allergies.map((allergy) => (
                <AllergyChip key={allergy.id} label={allergy.name} severity={allergy.severity} />
              ))}
            </View>
          </View>
        ) : (
          <EmptyState
            icon={UserRound}
            title="Create an allergy profile"
            body="Sift needs your allergies and severity before it can structure menu risks."
            actionLabel="Edit profile"
            onAction={onOpenProfile}
          />
        )}

        <View style={styles.scanPanel}>
          <Text style={styles.scanTitle}>Scan a menu</Text>
          <Text style={styles.scanBody}>
            Take a clear photo of one menu page. Sift will return likely risks, uncertainty, and
            staff questions.
          </Text>
          <View style={styles.scanActions}>
            <PrimaryButton label="Scan menu" icon={Camera} onPress={onStartScan} />
            <PrimaryButton label="Upload photo" icon={Upload} tone="secondary" onPress={onUploadPhoto} />
          </View>
        </View>

        <DisclaimerBanner compact />
      </ScrollView>
      <BottomNavBar
        active="home"
        onHome={() => undefined}
        onHistory={onOpenHistory}
        onProfile={onOpenProfile}
      />
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
    paddingBottom: 104
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  welcome: {
    color: colors.inkMuted,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20
  },
  profileGreeting: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  allergyPanel: {
    gap: 12,
    paddingVertical: 8
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  scanPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    padding: 18
  },
  scanTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0
  },
  scanBody: {
    color: colors.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 22
  },
  scanActions: {
    gap: 10
  },
});
