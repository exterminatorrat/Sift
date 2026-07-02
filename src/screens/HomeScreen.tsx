import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  Menu,
  ScanLine,
  Upload,
  UserRound
} from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { ScanResult } from "../types/scan";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { EmptyState } from "../components/EmptyState";
import { BottomNavBar } from "../components/BottomNavBar";
import { formatDateTime } from "../utils/formatters";
import { getRiskMeta } from "../utils/riskLabels";
import { useI18n } from "../i18n/I18nProvider";
import { AnimatedPressable } from "../components/AnimatedPressable";

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
  const { languageCode, t } = useI18n();
  const hasAllergies = profile.allergies.length > 0;
  const visibleScans = recentScans.slice(0, 3);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t("home.title")}</Text>
          <AnimatedPressable
            accessibilityLabel={t("home.openSettings")}
            accessibilityRole="button"
            onPress={onOpenSettings}
            style={styles.headerButton}
          >
            <Menu color={colors.primaryDark} size={22} strokeWidth={2.1} />
          </AnimatedPressable>
        </View>

        {hasAllergies ? (
          <View style={styles.filtersSection}>
            <Text style={styles.sectionEyebrow}>{t("home.activeFilters")}</Text>
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
            title={t("home.createProfileTitle")}
            body={t("home.createProfileBody")}
            actionLabel={t("home.editProfile")}
            onAction={onOpenProfile}
          />
        )}

        <View style={styles.scanArea}>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={onStartScan}
            scaleTo={0.985}
            style={styles.scanCircle}
          >
            <View style={styles.scanIcon}>
              <ScanLine color={colors.surface} size={32} strokeWidth={1.8} />
            </View>
            <Text style={styles.scanTitle}>{t("home.scanMenu")}</Text>
            <Text style={styles.scanBody}>{t("home.scanBody")}</Text>
          </AnimatedPressable>
          <AnimatedPressable accessibilityRole="button" onPress={onUploadPhoto} style={styles.uploadLink}>
            <Upload color={colors.primaryDark} size={15} strokeWidth={2} />
            <Text style={styles.uploadLinkText}>{t("home.uploadPhoto")}</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t("home.recentScans")}</Text>
            {visibleScans.length > 0 && (
              <Pressable accessibilityRole="button" onPress={onOpenHistory} style={styles.viewAll}>
                <Text style={styles.viewAllText}>{t("home.viewAll")}</Text>
                <ChevronRight color={colors.primaryDark} size={13} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {visibleScans.length > 0 ? (
            <View style={styles.recentList}>
              {visibleScans.map((scan) => {
                const meta = getRiskMeta(scan.scanSummary.overallRisk, t);
                const isLowRisk = scan.scanSummary.overallRisk === "low_risk";

                return (
                  <Pressable
                    key={scan.id}
                    accessibilityRole="button"
                    onPress={() => onOpenScan(scan.id)}
                    style={styles.recentItem}
                  >
                    <View style={styles.recentText}>
                      <Text style={styles.recentName}>{scan.restaurantName ?? t("home.menuScan")}</Text>
                      <Text style={styles.recentDate}>{formatDateTime(scan.createdAt, languageCode)}</Text>
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
            <Text style={styles.emptyRecent}>{t("home.emptyRecent")}</Text>
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
    paddingTop: 18
  },
  pageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24
  },
  pageTitle: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    textAlign: "center"
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderRadius: 999,
    elevation: 2,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 40
  },
  filtersSection: {
    gap: 12,
    paddingBottom: 48
  },
  sectionEyebrow: {
    color: colors.inkSubtle,
    ...typography.label,
    textTransform: "uppercase"
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    flexDirection: "row",
    minHeight: 36,
    paddingHorizontal: 18
  },
  filterText: {
    color: colors.ink,
    ...typography.label
  },
  scanArea: {
    alignItems: "center",
    paddingBottom: 58,
    paddingTop: 42
  },
  scanCircle: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 300,
    justifyContent: "center",
    shadowColor: colors.ink,
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
    ...typography.sectionTitle,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 4
  },
  scanBody: {
    color: colors.inkMuted,
    ...typography.body,
    maxWidth: 220,
    textAlign: "center"
  },
  uploadLink: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 22
  },
  uploadLinkText: {
    color: colors.primaryDark,
    ...typography.label
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
    ...typography.sectionTitle
  },
  viewAll: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  viewAllText: {
    color: colors.primaryDark,
    ...typography.label
  },
  recentList: {
    gap: 0
  },
  recentItem: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
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
    ...typography.bodyLarge
  },
  recentDate: {
    color: colors.inkMuted,
    ...typography.caption,
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
    ...typography.label
  },
  lowDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    width: 8
  },
  emptyRecent: {
    color: colors.inkMuted,
    ...typography.bodySmall
  }
});
