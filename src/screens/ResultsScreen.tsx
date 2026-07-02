import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ImageIcon, Languages, ScanSearch } from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { DishRisk, ScanResult } from "../types/scan";
import { colors } from "../constants/colors";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { RiskCard } from "../components/RiskCard";
import { getRiskMeta } from "../utils/riskLabels";
import { formatDateTime } from "../utils/formatters";
import { AppTopBar } from "../components/AppTopBar";
import { useI18n } from "../i18n/I18nProvider";

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
  const { languageCode, t } = useI18n();
  const summaryMeta = getRiskMeta(scanResult.scanSummary.overallRisk, t);

  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar title={t("results.title")} showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <ScanSearch color={colors.primary} size={30} strokeWidth={1.9} />
          </View>
          <Text style={styles.heroSubtitle}>
            {t("results.heroSubtitle", {
              profileName: profile.name,
              restaurantName: scanResult.restaurantName ?? t("home.menuScan")
            })}
          </Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={[styles.badge, { backgroundColor: summaryMeta.background }]}>
              <Text style={[styles.badgeText, { color: summaryMeta.color }]}>
                {summaryMeta.label}
              </Text>
            </View>
            <Text style={styles.date}>{formatDateTime(scanResult.createdAt, languageCode)}</Text>
          </View>
          <Text style={styles.summaryTitle}>{scanResult.scanSummary.summary}</Text>
          <Text style={styles.limitations}>{scanResult.scanSummary.limitations}</Text>
        </View>

        <View style={styles.qualityRow}>
          <ImageIcon color={colors.primary} size={18} strokeWidth={2.1} />
          <Text style={styles.qualityText}>
            {t("results.imageReadability", {
              readability: t(readabilityLabelKey(scanResult.imageQuality.readability))
            })}
          </Text>
        </View>

        <DisclaimerBanner compact />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("results.dishesFound")}</Text>
          <Text style={styles.sectionMeta}>
            {t("common.itemsCount", { count: scanResult.dishes.length })}
          </Text>
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
              <Text style={styles.translationTitle}>{t("results.restaurantMessage")}</Text>
            </View>
            <Text style={styles.translationBody}>{scanResult.restaurantMessage.english}</Text>
          </View>
        )}

        {onOpenHistory && (
          <Text style={styles.savedNote} onPress={onOpenHistory}>
            {t("results.savedToHistory")}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function readabilityLabelKey(readability: ScanResult["imageQuality"]["readability"]) {
  if (readability === "clear") {
    return "results.readability.clear" as const;
  }
  if (readability === "partially_clear") {
    return "results.readability.partiallyClear" as const;
  }
  return "results.readability.poor" as const;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
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
