import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  ScanLine,
  UserRound
} from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { ScanResult } from "../types/scan";
import { colors } from "../constants/colors";
import { EmptyState } from "../components/EmptyState";
import { BottomNavBar } from "../components/BottomNavBar";
import { AppTopBar } from "../components/AppTopBar";
import { formatDateTime } from "../utils/formatters";
import { riskMeta } from "../utils/riskLabels";

type HomeScreenProps = {
  profile: UserProfile;
  recentScans: ScanResult[];
  onOpenProfile: () => void;
  onStartScan: () => void;
  onUploadPhoto: () => void;
  onOpenHistory: () => void;
  onOpenScan: (scanId: string) => void;
  onOpenSettings: () => void;
};

export function HomeScreen({
  profile,
  recentScans,
  onOpenProfile,
  onStartScan,
  onUploadPhoto,
  onOpenHistory,
  onOpenScan,
  onOpenSettings
}: HomeScreenProps) {
  const hasAllergies = profile.allergies.length > 0;
  const visibleScans = recentScans.slice(0, 3);

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
                </View>
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
            {visibleScans.length > 0 && (
              <Pressable accessibilityRole="button" onPress={onOpenHistory} style={styles.viewAll}>
                <Text style={styles.viewAllText}>View All</Text>
                <ChevronRight color={colors.primaryDark} size={13} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {visibleScans.length > 0 ? (
            <View style={styles.recentList}>
              {visibleScans.map((scan) => {
                const meta = riskMeta[scan.scanSummary.overallRisk];
                const isLowRisk = scan.scanSummary.overallRisk === "low_risk";

                return (
                  <Pressable
                    key={scan.id}
                    accessibilityRole="button"
                    onPress={() => onOpenScan(scan.id)}
                    style={styles.recentItem}
                  >
                    <View style={styles.recentText}>
                      <Text style={styles.recentName}>{scan.restaurantName ?? "Menu scan"}</Text>
                      <Text style={styles.recentDate}>{formatDateTime(scan.createdAt)}</Text>
                    </View>
                    <View style={styles.recentRight}>
                      {isLowRisk ? (
                        <View style={[styles.lowDot, { backgroundColor: meta.color }]} />
                      ) : (
                        <View style={[styles.cautionPill, { backgroundColor: meta.background }]}>
                          <Text style={[styles.cautionText, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                        </View>
                      )}
                      <ChevronRight color={colors.inkSubtle} size={18} strokeWidth={2} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyRecent}>Scans you save on this device will appear here.</Text>
          )}
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
    paddingBottom: 132,
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
    minHeight: 36,
    paddingHorizontal: 18
  },
  filterText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0
  },
  scanArea: {
    alignItems: "center",
    paddingBottom: 58,
    paddingTop: 42
  },
  scanCircle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E3E2E1",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 300,
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    width: 300
  },
  scanIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 88,
    justifyContent: "center",
    marginBottom: 22,
    width: 88
  },
  scanTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 32,
    marginBottom: 4
  },
  scanBody: {
    color: colors.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 24,
    maxWidth: 220,
    textAlign: "center"
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
  recentText: {
    flex: 1,
    paddingRight: 12
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
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  cautionText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0
  },
  lowDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    width: 8
  },
  emptyRecent: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 22
  }
});
