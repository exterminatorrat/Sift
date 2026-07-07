import React, { useEffect, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Image as ImageIcon, Languages } from "lucide-react-native";
import { DishRisk, ScanResult } from "../types/scan";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { RiskCard } from "../components/RiskCard";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { VoiceButton } from "../components/VoiceButton";
import { getRiskMeta } from "../utils/riskLabels";
import { formatDateTime } from "../utils/formatters";
import { useI18n } from "../i18n/I18nProvider";
import { stopSpeech } from "../services/speechService";

type ResultsScreenProps = {
  scanResult: ScanResult;
  showTranslationTools?: boolean;
  onBack: () => void;
  onOpenDish: (dish: DishRisk) => void;
  onOpenHistory?: () => void;
};

export function ResultsScreen({
  scanResult,
  showTranslationTools = true,
  onBack,
  onOpenDish,
  onOpenHistory
}: ResultsScreenProps) {
  const { languageCode, t } = useI18n();
  const summaryMeta = getRiskMeta(scanResult.scanSummary.overallRisk, t);
  const [photoOpen, setPhotoOpen] = useState(false);
  const hasMenuPhoto = Boolean(scanResult.imageUri);
  const restaurantMessageText =
    scanResult.restaurantMessage?.translated ?? scanResult.restaurantMessage?.english ?? "";
  const userLanguageMessageText =
    scanResult.restaurantMessage?.userLanguageText ?? scanResult.restaurantMessage?.english ?? "";
  const showUserLanguageMessage =
    Boolean(userLanguageMessageText) &&
    userLanguageMessageText.toLowerCase() !== restaurantMessageText.toLowerCase();

  useEffect(() => () => {
    void stopSpeech();
  }, []);

  const handleBack = () => {
    void stopSpeech();
    onBack();
  };

  const handleOpenDish = (dish: DishRisk) => {
    void stopSpeech();
    onOpenDish(dish);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <AnimatedPressable
            accessibilityLabel={t("common.back")}
            accessibilityRole="button"
            onPress={handleBack}
            scaleTo={0.92}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.ink} size={22} strokeWidth={2.2} />
          </AnimatedPressable>
          <Text style={styles.pageTitle}>{t("results.title")}</Text>
          <View style={styles.headerSpacer} />
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
          {hasMenuPhoto && (
            <AnimatedPressable
              accessibilityLabel={t("results.viewPhoto")}
              accessibilityRole="button"
              onPress={() => setPhotoOpen(true)}
              scaleTo={0.94}
              style={styles.photoButton}
            >
              <Text style={styles.photoButtonText}>{t("results.viewPhoto")}</Text>
            </AnimatedPressable>
          )}
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
            <RiskCard key={dish.id} dish={dish} onPress={() => handleOpenDish(dish)} />
          ))}
        </View>

        {showTranslationTools && scanResult.restaurantMessage && (
          <View style={styles.translationPreview}>
            <View style={styles.translationHeader}>
              <Languages color={colors.primary} size={18} strokeWidth={2.1} />
              <Text style={styles.translationTitle}>{t("results.restaurantMessage")}</Text>
            </View>
            <Text style={styles.translationBody}>
              {restaurantMessageText}
            </Text>
            {showUserLanguageMessage && (
              <View style={styles.userLanguageReference}>
                <Text style={styles.userLanguageLabel}>{t("results.userLanguageReference")}</Text>
                <Text style={styles.userLanguageBody}>{userLanguageMessageText}</Text>
              </View>
            )}
            <VoiceButton
              fallbackLanguageCode={languageCode}
              label={t("voice.playMessage")}
              languageHint={scanResult.restaurantMessage.language}
              stopLabel={t("voice.stop")}
              text={restaurantMessageText}
              unavailableLabel={t("voice.unavailable")}
            />
          </View>
        )}

        {onOpenHistory && (
          <Text style={styles.savedNote} onPress={onOpenHistory}>
            {t("results.savedToHistory")}
          </Text>
        )}
      </ScrollView>

      {scanResult.imageUri && (
        <Modal
          animationType="fade"
          onRequestClose={() => setPhotoOpen(false)}
          transparent
          visible={photoOpen}
        >
          <View style={styles.photoOverlay}>
            <View style={styles.photoViewer}>
              <View style={styles.photoHeader}>
                <Text style={styles.photoTitle}>{t("results.menuPhoto")}</Text>
                <AnimatedPressable
                  accessibilityLabel={t("common.close")}
                  accessibilityRole="button"
                  onPress={() => setPhotoOpen(false)}
                  scaleTo={0.92}
                  style={styles.photoCloseButton}
                >
                  <Text style={styles.photoCloseText}>{t("common.close")}</Text>
                </AnimatedPressable>
              </View>
              <Image
                resizeMode="contain"
                source={{ uri: scanResult.imageUri }}
                style={styles.menuPhoto}
              />
            </View>
          </View>
        </Modal>
      )}
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
    gap: 16,
    padding: 24,
    paddingTop: 12
  },
  pageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    width: 44
  },
  pageTitle: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    flex: 1,
    textAlign: "center"
  },
  headerSpacer: {
    height: 44,
    width: 44
  },
  summary: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 9,
    padding: 16
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
    ...typography.badge
  },
  date: {
    color: colors.inkSubtle,
    ...typography.badge
  },
  summaryTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  summaryBody: {
    color: colors.inkMuted,
    ...typography.body
  },
  limitations: {
    color: colors.inkMuted,
    ...typography.caption,
    lineHeight: 19
  },
  qualityRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
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
    ...typography.label,
    textTransform: "capitalize"
  },
  photoButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  photoButtonText: {
    color: colors.primaryDark,
    ...typography.badge
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.badge,
    textTransform: "uppercase"
  },
  sectionMeta: {
    color: colors.inkSubtle,
    ...typography.badge
  },
  cards: {
    gap: 16
  },
  translationPreview: {
    backgroundColor: colors.surfaceWarm,
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
    ...typography.label,
    fontFamily: typography.label.fontFamily,
    fontWeight: "600"
  },
  translationBody: {
    color: colors.inkMuted,
    ...typography.bodySmall
  },
  userLanguageReference: {
    borderTopColor: colors.borderSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 7,
    paddingTop: 10
  },
  userLanguageLabel: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "uppercase"
  },
  userLanguageBody: {
    color: colors.inkMuted,
    ...typography.caption,
    lineHeight: 19
  },
  savedNote: {
    color: colors.inkSubtle,
    ...typography.badge,
    textAlign: "center",
    textTransform: "uppercase"
  },
  photoOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(28, 30, 28, 0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  photoViewer: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "84%",
    overflow: "hidden",
    padding: 12,
    width: "100%"
  },
  photoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10
  },
  photoTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  photoCloseButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  photoCloseText: {
    color: colors.ink,
    ...typography.badge
  },
  menuPhoto: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    height: 520,
    maxHeight: "92%",
    width: "100%"
  }
});
