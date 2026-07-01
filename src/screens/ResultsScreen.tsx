import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Image as ImageIcon, Languages, ScanSearch } from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { DishRisk, ScanResult } from "../types/scan";
import { colors } from "../constants/colors";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { RiskCard } from "../components/RiskCard";
import { riskMeta } from "../utils/riskLabels";
import { formatDateTime } from "../utils/formatters";

type ResultsScreenProps = {
  scanResult: ScanResult;
  profile: UserProfile;
  onBack: () => void;
  onOpenDish: (dish: DishRisk) => void;
  onOpenHistory?: () => void;
};

export function ResultsScreen({
  scanResult,
  profile,
  onBack,
  onOpenDish,
  onOpenHistory
}: ResultsScreenProps) {
  const summaryMeta = riskMeta[scanResult.scanSummary.overallRisk];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={2.3} />
        </Pressable>
        <Text style={styles.topTitle}>Sift</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <ScanSearch color={colors.primary} size={30} strokeWidth={1.9} />
          </View>
          <Text style={styles.heroTitle}>Scan Results</Text>
          <Text style={styles.heroSubtitle}>
            {scanResult.restaurantName ?? "Menu scan"} for {profile.name}
          </Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={[styles.badge, { backgroundColor: summaryMeta.background }]}>
              <Text style={[styles.badgeText, { color: summaryMeta.color }]}>
                {summaryMeta.label}
              </Text>
            </View>
            <Text style={styles.date}>{formatDateTime(scanResult.createdAt)}</Text>
          </View>
          <Text style={styles.summaryTitle}>{scanResult.scanSummary.summary}</Text>
          <Text style={styles.limitations}>{scanResult.scanSummary.limitations}</Text>
        </View>

        <View style={styles.qualityRow}>
          <ImageIcon color={colors.primary} size={18} strokeWidth={2.1} />
          <Text style={styles.qualityText}>
            Image readability: {scanResult.imageQuality.readability.replace("_", " ")}
          </Text>
        </View>

        <DisclaimerBanner compact />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dishes found</Text>
          <Text style={styles.sectionMeta}>{scanResult.dishes.length} items</Text>
        </View>

        <View style={styles.cards}>
          {scanResult.dishes.map((dish) => (
            <RiskCard key={dish.id} dish={dish} onPress={() => onOpenDish(dish)} />
          ))}
        </View>

        {scanResult.restaurantMessage && (
          <View style={styles.translationPreview}>
            <View style={styles.translationHeader}>
              <Languages color={colors.primary} size={18} strokeWidth={2.1} />
              <Text style={styles.translationTitle}>Restaurant message</Text>
            </View>
            <Text style={styles.translationBody}>{scanResult.restaurantMessage.english}</Text>
          </View>
        )}

        {onOpenHistory && (
          <Text style={styles.savedNote} onPress={onOpenHistory}>
            Saved to scan history
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: 20
  },
  backButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  topTitle: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0
  },
  topSpacer: {
    width: 40
  },
  content: {
    gap: 22,
    padding: 24,
    paddingTop: 32
  },
  hero: {
    alignItems: "center",
    gap: 10
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    elevation: 2,
    height: 64,
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    width: 64
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 0,
    lineHeight: 40
  },
  heroSubtitle: {
    color: colors.inkSubtle,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 24,
    maxWidth: 280,
    textAlign: "center"
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: 12,
    padding: 20
  },
  summaryTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0
  },
  date: {
    color: colors.inkSubtle,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0
  },
  summaryTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 29
  },
  summaryBody: {
    color: colors.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 22
  },
  limitations: {
    color: colors.inkMuted,
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 19
  },
  qualityRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    padding: 13
  },
  qualityText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "capitalize"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  sectionMeta: {
    color: colors.inkSubtle,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  },
  cards: {
    gap: 16
  },
  translationPreview: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 16
  },
  translationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  translationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0
  },
  translationBody: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21
  },
  savedNote: {
    color: colors.inkSubtle,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
    textTransform: "uppercase"
  }
});
