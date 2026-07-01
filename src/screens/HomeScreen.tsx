import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  Plus,
  ScanLine,
  UserRound
} from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { colors } from "../constants/colors";
import { EmptyState } from "../components/EmptyState";
import { BottomNavBar } from "../components/BottomNavBar";
import { AppTopBar } from "../components/AppTopBar";

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
      <AppTopBar showMenu onMenu={onOpenSettings} />
      <ScrollView contentContainerStyle={styles.content}>
        {hasAllergies ? (
          <View style={styles.filtersSection}>
            <Text style={styles.sectionEyebrow}>Active filters</Text>
            <View style={styles.filterWrap}>
              {profile.allergies.map((allergy) => (
                <View key={allergy.id} style={styles.filterChip}>
                  <Text style={styles.filterText}>{allergy.name}</Text>
                  <Text style={styles.filterClose}>x</Text>
                </View>
              ))}
              <Pressable accessibilityRole="button" onPress={onOpenProfile} style={styles.addFilter}>
                <Plus color={colors.primaryDark} size={14} strokeWidth={2.1} />
                <Text style={styles.addFilterText}>Add Filter</Text>
              </Pressable>
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

        <View style={styles.scanArea}>
          <Pressable accessibilityRole="button" onPress={onStartScan} style={styles.scanCircle}>
            <View style={styles.scanIcon}>
              <ScanLine color={colors.surface} size={32} strokeWidth={1.8} />
            </View>
            <Text style={styles.scanTitle}>Scan Menu</Text>
            <Text style={styles.scanBody}>Analyze ingredients instantly</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onUploadPhoto} style={styles.uploadLink}>
            <Text style={styles.uploadLinkText}>Upload photo instead</Text>
          </Pressable>
        </View>

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Scans</Text>
            <Pressable accessibilityRole="button" onPress={onOpenHistory} style={styles.viewAll}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight color={colors.primaryDark} size={13} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.recentList}>
            {["The Rustic Spoon", "Oasis Cafe", "Trattoria Bella"].map((name, index) => (
              <Pressable key={name} accessibilityRole="button" onPress={onOpenHistory} style={styles.recentItem}>
                <View>
                  <Text style={styles.recentName}>{name}</Text>
                  <Text style={styles.recentDate}>
                    {index === 0 ? "Today, 1:30 PM" : index === 1 ? "Yesterday" : "Oct 12"}
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  {index === 0 ? (
                    <View style={styles.cautionPill}>
                      <Text style={styles.cautionText}>Caution</Text>
                    </View>
                  ) : (
                    <View style={styles.lowDot} />
                  )}
                  <ChevronRight color={colors.inkSubtle} size={18} strokeWidth={2} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
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
    padding: 24,
    paddingBottom: 118,
    paddingTop: 24
  },
  filtersSection: {
    gap: 12,
    paddingBottom: 48
  },
  sectionEyebrow: {
    color: colors.inkSubtle,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 18,
    textTransform: "uppercase"
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 17
  },
  filterText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0
  },
  filterClose: {
    color: colors.inkSubtle,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 18
  },
  addFilter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 16
  },
  addFilterText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0
  },
  scanArea: {
    alignItems: "center",
    paddingBottom: 48,
    paddingTop: 32
  },
  scanCircle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E3E2E1",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 256,
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    width: 256
  },
  scanIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 80,
    justifyContent: "center",
    marginBottom: 16,
    width: 80
  },
  scanTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 32
  },
  scanBody: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26
  },
  uploadLink: {
    marginTop: 20
  },
  uploadLinkText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0
  },
  recentSection: {
    gap: 24
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  recentTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 30
  },
  viewAll: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  viewAllText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0
  },
  recentList: {
    gap: 0
  },
  recentItem: {
    alignItems: "center",
    borderBottomColor: "#E3E2E1",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 81,
    paddingVertical: 16
  },
  recentName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 26
  },
  recentDate: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 18,
    marginTop: 4
  },
  recentRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  cautionPill: {
    backgroundColor: "rgba(255,218,214,0.3)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  cautionText: {
    color: colors.high,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0
  },
  lowDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    width: 8
  }
});
