import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Image as ImageIcon, Languages } from "lucide-react-native";
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
};

export function ResultsScreen({ scanResult, profile, onBack, onOpenDish }: ResultsScreenProps) {
  const summaryMeta = riskMeta[scanResult.scanSummary.overallRisk];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.primary} size={22} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.kicker}>Scan results</Text>
          <Text style={styles.topTitle}>{scanResult.restaurantName ?? "Menu scan"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={[styles.badge, { backgroundColor: summaryMeta.background }]}>
              <Text style={[styles.badgeText, { color: summaryMeta.color }]}>
                {summaryMeta.label}
              </Text>
            </View>
            <Text style={styles.date}>{formatDateTime(scanResult.createdAt)}</Text>
          </View>
          <Text style={styles.summaryTitle}>Menu review for {profile.name}</Text>
          <Text style={styles.summaryBody}>{scanResult.scanSummary.summary}</Text>
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  topText: {
    flex: 1,
    gap: 2
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  topTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0
  },
  content: {
    gap: 18,
    padding: 24,
    paddingTop: 8
  },
  summary: {
    gap: 12,
    paddingBottom: 6
  },
  summaryTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  badge: {
    borderRadius: 8,
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
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 33
  },
  summaryBody: {
    color: colors.ink,
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
    borderRadius: 8,
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
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0
  },
  sectionMeta: {
    color: colors.inkSubtle,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  },
  cards: {
    gap: 12
  },
  translationPreview: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
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
  }
});
