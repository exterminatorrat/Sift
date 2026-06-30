import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, History, Languages, LucideIcon, Upload, UserRound } from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { AllergyChip } from "../components/AllergyChip";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { formatAllergySummary } from "../utils/formatters";

type HomeScreenProps = {
  profile: UserProfile;
  onOpenProfile: () => void;
  onStartScan: () => void;
  onOpenHistory: () => void;
};

export function HomeScreen({
  profile,
  onOpenProfile,
  onStartScan,
  onOpenHistory
}: HomeScreenProps) {
  const hasAllergies = profile.allergies.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Sift</Text>
            <Text style={styles.subtitle}>Checking for: {formatAllergySummary(profile.allergies)}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onOpenProfile} style={styles.iconButton}>
            <UserRound color={colors.primary} size={21} strokeWidth={2.2} />
          </Pressable>
        </View>

        {hasAllergies ? (
          <View style={styles.allergyPanel}>
            <Text style={styles.panelLabel}>Active allergy profile</Text>
            <Text style={styles.profileName}>{profile.name}</Text>
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
            <PrimaryButton label="Upload photo" icon={Upload} tone="secondary" onPress={onStartScan} />
          </View>
        </View>

        <View style={styles.linkList}>
          <HomeLink icon={History} title="Recent scans" body="Japanese menu scan from today." onPress={onOpenHistory} />
          <HomeLink
            icon={Languages}
            title="Allergy translation card"
            body={`Restaurant language: ${profile.restaurantLanguage ?? "Not set"}`}
            onPress={onStartScan}
          />
        </View>

        <DisclaimerBanner compact />
      </ScrollView>
    </SafeAreaView>
  );
}

type HomeLinkProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  onPress: () => void;
};

function HomeLink({ icon: Icon, title, body, onPress }: HomeLinkProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.linkRow}>
      <View style={styles.linkIcon}>
        <Icon color={colors.primary} size={18} strokeWidth={2.1} />
      </View>
      <View style={styles.linkText}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkBody}>{body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 22,
    padding: 20
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  brand: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: 2,
    maxWidth: 270
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  allergyPanel: {
    gap: 12,
    paddingVertical: 8
  },
  panelLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  profileName: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0
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
  linkList: {
    borderBottomColor: colors.border,
    borderTopColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16
  },
  linkIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  linkText: {
    flex: 1,
    gap: 2
  },
  linkTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0
  },
  linkBody: {
    color: colors.inkMuted,
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 19
  }
});
